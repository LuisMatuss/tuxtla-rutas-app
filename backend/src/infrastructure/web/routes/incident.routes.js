// Enrutador de Incidentes Viales y Reportes Ciudadanos
import { Router } from 'express';
import { IncidentController } from '../controllers/IncidentController.js';

export const createIncidentsRouter = () => {
  const router = Router();
  const controller = new IncidentController();

  router.get('/', controller.getIncidents);
  router.post('/', controller.createIncident);
  router.patch('/:id', controller.updateIncidentStatus);

  return router;
};
