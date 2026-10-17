// Adaptador Primario (HTTP Controller): Maneja solicitudes REST y delega a los Casos de Uso
// Regla: No contiene lógica de negocio; valida parámetros HTTP y responde con códigos de estado adecuados.

export class RouteController {
  /**
   * @param {Object} params
   * @param {import('../../../application/ports/in/FindRoutesUseCase.interface.js').FindRoutesUseCaseInterface} params.findRoutesUseCase
   * @param {import('../../../application/ports/in/CalculateNearestStopUseCase.interface.js').CalculateNearestStopUseCaseInterface} params.calculateNearestStopUseCase
   */
  constructor({ findRoutesUseCase, calculateNearestStopUseCase }) {
    if (!findRoutesUseCase || !calculateNearestStopUseCase) {
      throw new Error('RouteController requiere findRoutesUseCase y calculateNearestStopUseCase');
    }
    this.findRoutesUseCase = findRoutesUseCase;
    this.calculateNearestStopUseCase = calculateNearestStopUseCase;
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
}
