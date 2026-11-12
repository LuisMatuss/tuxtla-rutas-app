import { pool } from '../db/postgresPool.js';

const toIncident = (row) => ({
  ...row,
  locationName: row.location_name,
  routeId: row.route_id,
  routeName: row.route_name,
  routeColor: row.route_color,
  delayMinutes: row.delay_minutes,
  reportedBy: row.reported_by,
  createdAt: row.created_at
});

export class PostgresIncidentRepository {
  /** @param {import('pg').Pool} [dbPool=pool] */
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data = {}) {
    const type = data.type || 'TRAFFIC';
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Se requieren coordenadas válidas (lat, lng) para guardar el incidente.');
    }

    const id = data.id || `inc-${Date.now()}`;
    const query = `INSERT INTO incidents
      (id, type, icon, title, description, lat, lng, location_name, route_id, route_name,
       route_color, delay_minutes, status, reported_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *`;
    const values = [
      id,
      type,
      data.icon || '⚠️',
      data.title || `Reporte vial: ${type}`,
      data.description ?? null,
      lat,
      lng,
      data.locationName || data.location_name || 'Tuxtla Gutiérrez',
      data.routeId || data.route_id || null,
      data.routeName || data.route_name || null,
      data.routeColor || data.route_color || '#2563EB',
      Number(data.delayMinutes || data.delay_minutes || 0),
      data.status || 'ACTIVE_ALERT',
      data.reportedBy || data.reported_by || 'App Web'
    ];

    try {
      const { rows: [row] } = await this.pool.query(query, values);
      return toIncident(row);
    } catch (err) {
      console.error('[POSTGRES_INCIDENT_ERROR]:', err);
      throw err;
    }
  }

  async findAll({ status, routeId } = {}) {
    const values = [];
    const filters = [];
    if (status) { values.push(status); filters.push(`status = $${values.length}`); }
    if (routeId) { values.push(routeId); filters.push(`route_id = $${values.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    try {
      const { rows } = await this.pool.query(
        `SELECT * FROM incidents ${where} ORDER BY created_at DESC`, values
      );
      return rows.map(toIncident);
    } catch (err) {
      console.error('[POSTGRES_INCIDENT_ERROR]:', err);
      throw err;
    }
  }

  async findActive() {
    try {
      const { rows } = await this.pool.query(
        `SELECT * FROM incidents WHERE status = 'ACTIVE_ALERT' ORDER BY created_at DESC`
      );
      return rows.map(toIncident);
    } catch (err) {
      console.error('[POSTGRES_INCIDENT_ERROR]:', err);
      throw err;
    }
  }

  async update(id, { status, delayMinutes, delay_minutes: delayMinutesSnake } = {}) {
    const values = [id];
    const updates = [];
    const delay = delayMinutes ?? delayMinutesSnake;
    if (status) { values.push(status); updates.push(`status = $${values.length}`); }
    if (delay !== undefined) { values.push(Number(delay)); updates.push(`delay_minutes = $${values.length}`); }
    if (!updates.length) return null;
    try {
      const { rows: [row] } = await this.pool.query(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`, values
      );
      return row ? toIncident(row) : null;
    } catch (err) {
      console.error('[POSTGRES_INCIDENT_ERROR]:', err);
      throw err;
    }
  }
}
