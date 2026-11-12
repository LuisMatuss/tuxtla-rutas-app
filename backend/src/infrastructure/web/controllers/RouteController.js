import { TUXTLA_ROUTES_SEED } from '../../db/tuxtlaRoutesSeed.js';
import { pool } from '../../db/postgresPool.js';

export class RouteController {
  /**
   * @param {Object} params
   * @param {import('../../../application/ports/in/FindRoutesUseCase.interface.js').FindRoutesUseCaseInterface} params.findRoutesUseCase
   * @param {import('../../../application/ports/in/CalculateNearestStopUseCase.interface.js').CalculateNearestStopUseCaseInterface} params.calculateNearestStopUseCase
   * @param {import('../../../application/use-cases/PlanTrip.js').PlanTrip} [params.planTripUseCase]
   */
  constructor({ findRoutesUseCase, calculateNearestStopUseCase, planTripUseCase }) {
    if (!findRoutesUseCase || !calculateNearestStopUseCase) {
      throw new Error('RouteController requiere findRoutesUseCase y calculateNearestStopUseCase');
    }
    this.findRoutesUseCase = findRoutesUseCase;
    this.calculateNearestStopUseCase = calculateNearestStopUseCase;
    this.planTripUseCase = planTripUseCase;
  }


  /**
   * GET /api/routes
   * Retorna todas las rutas con su geometría y paradas
   */
  getAllRoutes = async (req, res, next) => {
    try {
      const routes = await this.findRoutesUseCase.execute();
      res.status(200).json({
        success: true,
        count: routes.length,
        data: routes
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/routes/:id
   * Retorna el detalle de una ruta específica
   */
  getRouteById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const route = await this.findRoutesUseCase.executeById(id);
      res.status(200).json({
        success: true,
        data: route
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/stops/nearest?lat=...&lng=...&radius=...&limit=...
   * Calcula y retorna las paradas más cercanas enriquecidas con estimaciones de caminata y próximo colectivo
   */
  getNearestStops = async (req, res, next) => {
    try {
      const { lat, lng, radius, limit } = req.query;

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Los parámetros de consulta "lat" y "lng" son requeridos.',
            status: 400
          }
        });
      }

      const stops = await this.calculateNearestStopUseCase.execute({
        lat,
        lng,
        radiusMeters: radius,
        limit
      });

      res.status(200).json({
        success: true,
        count: stops.length,
        data: stops
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/routes/nearest-stop
   * Endpoint compatible para retorno de parada única más cercana
   */
  getNearestStop = async (req, res, next) => {
    try {
      const { lat, lng, radius } = req.query;

      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Los parámetros de consulta "lat" y "lng" son requeridos.',
            status: 400
          }
        });
      }

      const stops = await this.calculateNearestStopUseCase.execute({
        lat,
        lng,
        radiusMeters: radius,
        limit: 1
      });

      res.status(200).json({
        success: true,
        data: stops.length > 0 ? stops[0] : null
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/trips/plan
   * Calcula itinerarios directos y con trasbordo entre origen y destino
   */
  planTrip = async (req, res, next) => {
    try {
      const { originLat, originLng, destLat, destLng } = req.body || {};

      if (
        originLat === undefined ||
        originLng === undefined ||
        destLat === undefined ||
        destLng === undefined
      ) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Se requieren originLat, originLng, destLat y destLng para planificar el viaje.',
            status: 400
          }
        });
      }

      const result = await this.planTripUseCase.execute({
        originLat,
        originLng,
        destLat,
        destLng
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/routes/:id/config
   * Permite al rol Admin actualizar frecuencia, estado operativo o color de la ruta en PostgreSQL
   */
  updateRouteConfig = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { frequencyMinutes, status, color } = req.body || {};

      const idxMatch = String(id).match(/^r-0*(\d+)$/i);
      const seedIdx = idxMatch ? Number(idxMatch[1]) - 1 : -1;
      const seedRoute =
        (seedIdx >= 0 && seedIdx < TUXTLA_ROUTES_SEED.length
          ? TUXTLA_ROUTES_SEED[seedIdx]
          : null) || TUXTLA_ROUTES_SEED.find((r) => r.id === id);

      if (seedRoute) {
        if (frequencyMinutes !== undefined) {
          seedRoute.scheduleInfo.frequencyMinutes = Number(frequencyMinutes);
        }
        if (status !== undefined) {
          seedRoute.scheduleInfo.status = status;
        }
        if (color !== undefined) {
          seedRoute.color = color;
        }
      }

      const updateResult = await pool.query(
        `
          UPDATE routes
          SET
            frequency_minutes = COALESCE($2, frequency_minutes),
            status = COALESCE($3, status),
            color = COALESCE($4, color)
          WHERE id = $1
          RETURNING *;
        `,
        [
          id,
          frequencyMinutes !== undefined ? Number(frequencyMinutes) : null,
          status !== undefined ? status : null,
          color !== undefined ? color : null
        ]
      );

      if (updateResult.rows.length === 0 && !seedRoute) {
        return res.status(404).json({
          success: false,
          error: { message: `Ruta con ID ${id} no encontrada.` }
        });
      }

      const updatedRoute = await this.findRoutesUseCase.executeById(id);

      res.status(200).json({
        success: true,
        message: `Configuración de ruta "${updatedRoute.name}" actualizada exitosamente en PostgreSQL.`,
        data: updatedRoute
      });
    } catch (error) {
      next(error);
    }
  };
}

