// Puerto de Salida (Driven Port): Contrato de persistencia para acceso y consultas espaciales
// Regla Arquitectónica: Desacoplado de bases de datos específicas (PostgreSQL, MongoDB, Memoria, etc.)

export class RouteRepositoryInterface {
  /**
   * Obtiene todas las rutas activas con su trazado espacial y paradas asociadas
   * @returns {Promise<Array<import('../../../domain/entities/Route.js').Route>>}
   */
  async findAll() {
    throw new Error('Method findAll() must be implemented.');
  }

  /**
   * Obtiene una ruta por su identificador único (UUID)
   * @param {string} id
   * @returns {Promise<import('../../../domain/entities/Route.js').Route|null>}
   */
  async findById(id) {
    throw new Error('Method findById() must be implemented.');
  }

  /**
   * Encuentra las paradas más cercanas a un punto geográfico dentro de un radio en metros
   * @param {import('../../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @param {number} [limit=5]
   * @returns {Promise<Array<import('../../../domain/entities/Stop.js').Stop>>}
   */
  async findNearestStops(coordinate, radiusMeters, limit) {
    throw new Error('Method findNearestStops() must be implemented.');
  }

  /**
   * Encuentra la parada única más cercana (compatibilidad)
   * @param {import('../../../domain/value-objects/GeoCoordinate.js').GeoCoordinate} coordinate
   * @param {number} [radiusMeters=1000]
   * @returns {Promise<import('../../../domain/entities/Stop.js').Stop|null>}
   */
  async findNearestStop(coordinate, radiusMeters) {
    const stops = await this.findNearestStops(coordinate, radiusMeters, 1);
    return stops.length > 0 ? stops[0] : null;
  }
}
