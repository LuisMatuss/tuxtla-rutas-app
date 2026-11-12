// Adaptador de Infraestructura: Pool de conexiones a PostgreSQL / PostGIS (tuxtla_rutas_db)
// Carga determinista de variables desde backend/.env y raíz .env con usuario postgres por defecto.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar backend/.env y raíz .env garantizando precedencia sobre variables de sesión previas
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), override: false });
dotenv.config();

const { Pool } = pg;

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Admin123',
  database: process.env.DB_NAME || 'tuxtla_rutas_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
};

export const pool = new Pool(dbConfig);

// Eventos de monitoreo del pool
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]: Error inesperado en cliente inactivo', err.message);
});

/**
 * Confirma en consola el estado activo del pool de PostgreSQL configurado en tuxtla_rutas_db
 */
export async function verifyDatabasePool() {
  try {
    const res = await pool.query('SELECT current_database() AS db, current_user AS usr;');
    const row = res.rows[0] || {};
    console.log(
      `[PostgreSQL Pool] Conexión activa al pool de PostgreSQL en ${row.db || dbConfig.database} (${dbConfig.host}:${dbConfig.port} • usuario: ${row.usr || dbConfig.user})`
    );
  } catch (err) {
    console.error('[PostgreSQL Pool Error]:', err.message);
  }
  return dbConfig;
}
