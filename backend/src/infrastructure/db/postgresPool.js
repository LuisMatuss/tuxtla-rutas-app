// Adaptador de Infraestructura: Pool de conexiones a PostgreSQL / PostGIS
// Regla DevSecOps: Cero contraseñas hardcodeadas. Lectura estricta de variables de entorno con dotenv/config

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'tuxtla_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'tuxtla_rutas_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Eventos de monitoreo y diagnóstico del pool
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Error inesperado en cliente inactivo', err);
});
