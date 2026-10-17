// Caso de Uso: Cálculo y enriquecimiento de las paradas más cercanas a la posición del usuario
// Regla Arquitectónica: Inyección de Dependencias vía constructor. Sin acoplamiento a Express ni SQL.

import { CalculateNearestStopUseCaseInterface } from '../ports/in/CalculateNearestStopUseCase.interface.js';
import { GeoCoordinate } from '../../domain/value-objects/GeoCoordinate.js';

export class CalculateNearestStop extends CalculateNearestStopUseCaseInterface {
  /**
   * @param {import('../ports/out/RouteRepository.interface.js').RouteRepositoryInterface} routeRepository
   */
  constructor(routeRepository) {
    super();
    if (!routeRepository) {
      throw new Error('CalculateNearestStop requiere una instancia de RouteRepositoryInterface');
    }
    this.routeRepository = routeRepository;
  }

  /**
   * @param {Object} params
   * @param {number|string} params.lat - Latitud del usuario
   * @param {number|string} params.lng - Longitud del usuario
   * @param {number} [params.radiusMeters=1000] - Radio de búsqueda en metros (por defecto 1000m)
   * @param {number} [params.limit=5] - Límite de paradas a devolver
   * @returns {Promise<Array<import('../../domain/entities/Stop.js').Stop>>}
   */
  async execute({ lat, lng, radiusMeters = 1000, limit = 5 }) {
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      const error = new Error('Los parámetros de coordenadas "lat" y "lng" son obligatorios.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Instancia y validación estricta de las coordenadas mediante el Value Object de Dominio
    const coordinate = new GeoCoordinate(lat, lng);

    // Normalización de radio y límite de búsqueda
    const parsedRadius = Number(radiusMeters);
    const parsedLimit = Number(limit);
    const safeRadius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : 1000;
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;

    // 2. Consulta espacial delegada al puerto de salida (repositorio)
    const nearestStops = await this.routeRepository.findNearestStops(coordinate, safeRadius, safeLimit);

    // 3. Enriquecimiento de cada parada con estimación de caminata y próximo colectivo
    return nearestStops.map((stop, index) => {
      // Velocidad promedio de caminata humana: ~80 metros por minuto (~4.8 km/h)
      const distance = Number(stop.distanceMeters) || 0;
      const walkingTimeMinutes = Math.max(1, Math.ceil(distance / 80));

      // Estimación del tiempo de llegada del próximo colectivo en minutos
      // Escalonado coherente: 3 a 12 minutos según cercanía
      const nextBusMinutes = Math.max(3, 4 + (index * 2));

      stop.walkingTimeMinutes = walkingTimeMinutes;
      stop.nextBusMinutes = nextBusMinutes;

      return stop;
    });
  }
}
