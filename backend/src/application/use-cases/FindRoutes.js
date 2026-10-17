// Caso de Uso: Consulta y listado de rutas de transporte público con sus paradas y horarios
// Regla Arquitectónica: Inyección de Dependencias vía constructor. Sin acoplamiento a Express ni SQL.

import { FindRoutesUseCaseInterface } from '../ports/in/FindRoutesUseCase.interface.js';

export class FindRoutes extends FindRoutesUseCaseInterface {
  /**
   * @param {import('../ports/out/RouteRepository.interface.js').RouteRepositoryInterface} routeRepository
   */
  constructor(routeRepository) {
    super();
    if (!routeRepository) {
      throw new Error('FindRoutes requiere una instancia de RouteRepositoryInterface');
    }
    this.routeRepository = routeRepository;
  }

  /**
   * Obtiene todas las rutas activas con sus paradas y horario operativo
   * @returns {Promise<Array<import('../../domain/entities/Route.js').Route>>}
   */
  async execute() {
    const routes = await this.routeRepository.findAll();
    return routes;
  }

  /**
   * Obtiene una ruta por ID o lanza un error si no se encuentra
   * @param {string} id
   * @returns {Promise<import('../../domain/entities/Route.js').Route>}
   */
  async executeById(id) {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      const error = new Error('El ID de la ruta es obligatorio.');
      error.statusCode = 400;
      throw error;
    }

    const route = await this.routeRepository.findById(id.trim());
    if (!route) {
      const error = new Error(`Ruta con ID "${id}" no encontrada.`);
      error.statusCode = 404;
      throw error;
    }

    return route;
  }
}
