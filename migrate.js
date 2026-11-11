require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

(async () => {
  try {
    for (const f of ['schema.sql', 'seed.sql']) {
      await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8'));
      console.log(`✔ ${f} aplicado`);
    }
  } catch (e) {
    console.error('Error en migración:', e.message);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
})();
