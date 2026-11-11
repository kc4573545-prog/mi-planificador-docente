const router = require('express').Router();
const db = require('../db');
const { wrap, HttpError } = require('../middleware');
const { VISIBLE, listar } = require('../planesQuery');

const SCOPES = ['mis', 'compartidos', 'modelos', 'favoritos'];

router.get('/', wrap(async (req, res) => {
  const { tab = 'mis', q, area, nivel } = req.query;
  if (!SCOPES.includes(tab)) throw new HttpError(400, 'Pestaña inválida');
  res.json(await listar(req.userId, { scope: tab, q, area, nivel }));
}));

router.get('/conteos', wrap(async (req, res) => {
  const out = {};
  await Promise.all(SCOPES.map(async (s) => { out[s] = (await listar(req.userId, { scope: s })).length; }));
  res.json(out);
}));

router.post('/favoritos/:planId', wrap(async (req, res) => {
  const r = await db.query(
    `INSERT INTO favoritos (usuario_id, plan_id)
     SELECT $1::uuid, p.id FROM planes p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = $2 AND ${VISIBLE}
     ON CONFLICT DO NOTHING RETURNING plan_id`, [req.userId, req.params.planId]);
  if (!r.rowCount) {
    const ya = await db.query('SELECT 1 FROM favoritos WHERE usuario_id = $1 AND plan_id = $2', [req.userId, req.params.planId]);
    if (!ya.rowCount) throw new HttpError(404, 'Plan no encontrado');
  }
  res.status(201).json({ favorito: true });
}));

router.delete('/favoritos/:planId', wrap(async (req, res) => {
  await db.query('DELETE FROM favoritos WHERE usuario_id = $1 AND plan_id = $2', [req.userId, req.params.planId]);
  res.json({ favorito: false });
}));

module.exports = router;
