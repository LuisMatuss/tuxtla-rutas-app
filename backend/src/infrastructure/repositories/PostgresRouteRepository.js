// Adaptador de Persistencia (Driven Adapter): Consultas SQL directas en PostgreSQL (tuxtla_rutas_db)
// Sin fallbacks silenciosos en memoria: cualquier error SQL se registra y se propaga explícitamente.

import { RouteRepositoryInterface } from '../../application/ports/out/RouteRepository.interface.js';
import { Route } from '../../domain/entities/Route.js';
import { Stop } from '../../domain/entities/Stop.js';
import { pool, dbConfig } from '../db/postgresPool.js';
import { TUXTLA_ROUTES_SEED } from '../db/tuxtlaRoutesSeed.js';

const CIRCUIT_META_BY_ID = new Map();
TUXTLA_ROUTES_SEED.forEach((seed, idx) => {
  const rId = `r-${String(idx + 1).padStart(3, '0')}`;
  CIRCUIT_META_BY_ID.set(rId, seed);
  CIRCUIT_META_BY_ID.set(seed.id, seed);
});

let repositoryPoolLogged = false;

export class PostgresRouteRepository extends RouteRepositoryInterface {
  /**
   * @param {import('pg').Pool} [dbPool=pool]
   */
  constructor(dbPool = pool) {
    super();
    this.pool = dbPool;
    this.dbConfig = {
      host: process.env.DB_HOST || dbConfig.host || 'localhost',
      port: Number(process.env.DB_PORT) || dbConfig.port || 5432,
      user: process.env.DB_USER || dbConfig.user || 'postgres',
      password: process.env.DB_PASSWORD || dbConfig.password || 'Admin123',
      database: process.env.DB_NAME || dbConfig.database || 'tuxtla_rutas_db'
    };

    if (!repositoryPoolLogged && process.env.NODE_ENV !== 'test') {
      repositoryPoolLogged = true;
      console.log(
        `[PostgresRouteRepository] Pool PostgreSQL vinculado a ${this.dbConfig.database} (${this.dbConfig.host}:${this.dbConfig.port} • usuario: ${this.dbConfig.user})`
      );
    }
  }

  /**
   * Obtiene todas las rutas desde PostgreSQL con su geometría GeoJSON y paradas ordenadas
   * Columnas esperadas en routes: id, name, description, color, geometry, first_run, last_run, frequency_minutes, created_at
   * Columnas esperadas en stops: id, route_id, name, stop_order, lat, lng, geometry
   * @returns {Promise<Array<Route>>}
   */
  async findAll() {
    try {
      const routesQuery = `
        SELECT 
          id,
          name,
          description,
          color,
          geometry,
          first_run,
          last_run,
          frequency_minutes,
          status,
          created_at
        FROM routes
        ORDER BY id ASC;
      `;

      const stopsQuery = `
        SELECT 
          id,
          route_id,
          name,
          stop_order,
          lat,
          lng,
          geometry
        FROM stops
        ORDER BY route_id ASC, stop_order ASC;
      `;

      const [routesResult, stopsResult] = await Promise.all([
        this.pool.query(routesQuery),
        this.pool.query(stopsQuery)
      ]);

      // Agrupar paradas por route_id
      const stopsByRoute = new Map();
      for (const row of stopsResult.rows) {
        const stopEntity = new Stop({
          id: row.id,
          routeId: row.route_id,
          name: row.name,
          lat: Number(row.lat),
          lng: Number(row.lng),
          geometry:
            typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
          stopOrder: Number(row.stop_order)
        });

        if (!stopsByRoute.has(row.route_id)) {
          stopsByRoute.set(row.route_id, []);
        }
        stopsByRoute.get(row.route_id).push(stopEntity);
      }

      // Ensamblar entidades Route con sus respectivas paradas desde PostgreSQL
      return routesResult.rows.map((row) => {
        const meta = CIRCUIT_META_BY_ID.get(row.id);
        return new Route({
          id: row.id,
          name: row.name,
          description: row.description,
          color: row.color,
          geometry:
            typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
          stops: stopsByRoute.get(row.id) || [],
          firstRun: row.first_run || '05:30',
          lastRun: row.last_run || '22:30',
          frequencyMinutes: Number(row.frequency_minutes) || 6,
          status: row.status || 'OPERATIONAL',
          outboundGeometry: meta?.outboundGeometry || null,
          inboundGeometry: meta?.inboundGeometry || null,
          returnStops: meta?.returnStops || null,
          outboundStopIndices: meta?.outboundStopIndices || null,
          inboundStopIndices: meta?.inboundStopIndices || null,
          stopVertexIndices: meta?.stopVertexIndices || null
        });
      });
    } catch (err) {
      console.error('[PostgresRouteRepository SQL Error]:', err);
      throw err;
    }
  }

  /**
   * Obtiene una ruta por su ID único junto con sus paradas desde PostgreSQL
   * @param {string} id
   * @returns {Promise<Route|null>}
   */
  async findById(id) {
    try {
      const routeQuery = `
        SELECT 
          id,
          name,
          description,
          color,
          geometry,
          first_run,
          last_run,
          frequency_minutes,
          status,
          created_at
        FROM routes
        WHERE id = $1;
      `;

      const stopsQuery = `
        SELECT 
          id,
          route_id,
          name,
          stop_order,
          lat,
          lng,
          geometry
        FROM stops
        WHERE route_id = $1
        ORDER BY stop_order ASC;
      `;

      const [routeResult, stopsResult] = await Promise.all([
        this.pool.query(routeQuery, [id]),
        this.pool.query(stopsQuery, [id])
      ]);

      if (routeResult.rows.length === 0) {
        return null;
      }

      const row = routeResult.rows[0];
      const stops = stopsResult.rows.map(
        (s) =>
          new Stop({
            id: s.id,
            routeId: s.route_id,
            name: s.name,
            lat: Number(s.lat),
            lng: Number(s.lng),
            geometry: typeof s.geometry === 'string' ? JSON.parse(s.geometry) : s.geometry,
            stopOrder: Number(s.stop_order)
          })
      );

      const meta = CIRCUIT_META_BY_ID.get(row.id);
      return new Route({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        geometry: typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
        stops,
        firstRun: row.first_run || '05:30',
        lastRun: row.last_run || '22:30',
        frequencyMinutes: Number(row.frequency_minutes) || 6,
        status: row.status || 'OPERATIONAL',
        outboundGeometry: meta?.outboundGeometry || null,
        inboundGeometry: meta?.inboundGeometry || null,
        returnStops: meta?.returnStops || null,
        outboundStopIndices: meta?.outboundStopIndices || null,
        inboundStopIndices: meta?.inboundStopIndices || null,
        stopVertexIndices: meta?.stopVertexIndices || null
      });
    } catch (err) {
      console.error('[PostgresRouteRepository SQL Error]:', err);
      throw err;
    }
  }

  /**
   * Calcula las paradas más cercanas directamente en PostgreSQL usando fórmula geodésica Haversine en SQL
   * Columnas esperadas en row: id, route_id, name, stop_order, lat, lng, geometry, route_name, route_color, distance_meters
   * @param {import('../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @param {number} [limit=5]
   * @returns {Promise<Array<Stop>>}
   */
  async findNearestStops(coordinate, radiusMeters = 1000, limit = 5) {
    try {
      const nearestQuery = `
        SELECT *
        FROM (
          SELECT 
            s.id,
            s.route_id,
            s.name,
            s.stop_order,
            s.lat,
            s.lng,
            s.geometry,
            r.name AS route_name,
            r.color AS route_color,
            ROUND(
              (
                6371000 * 2 * ASIN(
                  SQRT(
                    POWER(SIN(RADIANS(s.lat - $1) / 2), 2) +
                    COS(RADIANS($1)) * COS(RADIANS(s.lat)) *
                    POWER(SIN(RADIANS(s.lng - $2) / 2), 2)
                  )
                )
              )::numeric,
              1
            ) AS distance_meters
          FROM stops s
          INNER JOIN routes r ON s.route_id = r.id
        ) AS nearest_candidates
        WHERE distance_meters <= $3
        ORDER BY distance_meters ASC
        LIMIT $4;
      `;

      const result = await this.pool.query(nearestQuery, [
        Number(coordinate.lat),
        Number(coordinate.lng),
        Number(radiusMeters),
        Number(limit)
      ]);

      return result.rows.map(
        (row) =>
          new Stop({
            id: row.id,
            routeId: row.route_id,
            name: row.name,
            lat: Number(row.lat),
            lng: Number(row.lng),
            geometry: typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
            stopOrder: Number(row.stop_order),
            distanceMeters: Number(row.distance_meters),
            routeName: row.route_name,
            routeColor: row.route_color
          })
      );
    } catch (err) {
      console.error('[PostgresRouteRepository SQL Error]:', err);
      throw err;
    }
  }

  /**
   * Persiste o actualiza una ruta y sus paradas en PostgreSQL dentro de una transacción
   * @param {Route|Object} route
   * @returns {Promise<Route>}
   */
  async save(route) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const upsertRouteQuery = `
        INSERT INTO routes (
          id,
          name,
          description,
          color,
          geometry,
          first_run,
          last_run,
          frequency_minutes
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          geometry = EXCLUDED.geometry,
          first_run = EXCLUDED.first_run,
          last_run = EXCLUDED.last_run,
          frequency_minutes = EXCLUDED.frequency_minutes
        RETURNING *;
      `;

      const geometryJson = JSON.stringify(
        route.geometry || { type: 'LineString', coordinates: [] }
      );

      await client.query(upsertRouteQuery, [
        route.id,
        route.name,
        route.description || '',
        route.color || '#2563EB',
        geometryJson,
        route.firstRun || route.scheduleInfo?.firstRun || '05:30',
        route.lastRun || route.scheduleInfo?.lastRun || '22:30',
        Number(route.frequencyMinutes || route.scheduleInfo?.frequencyMinutes || 6)
      ]);

      if (Array.isArray(route.stops) && route.stops.length > 0) {
        await client.query('DELETE FROM stops WHERE route_id = $1;', [route.id]);

        const insertStopQuery = `
          INSERT INTO stops (
            id,
            route_id,
            name,
            stop_order,
            lat,
            lng,
            geometry
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb);
        `;

        for (let i = 0; i < route.stops.length; i++) {
          const s = route.stops[i];
          const stopOrder = s.stopOrder ?? s.stop_order ?? i + 1;
          const stopId = s.id || `${route.id}-s-${String(stopOrder).padStart(2, '0')}`;
          const lat = Number(s.lat);
          const lng = Number(s.lng);
          const stopGeom = JSON.stringify(
            s.geometry || { type: 'Point', coordinates: [lng, lat] }
          );

          await client.query(insertStopQuery, [
            stopId,
            route.id,
            s.name,
            stopOrder,
            lat,
            lng,
            stopGeom
          ]);
        }
      }

      await client.query('COMMIT');
      return await this.findById(route.id);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PostgresRouteRepository SQL Error]:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene la parada única más cercana (compatibilidad hacia atrás)
   * @param {import('../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @returns {Promise<Stop|null>}
   */
  async findNearestStop(coordinate, radiusMeters = 1000) {
    const stops = await this.findNearestStops(coordinate, radiusMeters, 1);
    return stops.length > 0 ? stops[0] : null;
  }
}
