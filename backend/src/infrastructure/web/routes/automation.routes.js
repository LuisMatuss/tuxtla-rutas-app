// Enrutador de Automatización: Webhooks para n8n / Telegram y telemetría IoT de Node-RED
import { Router } from 'express';
import { pool } from '../../db/postgresPool.js';
import { PostgresRouteRepository } from '../../repositories/PostgresRouteRepository.js';
import { CalculateNearestStop } from '../../../application/use-cases/CalculateNearestStop.js';
import { FindRoutes } from '../../../application/use-cases/FindRoutes.js';
import { AutomationController } from '../controllers/AutomationController.js';

/**
 * @param {import('pg').Pool} [dbPool=pool]
 */
export const createAutomationRouter = (dbPool = pool) => {
  const router = Router();

  // Inyección de dependencias limpia
  const routeRepository = new PostgresRouteRepository(dbPool);
  const calculateNearestStopUseCase = new CalculateNearestStop(routeRepository);
  const findRoutesUseCase = new FindRoutes(routeRepository);

  const controller = new AutomationController({
    calculateNearestStopUseCase,
    findRoutesUseCase
  });

  // Endpoints de automatización y gestión de flota
  router.post('/telegram-webhook', controller.handleTelegramWebhook);
  router.post('/telemetry', controller.recordTelemetry);
  router.get('/telemetry', controller.getTelemetry);
  router.post('/fleet', controller.dispatchFleet);


  return router;
};
