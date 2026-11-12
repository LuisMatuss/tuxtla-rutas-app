import { TUXTLA_ROUTES_SEED } from '../../db/tuxtlaRoutesSeed.js';
import { PostgresIncidentRepository } from '../../repositories/PostgresIncidentRepository.js';

const routesById = new Map();
TUXTLA_ROUTES_SEED.forEach((route, idx) => {
  const pgId = `r-${String(idx + 1).padStart(3, '0')}`;
  const normalized = { ...route, id: pgId };
  routesById.set(pgId, normalized);
  routesById.set(route.id, normalized);
});

export class IncidentController {
  /** @param {PostgresIncidentRepository} [incidentRepository] */
  constructor(incidentRepository = new PostgresIncidentRepository()) {
    this.incidentRepository = incidentRepository;
  }

  listActiveIncidents = () => this.incidentRepository.findActive();

  getIncidents = async (req, res, next) => {
    try {
      const items = await this.incidentRepository.findAll({
        status: req.query.status,
        routeId: req.query.routeId || req.query.route_id
      });
      res.status(200).json({ success: true, count: items.length, data: items });
    } catch (error) {
      next(error);
    }
  };

  createIncident = async (req, res, next) => {
    try {
      const data = req.body || {};
      const routeId = data.routeId || data.route_id || null;
      const route = routeId ? routesById.get(routeId) : null;
      const iconByType = {
        ROAD_BLOCK: '🚧', HEAVY_TRAFFIC: '🚗', HEAVY_RAIN: '🌧️',
        CROWDED_BUS: '🚐', ACCIDENT: '⚠️', ROAD_WORK: '🔧'
      };
      const createdByRole = data.createdByRole || data.created_by_role;
      const incident = await this.incidentRepository.create({
        ...data,
        id: data.id || `inc-${Date.now()}`,
        icon: data.icon || iconByType[data.type] || '⚠️',
        routeId,
        routeName: data.routeName || data.route_name || route?.name || null,
        routeColor: data.routeColor || data.route_color || route?.color || '#2563EB',
        status: data.status || (createdByRole === 'USER' ? 'PENDING' : 'ACTIVE_ALERT'),
        reportedBy: data.reportedBy || data.reported_by ||
          (createdByRole === 'USER' ? 'Reporte Ciudadano' : 'Soporte Vial Tuxtla')
      });

      res.status(201).json({
        success: true,
        message: incident.status === 'PENDING'
          ? 'Reporte enviado exitosamente. Será verificado por el equipo de Soporte Vial.'
          : 'Alerta vial publicada exitosamente en el mapa interactivo.',
        data: incident
      });
    } catch (error) {
      next(error);
    }
  };

  updateIncidentStatus = async (req, res, next) => {
    try {
      const body = req.body || {};
      if (!body.status && body.delayMinutes === undefined && body.delay_minutes === undefined) {
        return res.status(400).json({ success: false, error: { message: 'No hay cambios para aplicar.' } });
      }
      const incident = await this.incidentRepository.update(req.params.id, req.body || {});
      if (!incident) {
        return res.status(404).json({ success: false, error: { message: `No se encontró el incidente con ID ${req.params.id}.` } });
      }
      res.status(200).json({
        success: true,
        message: `Incidente ${req.params.id} actualizado a estado "${incident.status}".`,
        data: incident
      });
    } catch (error) {
      next(error);
    }
  };
}
