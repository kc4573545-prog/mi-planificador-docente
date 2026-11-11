INSERT INTO areas_curriculares (nombre, icono) VALUES
  ('Lengua Española','auto_stories'),
  ('Matemática','calculate'),
  ('Ciencias Sociales','public'),
  ('Ciencias de la Naturaleza','biotech'),
  ('Educación Artística','palette'),
  ('Formación Integral Humana y Religiosa','diversity_1'),
  ('Educación Física','sports_soccer'),
  ('Lenguas Extranjeras (Inglés)','translate'),
  ('Lenguas Extranjeras (Francés)','translate'),
  ('Módulos Formativos (Técnico-Profesional)','construction')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO competencias_fundamentales (nombre) VALUES
  ('Ética y Ciudadana'),
  ('Comunicativa'),
  ('Pensamiento Lógico, Creativo y Crítico'),
  ('Resolución de Problemas'),
  ('Científica y Tecnológica'),
  ('Ambiental y de la Salud'),
  ('Desarrollo Personal y Espiritual')
ON CONFLICT (nombre) DO NOTHING;
