const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db');
const { wrap, auth, validar, HttpError } = require('../middleware');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos.' } });
const firmar = (id) => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/registro', limiter, wrap(async (req, res) => {
  const d = validar(z.object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    password: z.string().min(8, 'mínimo 8 caracteres').max(100),
  }), req.body);
  try {
    const hash = await bcrypt.hash(d.password, 10);
    const { rows } = await db.query(
      'INSERT INTO usuarios (email, password_hash, nombre) VALUES (lower($1), $2, $3) RETURNING id, email, nombre',
      [d.email, hash, d.nombre]);
    res.status(201).json({ token: firmar(rows[0].id), usuario: rows[0] });
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Ya existe una cuenta con ese correo');
    throw e;
  }
}));

router.post('/login', limiter, wrap(async (req, res) => {
  const d = validar(z.object({ email: z.string().trim().max(200), password: z.string().max(100) }), req.body);
  const { rows } = await db.query('SELECT id, email, nombre, password_hash FROM usuarios WHERE lower(email) = lower($1)', [d.email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(d.password, u.password_hash))) throw new HttpError(401, 'Correo o contraseña incorrectos');
  res.json({ token: firmar(u.id), usuario: { id: u.id, email: u.email, nombre: u.nombre } });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const { rows } = await db.query('SELECT id, email, nombre FROM usuarios WHERE id = $1', [req.userId]);
  if (!rows[0]) throw new HttpError(401, 'Usuario no encontrado');
  res.json(rows[0]);
}));

module.exports = router;
