// Puerto de Entrada (Driving Port): Contrato abstracto para el caso de uso de cálculo de paradas cercanas
// Regla Arquitectónica: Desacoplado de controladores web, transportes o protocolos.

export class CalculateNearestStopUseCaseInterface {
  /**
   * Calcula y enriquece las paradas más cercanas a partir de coordenadas del usuario
   * @param {Object} params
   * @param {number|string} params.lat - Latitud del usuario
   * @param {number|string} params.lng - Longitud del usuario
   * @param {number} [params.radiusMeters=1000] - Radio máximo de búsqueda en metros
   * @param {number} [params.limit=5] - Cantidad máxima de paradas a retornar
   * @returns {Promise<Array<import('../../../domain/entities/Stop.js').Stop>>}
   */
  async execute({ lat, lng, radiusMeters, limit }) {
    throw new Error('Method execute() must be implemented.');
  }
}
