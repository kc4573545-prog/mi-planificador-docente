# Mi planificador docente

Aplicación para que docentes dominicanos (de cualquier área curricular y nivel) diseñen y organicen planes de clase alineados al currículo del MINERD, los reutilicen desde una biblioteca y los impriman en un formato de planificación.

**Stack:** Node.js 20+ · Express · PostgreSQL · frontend estático (HTML + Tailwind por CDN) servido por el mismo Express. Diseño exportado de Stitch.

## Estructura

```
db/schema.sql, db/seed.sql   Tablas y catálogo (áreas curriculares, 7 competencias fundamentales)
scripts/migrate.js           Aplica schema + seed (idempotente)
src/                         API Express (auth JWT, perfil, planes, biblioteca, catálogo)
public/                      Frontend: login, planes, nuevo-plan, biblioteca, imprimir, ajustes
render.yaml                  Blueprint de Render (web service + PostgreSQL)
```

## Desarrollo local

```bash
cp .env.example .env        # edita DATABASE_URL y JWT_SECRET
npm install
npm run migrate
npm run dev                 # http://localhost:3000
```

## API (prefijo `/api`, JWT en `Authorization: Bearer …`)

| Método y ruta | Descripción |
|---|---|
| `POST /auth/registro`, `POST /auth/login`, `GET /auth/me` | Cuenta y sesión |
| `GET /catalogo` | Áreas, competencias fundamentales, niveles, grados, períodos |
| `GET/PUT /perfil`, `PUT /perfil/areas` | Perfil, ajustes y áreas del docente |
| `POST /perfil/secciones`, `DELETE /perfil/secciones/:id` | Grados y secciones |
| `GET /planes` (filtros: `area, nivel, grado, periodo, estado, q, orden`), `GET /planes/resumen` | Mis planes y métricas |
| `POST /planes`, `GET/PUT/DELETE /planes/:id` | CRUD de planes |
| `PUT /planes/:id/compartir` | Compartir con colegas del mismo centro (solo planes completos) |
| `POST /planes/:id/duplicar` | Duplicar/adaptar a una o varias secciones |
| `GET /biblioteca?tab=mis\|compartidos\|modelos\|favoritos`, `GET /biblioteca/conteos` | Biblioteca |
| `POST/DELETE /biblioteca/favoritos/:planId` | Favoritos |
| `GET /healthz` | Estado del servicio y la base de datos |

## Despliegue en Render

1. En Render: **New → Blueprint** y selecciona este repositorio. Render lee `render.yaml` y crea la base de datos `planificador-db` y el servicio `mi-planificador-docente`.
2. `JWT_SECRET` se genera automáticamente y `DATABASE_URL` se enlaza a la base de datos.
3. Cada despliegue ejecuta `npm run migrate` antes de arrancar (es idempotente).
4. Verifica `https://<tu-servicio>.onrender.com/healthz`.

Notas: el plan gratuito de PostgreSQL de Render expira a los 30 días y el servicio gratuito se duerme tras inactividad; cambia el `plan` en `render.yaml` para producción.

## Pendiente / decisiones

- Los códigos de competencias específicas e indicadores de logro los escribe el docente: la app no incluye aún el catálogo oficial del MINERD, ni validación contra él ni integración con SIGERD.
- Tailwind se carga por CDN y la CSP de Helmet está desactivada por ello; para producción conviene compilar Tailwind y activar la CSP.
- Sin recuperación de contraseña ni verificación de correo.
