// Adaptador de Persistencia (Driven Adapter): Consultas espaciales PostGIS optimizadas
// Regla: Conversión de geometrías con ST_AsGeoJSON y cálculos métricos reales con ::geography

import { RouteRepositoryInterface } from '../../application/ports/out/RouteRepository.interface.js';
import { Route } from '../../domain/entities/Route.js';
import { Stop } from '../../domain/entities/Stop.js';
import { pool } from '../db/postgresPool.js';

export class PostgresRouteRepository extends RouteRepositoryInterface {
  /**
   * @param {import('pg').Pool} [dbPool=pool]
   */
  constructor(dbPool = pool) {
    super();
    this.pool = dbPool;
  }

  /**
   * Obtiene todas las rutas con su geometría serializada en GeoJSON y paradas ordenadas
   * @returns {Promise<Array<Route>>}
   */
  async findAll() {
    const routesQuery = `
      SELECT 
        id,
        name,
        description,
        color,
        ST_AsGeoJSON(path_geometry)::json AS geometry,
        created_at
      FROM routes
      ORDER BY name ASC;
    `;

    const stopsQuery = `
      SELECT 
        id,
        route_id,
        name,
        stop_order,
        ST_Y(location_geometry) AS lat,
        ST_X(location_geometry) AS lng,
        ST_AsGeoJSON(location_geometry)::json AS geometry
      FROM stops
      ORDER BY route_id, stop_order ASC;
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
        geometry: row.geometry,
        stopOrder: row.stop_order
      });

      if (!stopsByRoute.has(row.route_id)) {
        stopsByRoute.set(row.route_id, []);
      }
      stopsByRoute.get(row.route_id).push(stopEntity);
    }

    // Ensamblar entidades Route con sus respectivas paradas
    return routesResult.rows.map(row => new Route({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      geometry: row.geometry,
      stops: stopsByRoute.get(row.id) || []
    }));
  }

  /**
   * Obtiene una ruta por su ID único junto con sus paradas
   * @param {string} id
   * @returns {Promise<Route|null>}
   */
  async findById(id) {
    const routeQuery = `
      SELECT 
        id,
        name,
        description,
        color,
        ST_AsGeoJSON(path_geometry)::json AS geometry,
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
        ST_Y(location_geometry) AS lat,
        ST_X(location_geometry) AS lng,
        ST_AsGeoJSON(location_geometry)::json AS geometry
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
    const stops = stopsResult.rows.map(s => new Stop({
      id: s.id,
      routeId: s.route_id,
      name: s.name,
      lat: Number(s.lat),
      lng: Number(s.lng),
      geometry: s.geometry,
      stopOrder: s.stop_order
    }));

    return new Route({
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      geometry: row.geometry,
      stops
    });
  }

  /**
   * Calcula las paradas más cercanas usando ST_Distance y ST_DWithin sobre tipos geography
   * @param {import('../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @param {number} [limit=5]
   * @returns {Promise<Array<Stop>>}
   */
  async findNearestStops(coordinate, radiusMeters = 1000, limit = 5) {
    // Recordatorio: ST_MakePoint recibe primero Longitud ($1) y luego Latitud ($2)
    const nearestQuery = `
      SELECT 
        s.id,
        s.route_id,
        s.name,
        s.stop_order,
        ST_Y(s.location_geometry) AS lat,
        ST_X(s.location_geometry) AS lng,
        ST_AsGeoJSON(s.location_geometry)::json AS geometry,
        r.name AS route_name,
        r.color AS route_color,
        ROUND(
          ST_Distance(
            s.location_geometry::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          )::numeric, 1
        ) AS distance_meters
      FROM stops s
      INNER JOIN routes r ON s.route_id = r.id
      WHERE ST_DWithin(
        s.location_geometry::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      ORDER BY distance_meters ASC
      LIMIT $4;
    `;

    const result = await this.pool.query(nearestQuery, [
      coordinate.lng,
      coordinate.lat,
      radiusMeters,
      limit
    ]);

    return result.rows.map(row => new Stop({
      id: row.id,
      routeId: row.route_id,
      name: row.name,
      lat: Number(row.lat),
      lng: Number(row.lng),
      geometry: row.geometry,
      stopOrder: row.stop_order,
      distanceMeters: Number(row.distance_meters),
      routeName: row.route_name,
      routeColor: row.route_color
    }));
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
