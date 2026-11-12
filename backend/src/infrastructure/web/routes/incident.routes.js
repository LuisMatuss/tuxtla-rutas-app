// Enrutador de Incidentes Viales y Reportes Ciudadanos
import { Router } from 'express';
import { IncidentController } from '../controllers/IncidentController.js';
import { pool } from '../../db/postgresPool.js';
import { PostgresIncidentRepository } from '../../repositories/PostgresIncidentRepository.js';

export const createIncidentsRouter = (dbPool = pool) => {
  const router = Router();
  const repository = new PostgresIncidentRepository(dbPool);
  const controller = new IncidentController(repository);

  router.get('/', controller.getIncidents);
  router.post('/', controller.createIncident);
  router.patch('/:id', controller.updateIncidentStatus);

  return router;
};
