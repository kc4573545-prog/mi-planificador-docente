CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  matricula     TEXT,
  centro        TEXT,
  distrito      TEXT,
  regional      TEXT,
  tanda         TEXT,
  ajustes       JSONB NOT NULL DEFAULT '{"auto_competencias":true,"sugerir_indicadores":false,"formato_estandar":true,"plantilla_impresion":"minerd-2024"}',
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_uq ON usuarios (lower(email));

CREATE TABLE IF NOT EXISTS areas_curriculares (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  icono  TEXT NOT NULL DEFAULT 'menu_book'
);

CREATE TABLE IF NOT EXISTS competencias_fundamentales (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS docente_areas (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  area_id    INT  NOT NULL REFERENCES areas_curriculares(id) ON DELETE CASCADE,
  activa     BOOLEAN NOT NULL DEFAULT true,
  principal  BOOLEAN NOT NULL DEFAULT false,
  grados     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (usuario_id, area_id)
);

CREATE TABLE IF NOT EXISTS secciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nivel       TEXT NOT NULL,
  grado       TEXT NOT NULL,
  seccion     TEXT NOT NULL,
  tanda       TEXT,
  estudiantes INT CHECK (estudiantes IS NULL OR estudiantes >= 0),
  areas       TEXT NOT NULL DEFAULT '',
  UNIQUE (usuario_id, nivel, grado, seccion)
);

CREATE TABLE IF NOT EXISTS planes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  area             TEXT NOT NULL,
  nivel            TEXT,
  grado            TEXT,
  seccion          TEXT,
  periodo          TEXT,
  fecha_aplicacion DATE,
  duracion_min     INT CHECK (duracion_min IS NULL OR duracion_min > 0),
  estado           TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','completo')),
  compartido       BOOLEAN NOT NULL DEFAULT false,
  es_plantilla     BOOLEAN NOT NULL DEFAULT false,
  plantilla_origen UUID REFERENCES planes(id) ON DELETE SET NULL,
  datos            JSONB NOT NULL DEFAULT '{}',
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS planes_usuario_idx ON planes (usuario_id, actualizado_en DESC);
CREATE INDEX IF NOT EXISTS planes_compartido_idx ON planes (compartido) WHERE compartido;

CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plan_id    UUID NOT NULL REFERENCES planes(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, plan_id)
);
