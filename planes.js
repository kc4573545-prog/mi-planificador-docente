const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { wrap, validar, HttpError } = require('../middleware');
const { VISIBLE, listar } = require('../planesQuery');

const largo = (n) => z.string().max(n);
const datosSchema = z.object({
  competencias_fundamentales: z.array(largo(120)).max(20).optional(),
  competencia_especifica: largo(2000).optional(),
  eje_transversal: largo(500).optional(),
  indicadores: z.array(z.object({ texto: largo(1000), codigo: largo(40).optional().default('') })).max(40).optional(),
  contenidos: z.object({
    conceptuales: largo(4000).optional(), procedimentales: largo(4000).optional(), actitudinales: largo(4000).optional(),
  }).optional(),
  secuencia: z.array(z.object({
    momento: largo(40), minutos: z.number().int().min(0).max(600),
    ensenanza: largo(4000).optional().default(''), aprendizaje: largo(4000).optional().default(''),
    recursos: largo(4000).optional().default(''),
  })).max(10).optional(),
  recursos: largo(4000).optional(),
  evaluacion: z.array(largo(500)).max(30).optional(),
  resumen: largo(500).optional(),
});
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato AAAA-MM-DD');
const opt = (n) => z.string().trim().max(n).nullable().optional();
const planSchema = z.object({
  titulo: z.string().trim().min(3).max(200), area: z.string().trim().min(1).max(100),
  nivel: opt(30), grado: opt(20), seccion: opt(10), periodo: opt(40),
  fecha_aplicacion: fecha.nullable().optional(),
  duracion_min: z.number().int().min(5).max(600).nullable().optional(),
  estado: z.enum(['borrador', 'completo']).optional(),
  datos: datosSchema.optional(),
});
const CAMPOS = ['titulo', 'area', 'nivel', 'grado', 'seccion', 'periodo', 'fecha_aplicacion', 'duracion_min', 'estado'];

router.get('/', wrap(async (req, res) => {
  const { area, nivel, grado, periodo, estado, q, orden } = req.query;
  res.json(await listar(req.userId, { scope: 'mis', area, nivel, grado, periodo, estado, q, orden }));
}));

router.get('/resumen', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE estado = 'completo')::int AS completos,
            count(*) FILTER (WHERE estado = 'borrador')::int AS borradores,
            count(*) FILTER (WHERE compartido)::int AS compartidos
     FROM planes WHERE usuario_id = $1`, [req.userId]);
  res.json(rows[0]);
}));

router.get('/:id', wrap(async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.*, (p.usuario_id = $1) AS propio, u.nombre AS autor_nombre, u.centro AS autor_centro,
            u.distrito AS autor_distrito, u.regional AS autor_regional, u.tanda AS autor_tanda
     FROM planes p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $2 AND ${VISIBLE}`,
    [req.userId, req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Plan no encontrado');
  res.json(rows[0]);
}));

router.post('/', wrap(async (req, res) => {
  const p = validar(planSchema, req.body);
  const { rows } = await db.query(
    `INSERT INTO planes (usuario_id, titulo, area, nivel, grado, seccion, periodo, fecha_aplicacion, duracion_min, estado, datos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'borrador'),$11) RETURNING *`,
    [req.userId, p.titulo, p.area, p.nivel ?? null, p.grado ?? null, p.seccion ?? null, p.periodo ?? null,
     p.fecha_aplicacion ?? null, p.duracion_min ?? null, p.estado ?? null, JSON.stringify(p.datos || {})]);
  res.status(201).json(rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const p = validar(planSchema.partial(), req.body);
  const sets = []; const vals = [req.params.id, req.userId];
  for (const c of CAMPOS) if (p[c] !== undefined) { vals.push(p[c]); sets.push(`${c} = $${vals.length}`); }
  if (p.datos !== undefined) { vals.push(JSON.stringify(p.datos)); sets.push(`datos = $${vals.length}`); }
  if (!sets.length) throw new HttpError(400, 'Nada que actualizar');
  const { rows } = await db.query(
    `UPDATE planes SET ${sets.join(', ')}, actualizado_en = now() WHERE id = $1 AND usuario_id = $2 RETURNING *`, vals);
  if (!rows[0]) throw new HttpError(404, 'Plan no encontrado');
  res.json(rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM planes WHERE id = $1 AND usuario_id = $2', [req.params.id, req.userId]);
  if (!r.rowCount) throw new HttpError(404, 'Plan no encontrado');
  res.status(204).end();
}));

router.put('/:id/compartir', wrap(async (req, res) => {
  const { compartido } = validar(z.object({ compartido: z.boolean() }), req.body);
  if (compartido) {
    const c = await db.query('SELECT centro FROM usuarios WHERE id = $1', [req.userId]);
    if (!c.rows[0]?.centro) throw new HttpError(400, 'Registra tu centro educativo en Ajustes para compartir con tus colegas');
  }
  const { rows } = await db.query(
    `UPDATE planes SET compartido = $3 WHERE id = $1 AND usuario_id = $2
       AND ($3 = false OR estado = 'completo') RETURNING id, compartido`, [req.params.id, req.userId, compartido]);
  if (!rows[0]) throw new HttpError(400, 'Solo puedes compartir planes propios marcados como completos');
  res.json(rows[0]);
}));

router.post('/:id/duplicar', wrap(async (req, res) => {
  const d = validar(z.object({
    secciones: z.array(z.string().trim().min(1).max(10)).max(20).optional(),
    fecha_inicio: fecha.optional(),
  }), req.body || {});
  const o = (await db.query(
    `SELECT p.* FROM planes p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $2 AND ${VISIBLE}`,
    [req.userId, req.params.id])).rows[0];
  if (!o) throw new HttpError(404, 'Plan no encontrado');
  const destinos = d.secciones?.length ? d.secciones : [o.seccion];
  const copias = await db.tx(async (c) => {
    const out = [];
    for (const sec of destinos) {
      const r = await c.query(
        `INSERT INTO planes (usuario_id, titulo, area, nivel, grado, seccion, periodo, fecha_aplicacion, duracion_min,
                             estado, datos, plantilla_origen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'borrador',$10,$11) RETURNING id, titulo, seccion`,
        [req.userId, o.titulo, o.area, o.nivel, o.grado, sec, o.periodo, d.fecha_inicio ?? o.fecha_aplicacion,
         o.duracion_min, o.datos, o.id]);
      out.push(r.rows[0]);
    }
    return out;
  });
  res.status(201).json(copias);
}));

module.exports = router;
