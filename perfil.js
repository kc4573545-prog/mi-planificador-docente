const router = require('express').Router();
const { z } = require('zod');
const db = require('../db');
const { wrap, validar, HttpError } = require('../middleware');

const txt = (n) => z.string().trim().max(n).nullable().optional();

router.get('/', wrap(async (req, res) => {
  const uid = req.userId;
  const [u, areas, secciones] = await Promise.all([
    db.query('SELECT id, email, nombre, matricula, centro, distrito, regional, tanda, ajustes FROM usuarios WHERE id = $1', [uid]),
    db.query(`SELECT a.id, a.nombre, a.icono, COALESCE(da.activa, false) AS activa,
                     COALESCE(da.principal, false) AS principal, COALESCE(da.grados, '') AS grados
              FROM areas_curriculares a
              LEFT JOIN docente_areas da ON da.area_id = a.id AND da.usuario_id = $1 ORDER BY a.id`, [uid]),
    db.query('SELECT id, nivel, grado, seccion, tanda, estudiantes, areas FROM secciones WHERE usuario_id = $1 ORDER BY nivel, grado, seccion', [uid]),
  ]);
  if (!u.rows[0]) throw new HttpError(404, 'Usuario no encontrado');
  res.json({ ...u.rows[0], areas: areas.rows, secciones: secciones.rows });
}));

router.put('/', wrap(async (req, res) => {
  const d = validar(z.object({
    nombre: z.string().trim().min(2).max(120).optional(),
    matricula: txt(40), centro: txt(200), distrito: txt(120), regional: txt(60), tanda: txt(40),
    ajustes: z.object({
      auto_competencias: z.boolean().optional(),
      sugerir_indicadores: z.boolean().optional(),
      formato_estandar: z.boolean().optional(),
      plantilla_impresion: z.enum(['minerd-2024', 'minerd-tecnica', 'secuencia-diaria']).optional(),
    }).optional(),
  }), req.body);
  const { rows } = await db.query(
    `UPDATE usuarios SET nombre = COALESCE($2, nombre), matricula = COALESCE($3, matricula),
       centro = COALESCE($4, centro), distrito = COALESCE($5, distrito), regional = COALESCE($6, regional),
       tanda = COALESCE($7, tanda), ajustes = ajustes || $8::jsonb
     WHERE id = $1 RETURNING id, email, nombre, matricula, centro, distrito, regional, tanda, ajustes`,
    [req.userId, d.nombre ?? null, d.matricula ?? null, d.centro ?? null, d.distrito ?? null,
     d.regional ?? null, d.tanda ?? null, JSON.stringify(d.ajustes || {})]);
  res.json(rows[0]);
}));

router.put('/areas', wrap(async (req, res) => {
  const items = validar(z.array(z.object({
    area_id: z.number().int(), activa: z.boolean(), principal: z.boolean().optional().default(false),
    grados: z.string().trim().max(120).optional().default(''),
  })).max(50), req.body);
  await db.tx(async (c) => {
    for (const a of items) {
      await c.query(
        `INSERT INTO docente_areas (usuario_id, area_id, activa, principal, grados) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (usuario_id, area_id) DO UPDATE SET activa = $3, principal = $4, grados = $5`,
        [req.userId, a.area_id, a.activa, a.principal, a.grados]);
    }
  });
  res.json({ ok: true });
}));

const seccionSchema = z.object({
  nivel: z.string().trim().min(1).max(30), grado: z.string().trim().min(1).max(20),
  seccion: z.string().trim().min(1).max(10), tanda: txt(40),
  estudiantes: z.number().int().min(0).max(200).nullable().optional(),
  areas: z.string().trim().max(200).optional().default(''),
});

router.post('/secciones', wrap(async (req, res) => {
  const s = validar(seccionSchema, req.body);
  try {
    const { rows } = await db.query(
      `INSERT INTO secciones (usuario_id, nivel, grado, seccion, tanda, estudiantes, areas)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.userId, s.nivel, s.grado, s.seccion, s.tanda ?? null, s.estudiantes ?? null, s.areas]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Esa sección ya está registrada');
    throw e;
  }
}));

router.delete('/secciones/:id', wrap(async (req, res) => {
  const r = await db.query('DELETE FROM secciones WHERE id = $1 AND usuario_id = $2', [req.params.id, req.userId]);
  if (!r.rowCount) throw new HttpError(404, 'Sección no encontrada');
  res.status(204).end();
}));

module.exports = router;
