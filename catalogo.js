const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../middleware');

router.get('/', wrap(async (req, res) => {
  const [areas, competencias] = await Promise.all([
    db.query('SELECT id, nombre, icono FROM areas_curriculares ORDER BY id'),
    db.query('SELECT id, nombre FROM competencias_fundamentales ORDER BY id'),
  ]);
  res.json({
    areas: areas.rows,
    competencias: competencias.rows,
    niveles: ['Inicial', 'Primario', 'Secundario'],
    grados: ['1ro', '2do', '3ro', '4to', '5to', '6to'],
    periodos: ['1er Período', '2do Período', '3er Período', '4to Período'],
  });
}));

module.exports = router;
