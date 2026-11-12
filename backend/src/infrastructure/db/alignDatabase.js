// Script de Alineación Total y Población de la Base de Datos PostgreSQL (tuxtla_rutas_db)
// Ajusta/recrea las tablas routes, stops, incidents, users y telemetry_logs con columnas 100% alineadas
// a PostgresRouteRepository.js e inserta las 12 rutas oficiales de Tuxtla Gutiérrez (r-001 a r-012) y sus paradas.

import pg from 'pg';
import { dbConfig } from './postgresPool.js';
import { TUXTLA_ROUTES_SEED } from './tuxtlaRoutesSeed.js';

const { Client } = pg;

export async function alignAndSeedDatabase() {
  const baseConfig = {
    host: dbConfig.host || 'localhost',
    port: Number(dbConfig.port) || 5432,
    user: dbConfig.user || 'postgres',
    password: dbConfig.password || 'Admin123'
  };
  const targetDb = dbConfig.database || 'tuxtla_rutas_db';

  let client = new Client({
    ...baseConfig,
    database: targetDb
  });

  try {
    await client.connect();
  } catch (connErr) {
    if (connErr.code === '3D000') {
      const adminClient = new Client({ ...baseConfig, database: 'postgres' });
      await adminClient.connect();
      await adminClient.query(`CREATE DATABASE ${targetDb};`);
      await adminClient.end();
      client = new Client({ ...baseConfig, database: targetDb });
      await client.connect();
    } else {
      throw connErr;
    }
  }

  console.log(
    `[DB Align] Conectado exitosamente a PostgreSQL -> ${targetDb} (${baseConfig.host}:${baseConfig.port} como ${baseConfig.user})`
  );

  try {
    await client.query('BEGIN');

    // Recrear tablas garantizando 100% compatibilidad de columnas con PostgresRouteRepository.js
    await client.query(`
      DROP TABLE IF EXISTS telemetry_logs CASCADE;
      DROP TABLE IF EXISTS incidents CASCADE;
      DROP TABLE IF EXISTS stops CASCADE;
      DROP TABLE IF EXISTS routes CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      CREATE TABLE routes (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        color VARCHAR(16) NOT NULL DEFAULT '#2563EB',
        geometry JSONB NOT NULL,
        first_run VARCHAR(10) NOT NULL DEFAULT '05:30',
        last_run VARCHAR(10) NOT NULL DEFAULT '22:30',
        frequency_minutes INTEGER NOT NULL DEFAULT 6,
        status VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE stops (
        id VARCHAR(64) PRIMARY KEY,
        route_id VARCHAR(64) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        stop_order INTEGER NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        geometry JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
      );

      CREATE INDEX idx_stops_route_id ON stops (route_id);
      CREATE INDEX idx_stops_coords ON stops (lat, lng);

      CREATE TABLE incidents (
        id VARCHAR(64) PRIMARY KEY,
        type VARCHAR(64) NOT NULL DEFAULT 'TRAFFIC',
        icon VARCHAR(16) NOT NULL DEFAULT '⚠️',
        title VARCHAR(200) NOT NULL,
        description TEXT,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        location_name VARCHAR(200),
        route_id VARCHAR(64) REFERENCES routes(id) ON DELETE SET NULL,
        route_name VARCHAR(150),
        route_color VARCHAR(16),
        delay_minutes INTEGER NOT NULL DEFAULT 10,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE_ALERT',
        reported_by VARCHAR(100) NOT NULL DEFAULT 'Soporte Vial',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'USER',
        favorite_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
        personal_points JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE telemetry_logs (
        id BIGSERIAL PRIMARY KEY,
        unit_id VARCHAR(64) NOT NULL,
        route_id VARCHAR(64) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        direction_type VARCHAR(16) NOT NULL DEFAULT 'IDA',
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        speed_kmh NUMERIC(5,2) NOT NULL DEFAULT 30.0,
        status VARCHAR(32) NOT NULL DEFAULT 'IN_TRANSIT',
        current_stop_name VARCHAR(150),
        next_stop_name VARCHAR(150),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let totalStopsInserted = 0;

    for (let idx = 0; idx < TUXTLA_ROUTES_SEED.length; idx++) {
      const seed = TUXTLA_ROUTES_SEED[idx];
      const routeId = `r-${String(idx + 1).padStart(3, '0')}`;

      await client.query(
        `
          INSERT INTO routes (
            id,
            name,
            description,
            color,
            geometry,
            first_run,
            last_run,
            frequency_minutes,
            status
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9);
        `,
        [
          routeId,
          seed.name,
          seed.description || '',
          seed.color || '#2563EB',
          JSON.stringify(seed.geometry || { type: 'LineString', coordinates: [] }),
          seed.scheduleInfo?.firstRun || '05:30',
          seed.scheduleInfo?.lastRun || '22:30',
          Number(seed.scheduleInfo?.frequencyMinutes) || 6,
          seed.scheduleInfo?.status || 'OPERATIONAL'
        ]
      );

      const stops = Array.isArray(seed.stops) ? seed.stops : [];
      for (let sIdx = 0; sIdx < stops.length; sIdx++) {
        const stop = stops[sIdx];
        const stopOrder = Number(stop.stopOrder ?? sIdx + 1);
        const stopId = `${routeId}-s-${String(stopOrder).padStart(2, '0')}`;
        const lat = Number(stop.lat);
        const lng = Number(stop.lng);
        const pointGeometry = {
          type: 'Point',
          coordinates: [lng, lat]
        };

        await client.query(
          `
            INSERT INTO stops (
              id,
              route_id,
              name,
              stop_order,
              lat,
              lng,
              geometry
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb);
          `,
          [stopId, routeId, stop.name, stopOrder, lat, lng, JSON.stringify(pointGeometry)]
        );
        totalStopsInserted++;
      }
    }

    // Semilla inicial para incidents, users y telemetry_logs
    await client.query(`
      INSERT INTO incidents (
        id, type, icon, title, description, lat, lng, location_name, route_id, route_name, route_color, delay_minutes, status, reported_by
      ) VALUES
      (
        'inc-001', 'ROAD_BLOCK', '🚧', 'Obras y Reducción de Carril en Av. Central',
        'Trabajos de mantenimiento a la altura de 11a Poniente. Reducción a un carril.',
        16.7554, -93.1295, 'Av. Central y 11a Poniente', 'r-001', 'Ruta 1 - Av. Central / UNACH / Terán', '#2563EB', 15, 'ACTIVE_ALERT', 'Soporte Vial'
      ),
      (
        'inc-002', 'HEAVY_TRAFFIC', '🚗', 'Tráfico Intenso en Crucero Villaflores',
        'Circulación lenta en Libramiento Sur con avance intermitente.',
        16.7375, -93.1180, 'Libramiento Sur y Crucero Villaflores', 'r-003', 'Ruta 43 - Libramiento Sur (Poniente - Oriente)', '#D97706', 12, 'ACTIVE_ALERT', 'Pasajero Combi TX-43A'
      );

      INSERT INTO users (id, name, email, password_hash, role) VALUES
      ('usr-admin', 'Administrador General', 'admin@tuxtlarutas.mx', 'hashed_admin_2026', 'ADMIN'),
      ('usr-support', 'Operador Soporte Vial', 'soporte@tuxtlarutas.mx', 'hashed_support_2026', 'SUPPORT'),
      ('usr-passenger', 'Pasajero UNACH', 'estudiante@unach.mx', 'hashed_user_2026', 'USER');

      INSERT INTO telemetry_logs (unit_id, route_id, direction_type, lat, lng, speed_kmh, status, current_stop_name, next_stop_name)
      VALUES ('R01-IDA', 'r-001', 'IDA', 16.754727, -93.158257, 32.0, 'IN_TRANSIT', 'UNACH Campus I', 'Parque Caña Hueca');
    `);

    await client.query('COMMIT');
    console.log(
      `[DB Align] Tablas routes, stops, incidents, users y telemetry_logs alineadas. Insertadas ${TUXTLA_ROUTES_SEED.length} rutas (r-001..r-012) y ${totalStopsInserted} paradas.`
    );
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB Align SQL Error]:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('alignDatabase.js')) {
  alignAndSeedDatabase().catch((err) => {
    console.error('[DB Align] Falló la ejecución:', err.message);
    process.exit(1);
  });
}

