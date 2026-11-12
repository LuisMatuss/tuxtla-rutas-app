// Adaptador Primario (HTTP Controller): Gestión de Incidentes Viales y Reportes Ciudadanos
// Permite a los usuarios reportar contingencias y al personal de Soporte Vial verificar y publicarlas

import { randomUUID } from 'crypto';
import { TUXTLA_ROUTES_SEED } from '../../db/tuxtlaRoutesSeed.js';
import { pool } from '../../db/postgresPool.js';

const routesById = new Map();
TUXTLA_ROUTES_SEED.forEach((r, idx) => {
  const pgId = `r-${String(idx + 1).padStart(3, '0')}`;
  const normalized = { ...r, id: pgId };
  routesById.set(pgId, normalized);
  routesById.set(r.id, normalized);
});

const INCIDENT_COLUMNS = `id, type, icon, title, description, lat, lng,
  location_name AS "locationName", route_id AS "routeId", route_name AS "routeName",
  route_color AS "routeColor", delay_minutes AS "delayMinutes", status,
  reported_by AS "reportedBy", created_at AS "createdAt"`;

export class IncidentController {
  /**
   * Obtiene alertas activas desde PostgreSQL para integraciones internas (ej. TelegramBotService)
   */
  listActiveIncidents = async () => {
    const { rows } = await pool.query(
      `SELECT ${INCIDENT_COLUMNS} FROM incidents WHERE status = 'ACTIVE_ALERT' ORDER BY created_at DESC`
    );
    return rows;
  };

  /**
   * GET /api/incidents
   * Retorna los incidentes viales registrados (filtrables por ?status=)
   */
  getIncidents = async (req, res, next) => {
    try {
      const { status, routeId } = req.query;
      const values = [];
      const filters = [];
      if (status) { values.push(status); filters.push(`status = $${values.length}`); }
      if (routeId) { values.push(routeId); filters.push(`route_id = $${values.length}`); }
      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const { rows: items } = await pool.query(
        `SELECT ${INCIDENT_COLUMNS} FROM incidents ${where} ORDER BY created_at DESC`, values
      );

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

      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({
          success: false,
          error: { message: 'Se requieren coordenadas válidas (lat, lng).' }
        });
      }

      const id = `inc-${randomUUID()}`;
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

      const status = createdByRole === 'USER' ? 'PENDING' : 'ACTIVE_ALERT';
      const query = `INSERT INTO incidents
        (id, type, icon, title, description, lat, lng, location_name, route_id, route_name,
         route_color, delay_minutes, status, reported_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING ${INCIDENT_COLUMNS}`;
      const { rows: [newIncident] } = await pool.query(query, [
        id, type, iconMap[type] || '⚠️', title || `Reporte vial: ${type}`,
        description || 'Incidente vial reportado en vía pública.', Number(lat), Number(lng),
        locationName || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
        routeId || null, route ? route.name : 'Vía General / Multiruta',
        route ? route.color : '#64748b', Number(delayMinutes) || 10, status,
        createdByRole === 'USER' ? 'Reporte Ciudadano' : 'Soporte Vial Tuxtla'
      ]);

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

      const values = [id];
      const updates = [];
      if (status) { values.push(status); updates.push(`status = $${values.length}`); }
      if (delayMinutes !== undefined) { values.push(Number(delayMinutes)); updates.push(`delay_minutes = $${values.length}`); }
      if (!updates.length) return res.status(400).json({ success: false, error: { message: 'No hay cambios para aplicar.' } });
      const { rows: [incident] } = await pool.query(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = $1 RETURNING ${INCIDENT_COLUMNS}`,
        values
      );
      if (!incident) return res.status(404).json({ success: false, error: { message: `No se encontró el incidente con ID ${id}.` } });

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
