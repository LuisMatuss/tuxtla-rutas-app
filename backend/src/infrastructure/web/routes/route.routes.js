import { Router } from 'express';
import { pool } from '../../db/postgresPool.js';
import { PostgresRouteRepository } from '../../repositories/PostgresRouteRepository.js';
import { FindRoutes } from '../../../application/use-cases/FindRoutes.js';
import { CalculateNearestStop } from '../../../application/use-cases/CalculateNearestStop.js';
import { PlanTrip } from '../../../application/use-cases/PlanTrip.js';
import { RouteController } from '../controllers/RouteController.js';

/**
 * Factoría para inicializar el controlador con inyección de dependencias completa
 * @param {import('pg').Pool} [dbPool=pool]
 */
export const buildRouteController = (dbPool = pool) => {
  const routeRepository = new PostgresRouteRepository(dbPool);
  const findRoutesUseCase = new FindRoutes(routeRepository);
  const calculateNearestStopUseCase = new CalculateNearestStop(routeRepository);
  const planTripUseCase = new PlanTrip(routeRepository);

  return new RouteController({
    findRoutesUseCase,
    calculateNearestStopUseCase,
    planTripUseCase
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
  router.patch('/:id/config', controller.updateRouteConfig);

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

/**
 * Enrutador para /api/trips
 */
export const createTripsRouter = (dbPool = pool) => {
  const router = Router();
  const controller = buildRouteController(dbPool);

  // Planificador inteligente de viajes
  router.post('/plan', controller.planTrip);

  return router;
};

