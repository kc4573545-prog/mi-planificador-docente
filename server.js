require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { auth, errorHandler } = require('./middleware');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Falta JWT_SECRET (mínimo 16 caracteres). Revisa tu .env o las variables de Render.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Render está detrás de un proxy
// CSP desactivada mientras el frontend use el CDN de Tailwind y scripts en línea.
// Actívala tras compilar Tailwind a un CSS propio.
app.use(helmet({ contentSecurityPolicy: false }));
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', async (req, res) => {
  try { await db.query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/catalogo', auth, require('./routes/catalogo'));
app.use('/api/perfil', auth, require('./routes/perfil'));
app.use('/api/planes', auth, require('./routes/planes'));
app.use('/api/biblioteca', auth, require('./routes/biblioteca'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.get('/', (req, res) => res.redirect('/planes.html'));

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Mi planificador docente escuchando en :${port}`));
