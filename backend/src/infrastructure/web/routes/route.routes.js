// Adaptador HTTP (Router): Definición de rutas Express e inyección de dependencias completa
// Regla: Ensambla Pool -> PostgresRouteRepository -> UseCases -> RouteController

import { Router } from 'express';
import { pool } from '../../db/postgresPool.js';
import { PostgresRouteRepository } from '../../repositories/PostgresRouteRepository.js';
import { FindRoutes } from '../../../application/use-cases/FindRoutes.js';
import { CalculateNearestStop } from '../../../application/use-cases/CalculateNearestStop.js';
import { RouteController } from '../controllers/RouteController.js';

/**
 * Factoría para inicializar el controlador con inyección de dependencias completa
 * @param {import('pg').Pool} [dbPool=pool]
 */
export const buildRouteController = (dbPool = pool) => {
  const routeRepository = new PostgresRouteRepository(dbPool);
  const findRoutesUseCase = new FindRoutes(routeRepository);
  const calculateNearestStopUseCase = new CalculateNearestStop(routeRepository);

  return new RouteController({
    findRoutesUseCase,
    calculateNearestStopUseCase
  });
};

/**
 * Enrutador para /api/routes
 */
export const createRouteRouter = (dbPool = pool) => {
  const router = Router();
  const controller = buildRouteController(dbPool);

  // Endpoints de rutas
  router.get('/', controller.getAllRoutes);
  router.get('/nearest-stop', controller.getNearestStop);
  router.get('/:id', controller.getRouteById);

  return router;
};

/**
 * Enrutador para /api/stops
 */
export const createStopsRouter = (dbPool = pool) => {
  const router = Router();
  const controller = buildRouteController(dbPool);

  // Endpoint de paradas cercanas
  router.get('/nearest', controller.getNearestStops);

  return router;
};
