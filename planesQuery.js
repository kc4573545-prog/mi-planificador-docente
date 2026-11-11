const db = require('./db');

// Un plan es visible si es mío, es una plantilla, o lo compartió un colega de mi mismo centro.
// Requiere: FROM planes p JOIN usuarios u ON u.id = p.usuario_id, y $1 = id del usuario.
const VISIBLE = `(p.usuario_id = $1 OR p.es_plantilla OR
  (p.compartido AND u.centro IS NOT NULL AND u.centro = (SELECT centro FROM usuarios WHERE id = $1)))`;

const COLS = `p.id, p.titulo, p.area, p.nivel, p.grado, p.seccion, p.periodo, p.fecha_aplicacion,
  p.duracion_min, p.estado, p.compartido, p.es_plantilla, p.actualizado_en,
  (p.usuario_id = $1) AS propio, u.nombre AS autor,
  p.datos->>'resumen' AS resumen,
  CASE WHEN jsonb_typeof(p.datos->'indicadores') = 'array' THEN jsonb_array_length(p.datos->'indicadores') ELSE 0 END AS n_indicadores,
  EXISTS (SELECT 1 FROM favoritos f WHERE f.plan_id = p.id AND f.usuario_id = $1) AS favorito`;

async function listar(userId, { scope = 'mis', area, nivel, grado, periodo, estado, q, orden } = {}) {
  const params = [userId];
  const w = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  if (scope === 'mis') w.push('p.usuario_id = $1');
  else if (scope === 'compartidos') {
    w.push(`p.compartido AND p.usuario_id <> $1 AND u.centro IS NOT NULL
            AND u.centro = (SELECT centro FROM usuarios WHERE id = $1)`);
  } else if (scope === 'modelos') w.push('p.es_plantilla');
  else if (scope === 'favoritos') {
    w.push(`${VISIBLE} AND EXISTS (SELECT 1 FROM favoritos f2 WHERE f2.plan_id = p.id AND f2.usuario_id = $1)`);
  }

  if (area) w.push(`p.area = ${add(area)}`);
  if (nivel) w.push(`p.nivel = ${add(nivel)}`);
  if (grado) w.push(`p.grado = ${add(grado)}`);
  if (periodo) w.push(`p.periodo = ${add(periodo)}`);
  if (estado === 'compartido') w.push('p.compartido');
  else if (estado) w.push(`p.estado = ${add(estado)}`);
  if (q) {
    const t = add('%' + String(q).slice(0, 100).replace(/[\\%_]/g, '\\$&') + '%');
    w.push(`(p.titulo ILIKE ${t} OR p.area ILIKE ${t} OR p.datos::text ILIKE ${t})`);
  }

  const order = orden === 'titulo' ? 'p.titulo ASC' : 'p.actualizado_en DESC';
  const sql = `SELECT ${COLS} FROM planes p JOIN usuarios u ON u.id = p.usuario_id
               WHERE ${w.join(' AND ') || 'TRUE'} ORDER BY ${order} LIMIT 200`;
  return (await db.query(sql, params)).rows;
}

module.exports = { VISIBLE, listar };
