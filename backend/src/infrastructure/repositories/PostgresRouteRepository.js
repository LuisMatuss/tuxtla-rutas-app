// Adaptador de Persistencia (Driven Adapter): Consultas espaciales PostGIS optimizadas
// Regla: Conversión de geometrías con ST_AsGeoJSON y cálculos métricos reales con ::geography
// Resiliencia Espacial: Si la conexión a PostgreSQL no está disponible, responde con el motor espacial en memoria (Haversine exacto)

import { RouteRepositoryInterface } from '../../application/ports/out/RouteRepository.interface.js';
import { Route } from '../../domain/entities/Route.js';
import { Stop } from '../../domain/entities/Stop.js';
import { pool } from '../db/postgresPool.js';
import { TUXTLA_ROUTES_SEED, calculateHaversineDistance } from '../db/tuxtlaRoutesSeed.js';

export class PostgresRouteRepository extends RouteRepositoryInterface {
  /**
   * @param {import('pg').Pool} [dbPool=pool]
   */
  constructor(dbPool = pool) {
    super();
    this.pool = dbPool;
  }

  /**
   * Transforma una definición de ruta de datos semilla a la entidad de dominio Route
   * @private
   */
  #mapSeedToRouteEntity(seed) {
    const stops = (seed.stops || []).map(
      (s) =>
        new Stop({
          id: s.id,
          routeId: s.routeId || seed.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
          stopOrder: s.stopOrder
        })
    );

    return new Route({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      color: seed.color,
      geometry: seed.geometry,
      stops
    });
  }

  /**
   * Obtiene todas las rutas con su geometría serializada en GeoJSON y paradas ordenadas
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

      if (routesResult.rows.length === 0) {
        // Si la tabla está vacía, responder con el dataset semilla oficial
        return TUXTLA_ROUTES_SEED.map((seed) => this.#mapSeedToRouteEntity(seed));
      }

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
      return routesResult.rows.map(
        (row) =>
          new Route({
            id: row.id,
            name: row.name,
            description: row.description,
            color: row.color,
            geometry: row.geometry,
            stops: stopsByRoute.get(row.id) || []
          })
      );
    } catch (err) {
      console.warn(
        '[PostgresRouteRepository] Base de datos no disponible (findAll). Activando motor espacial en memoria:',
        err.message
      );
      return TUXTLA_ROUTES_SEED.map((seed) => this.#mapSeedToRouteEntity(seed));
    }
  }

  /**
   * Obtiene una ruta por su ID único junto con sus paradas
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
        const seed = TUXTLA_ROUTES_SEED.find((r) => r.id === id);
        return seed ? this.#mapSeedToRouteEntity(seed) : null;
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
            geometry: s.geometry,
            stopOrder: s.stop_order
          })
      );

      return new Route({
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color,
        geometry: row.geometry,
        stops
      });
    } catch (err) {
      console.warn(
        `[PostgresRouteRepository] Base de datos no disponible (findById: ${id}). Usando motor en memoria:`,
        err.message
      );
      const seed = TUXTLA_ROUTES_SEED.find((r) => r.id === id);
      return seed ? this.#mapSeedToRouteEntity(seed) : null;
    }
  }

  /**
   * Calcula las paradas más cercanas usando ST_Distance y ST_DWithin sobre tipos geography
   * (con fallback en cálculo Haversine geodésico exacto si la base de datos no está disponible)
   * @param {import('../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @param {number} [limit=5]
   * @returns {Promise<Array<Stop>>}
   */
  async findNearestStops(coordinate, radiusMeters = 1000, limit = 5) {
    try {
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

      if (result.rows.length === 0) {
        // Si no hay filas de la BD, también evaluamos en el seed
        return this.#findNearestStopsInMemory(coordinate, radiusMeters, limit);
      }

      return result.rows.map(
        (row) =>
          new Stop({
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
          })
      );
    } catch (err) {
      console.warn(
        '[PostgresRouteRepository] Base de datos no disponible (findNearestStops). Usando motor Haversine en memoria:',
        err.message
      );
      return this.#findNearestStopsInMemory(coordinate, radiusMeters, limit);
    }
  }

  /**
   * Cálculo espacial en memoria con Haversine sobre todas las paradas del catálogo
   * @private
   */
  #findNearestStopsInMemory(coordinate, radiusMeters, limit) {
    const candidates = [];

    for (const route of TUXTLA_ROUTES_SEED) {
      for (const stop of route.stops) {
        const distanceMeters = calculateHaversineDistance(
          coordinate.lat,
          coordinate.lng,
          stop.lat,
          stop.lng
        );

        if (distanceMeters <= radiusMeters) {
          candidates.push({
            stop,
            route,
            distanceMeters
          });
        }
      }
    }

    candidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const selected = candidates.slice(0, limit);

    return selected.map(
      ({ stop, route, distanceMeters }) =>
        new Stop({
          id: stop.id,
          routeId: stop.routeId || route.id,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
          stopOrder: stop.stopOrder,
          distanceMeters,
          routeName: route.name,
          routeColor: route.color
        })
    );
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

