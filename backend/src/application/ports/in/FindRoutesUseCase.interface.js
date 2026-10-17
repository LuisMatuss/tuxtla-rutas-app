// Puerto de Entrada (Driving Port): Contrato abstracto para el caso de uso de consulta de rutas
// Regla Arquitectónica: Desacoplado de controladores web, transportes o protocolos.

export class FindRoutesUseCaseInterface {
  /**
   * Obtiene todas las rutas de la red de transporte con su trazado y paradas
   * @returns {Promise<Array<import('../../../domain/entities/Route.js').Route>>}
   */
  async execute() {
    throw new Error('Method execute() must be implemented.');
  }

  /**
   * Obtiene el detalle de una ruta específica por su identificador
   * @param {string} id
   * @returns {Promise<import('../../../domain/entities/Route.js').Route>}
   */
  async executeById(id) {
    throw new Error('Method executeById() must be implemented.');
  }
}
