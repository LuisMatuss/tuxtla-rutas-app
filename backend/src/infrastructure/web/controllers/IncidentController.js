// Adaptador Primario (HTTP Controller): Gestión de Incidentes Viales y Reportes Ciudadanos
// Permite a los usuarios reportar contingencias y al personal de Soporte Vial verificar y publicarlas

import { randomUUID } from 'crypto';
import { TUXTLA_ROUTES_SEED } from '../../db/tuxtlaRoutesSeed.js';

const routesById = new Map(TUXTLA_ROUTES_SEED.map((r) => [r.id, r]));

// Semilla inicial en memoria con 2 incidentes reales de Tuxtla Gutiérrez
const incidentsStore = new Map([
  [
    'inc-001',
    {
      id: 'inc-001',
      type: 'ROAD_BLOCK',
      icon: '🚧',
      title: 'Obras y Reducción de Carril en Av. Central',
      description: 'Trabajos de mantenimiento a la altura de 11a Poniente. Reducción a un carril con desvío sugerido.',
      lat: 16.7554,
      lng: -93.1295,
      locationName: 'Av. Central y 11a Poniente',
      routeId: 'a0000001-0000-0000-0000-000000000001',
      routeName: 'Ruta 1 - Av. Central / UNACH / Terán',
      routeColor: '#2563EB',
      delayMinutes: 15,
      status: 'ACTIVE_ALERT', // 'PENDING' | 'ACTIVE_ALERT' | 'RESOLVED'
      reportedBy: 'Soporte Vial',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  [
    'inc-002',
    {
      id: 'inc-002',
      type: 'HEAVY_TRAFFIC',
      icon: '🚗',
      title: 'Tráfico Intenso en Crucero Villaflores',
      description: 'Circulación lenta en Libramiento Sur con avance intermitente por semáforo en sincronización.',
      lat: 16.7375,
      lng: -93.1180,
      locationName: 'Libramiento Sur y Crucero Villaflores',
      routeId: 'a0000003-0000-0000-0000-000000000003',
      routeName: 'Ruta 43 - Libramiento Sur (Poniente - Oriente)',
      routeColor: '#D97706',
      delayMinutes: 12,
      status: 'ACTIVE_ALERT',
      reportedBy: 'Pasajero Combi TX-43A',
      createdAt: new Date(Date.now() - 1800000).toISOString()
    }
  ]
]);

export class IncidentController {
  /**
   * GET /api/incidents
   * Retorna los incidentes viales registrados (filtrables por ?status=)
   */
  getIncidents = async (req, res, next) => {
    try {
      const { status, routeId } = req.query;
      let items = Array.from(incidentsStore.values());

      if (status) {
        items = items.filter((i) => i.status === status);
      }
      if (routeId) {
        items = items.filter((i) => i.routeId === routeId);
      }

      // Ordenar más recientes primero
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/incidents
   * Registra un nuevo incidente o reporte ciudadano
   */
  createIncident = async (req, res, next) => {
    try {
      const {
        type = 'TRAFFIC',
        title,
        description,
        lat,
        lng,
        routeId,
        delayMinutes = 10,
        createdByRole = 'USER',
        locationName
      } = req.body || {};

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: { message: 'Se requieren coordenadas válidas (lat, lng).' }
        });
      }

      const id = `inc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const route = routeId ? routesById.get(routeId) : null;

      // Asignar icono semántico según tipo de incidente
      const iconMap = {
        ROAD_BLOCK: '🚧',
        HEAVY_TRAFFIC: '🚗',
        HEAVY_RAIN: '🌧️',
        CROWDED_BUS: '🚐',
        ACCIDENT: '⚠️',
        ROAD_WORK: '🔧'
      };

      const newIncident = {
        id,
        type,
        icon: iconMap[type] || '⚠️',
        title: title || `Reporte vial: ${type}`,
        description: description || 'Incidente vial reportado en vía pública.',
        lat: Number(lat),
        lng: Number(lng),
        locationName: locationName || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
        routeId: routeId || null,
        routeName: route ? route.name : 'Vía General / Multiruta',
        routeColor: route ? route.color : '#64748b',
        delayMinutes: Number(delayMinutes) || 10,
        // Los reportes de pasajeros quedan en PENDING hasta ser validados por Soporte
        status: createdByRole === 'USER' ? 'PENDING' : 'ACTIVE_ALERT',
        reportedBy: createdByRole === 'USER' ? 'Reporte Ciudadano' : 'Soporte Vial Tuxtla',
        createdAt: new Date().toISOString()
      };

      incidentsStore.set(id, newIncident);

      res.status(201).json({
        success: true,
        message:
          newIncident.status === 'PENDING'
            ? 'Reporte enviado exitosamente. Será verificado por el equipo de Soporte Vial.'
            : 'Alerta vial publicada exitosamente en el mapa interactivo.',
        data: newIncident
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/incidents/:id
   * Actualiza el estado de un incidente (ej. PENDING -> ACTIVE_ALERT o RESOLVED)
   */
  updateIncidentStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, delayMinutes } = req.body || {};

      const incident = incidentsStore.get(id);
      if (!incident) {
        return res.status(404).json({
          success: false,
          error: { message: `No se encontró el incidente con ID ${id}.` }
        });
      }

      if (status) {
        incident.status = status;
      }
      if (delayMinutes !== undefined) {
        incident.delayMinutes = Number(delayMinutes);
      }
      incident.updatedAt = new Date().toISOString();

      incidentsStore.set(id, incident);

      res.status(200).json({
        success: true,
        message: `Incidente ${id} actualizado a estado "${incident.status}".`,
        data: incident
      });
    } catch (error) {
      next(error);
    }
  };
}
