import { TUXTLA_ROUTES_SEED } from '../../db/tuxtlaRoutesSeed.js';
import {
  PostgresIncidentRepository,
  normalizeRouteId
} from '../../repositories/PostgresIncidentRepository.js';
import { getTelegramBotService } from '../routes/automation.routes.js';

const routesById = new Map();
TUXTLA_ROUTES_SEED.forEach((route, idx) => {
  const pgId = `r-${String(idx + 1).padStart(3, '0')}`;
  const normalized = { ...route, id: pgId };
  routesById.set(pgId, normalized);
  routesById.set(route.id, normalized);
});

export class IncidentController {
  /**
   * @param {PostgresIncidentRepository} [incidentRepository]
   * @param {import('../../telegram/TelegramBotService.js').TelegramBotService} [telegramBotService]
   */
  constructor(
    incidentRepository = new PostgresIncidentRepository(),
    telegramBotService = null
  ) {
    this.incidentRepository = incidentRepository;
    this.telegramBotService = telegramBotService;
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
      const rawRouteId = data.routeId ?? data.route_id ?? null;
      const normalizedRouteId = normalizeRouteId(rawRouteId, data.routeName || data.route_name);
      const route =
        (normalizedRouteId ? routesById.get(normalizedRouteId) : null) ||
        (rawRouteId ? routesById.get(rawRouteId) : null);

      const iconByType = {
        ROAD_BLOCK: '🚧',
        HEAVY_TRAFFIC: '🚗',
        HEAVY_RAIN: '🌧️',
        FLOODING: '🌧️',
        CROWDED_BUS: '🚐',
        CROWDED_UNIT: '🚐',
        HIGH_DELAY: '⏱️',
        ACCIDENT: '⚠️',
        ROAD_WORK: '🔧'
      };

      const createdByRole = data.createdByRole || data.created_by_role;
      const incident = await this.incidentRepository.create({
        ...data,
        id: data.id || `inc-${Date.now()}`,
        icon: data.icon || iconByType[data.type] || '⚠️',
        routeId: normalizedRouteId || rawRouteId || null,
        routeName: data.routeName || data.route_name || route?.name || null,
        routeColor: data.routeColor || data.route_color || route?.color || '#2563EB',
        status: data.status || 'ACTIVE_ALERT',
        reportedBy:
          data.reportedBy ||
          data.reported_by ||
          (createdByRole === 'USER' ? 'Reporte Ciudadano Web' : 'Soporte Vial Tuxtla')
      });

      // Notificar automáticamente al Bot de Telegram en tiempo real
      const botService = this.telegramBotService || getTelegramBotService();
      if (botService && typeof botService.notifyIncidentCreated === 'function') {
        botService.notifyIncidentCreated(incident).catch((err) => {
          console.warn('[IncidentController] Error al enviar aviso a Telegram:', err.message);
        });
      }

      res.status(201).json({
        success: true,
        message: 'Alerta vial registrada en PostgreSQL y publicada en el mapa interactivo.',
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
        return res.status(400).json({
          success: false,
          error: { message: 'No hay cambios para aplicar.' }
        });
      }
      const incident = await this.incidentRepository.update(req.params.id, req.body || {});
      if (!incident) {
        return res.status(404).json({
          success: false,
          error: { message: `No se encontró el incidente con ID ${req.params.id}.` }
        });
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
