// Enrutador de Automatización: Bot de Telegram en Vivo (Long Polling), Webhooks n8n y telemetría IoT
import { Router } from 'express';
import { pool } from '../../db/postgresPool.js';
import { PostgresRouteRepository } from '../../repositories/PostgresRouteRepository.js';
import { CalculateNearestStop } from '../../../application/use-cases/CalculateNearestStop.js';
import { FindRoutes } from '../../../application/use-cases/FindRoutes.js';
import { PlanTrip } from '../../../application/use-cases/PlanTrip.js';
import { IncidentController } from '../controllers/IncidentController.js';
import { AutomationController } from '../controllers/AutomationController.js';
import { TelegramBotService } from '../../telegram/TelegramBotService.js';

let singletonTelegramService = null;

/**
 * @param {import('pg').Pool} [dbPool=pool]
 */
export const createAutomationRouter = (dbPool = pool) => {
  const router = Router();

  // Inyección de dependencias limpia
  const routeRepository = new PostgresRouteRepository(dbPool);
  const calculateNearestStopUseCase = new CalculateNearestStop(routeRepository);
  const findRoutesUseCase = new FindRoutes(routeRepository);
  const planTripUseCase = new PlanTrip(routeRepository);
  const incidentController = new IncidentController();

  if (!singletonTelegramService) {
    singletonTelegramService = new TelegramBotService({
      calculateNearestStopUseCase,
      findRoutesUseCase,
      planTripUseCase,
      incidentController
    });

    if (process.env.NODE_ENV !== 'test') {
      singletonTelegramService.start().catch((err) => {
        console.warn('[TelegramBotService] Inicio diferido:', err.message);
      });
    }
  }

  const controller = new AutomationController({
    calculateNearestStopUseCase,
    findRoutesUseCase,
    telegramBotService: singletonTelegramService
  });

  // Endpoints del Bot Real de Telegram (Long Polling + Monitoreo Admin/Soporte)
  router.get('/telegram/status', controller.getTelegramStatus);
  router.post('/telegram/connect', controller.connectTelegramBot);
  router.post('/telegram/disconnect', controller.disconnectTelegramBot);
  router.post('/telegram/simulate', controller.simulateTelegramQuery);
  router.get('/postgres-audit', controller.renderPostgresAuditView);

  // Endpoints de automatización n8n y gestión de flota
  router.post('/telegram-webhook', controller.handleTelegramWebhook);
  router.post('/telemetry', controller.recordTelemetry);
  router.get('/telemetry', controller.getTelemetry);
  router.post('/fleet', controller.dispatchFleet);

  return router;
};
