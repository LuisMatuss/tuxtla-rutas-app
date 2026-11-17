// Adaptador de Persistencia (Driven Adapter): Repositorio PostgreSQL para Incidentes y Alertas Viales (tuxtla_rutas_db)
// Incluye normalización automática de route_id (UUID legacy, códigos cortos o números -> r-001..r-012)
// y validación contra la tabla routes para evitar errores de llave foránea (23503 incidents_route_id_fkey).

import { pool } from '../db/postgresPool.js';
import { TUXTLA_ROUTES_SEED } from '../db/tuxtlaRoutesSeed.js';

// Mapas de resolución determinista hacia IDs canónicos de PostgreSQL (r-001 .. r-012)
const ROUTE_ALIAS_TO_PG_ID = new Map();
const CANONICAL_SEED_BY_PG_ID = new Map();

const SHORT_CODE_BY_INDEX = [
  ['1', '01', 'r-1', 'r-01', 'r-101', 'ruta 1'],
  ['a', 'r-a', 'ruta a'],
  ['43', 'r-43', 'ruta 43'],
  ['90', 'r-90', 'ruta 90'],
  ['58', 'r-58', 'ruta 58'],
  ['108', 'r-108', 'ruta 108'],
  ['115', 'r-115', 'ruta 115'],
  ['52', 'r-52', 'ruta 52'],
  ['30', 'r-30', 'ruta 30'],
  ['73', 'r-73', 'ruta 73'],
  ['51', 'r-51', 'ruta 51'],
  ['22', 'r-22', 'ruta 22']
];

TUXTLA_ROUTES_SEED.forEach((seed, idx) => {
  const pgId = `r-${String(idx + 1).padStart(3, '0')}`;
  const normalizedSeed = { ...seed, id: pgId, legacyId: seed.id };
  CANONICAL_SEED_BY_PG_ID.set(pgId, normalizedSeed);

  // Mapear ID canónico, UUID legacy (a0000001-0000-0000-0000-000000000001), índice y nombre
  ROUTE_ALIAS_TO_PG_ID.set(pgId.toLowerCase(), pgId);
  if (seed.id) {
    ROUTE_ALIAS_TO_PG_ID.set(String(seed.id).toLowerCase(), pgId);
  }
  ROUTE_ALIAS_TO_PG_ID.set(`r-${idx + 1}`, pgId);
  ROUTE_ALIAS_TO_PG_ID.set(String(idx + 1), pgId);
  if (seed.name) {
    ROUTE_ALIAS_TO_PG_ID.set(String(seed.name).toLowerCase().trim(), pgId);
  }

  const aliases = SHORT_CODE_BY_INDEX[idx] || [];
  for (const alias of aliases) {
    ROUTE_ALIAS_TO_PG_ID.set(alias.toLowerCase(), pgId);
  }
});

/**
 * Normaliza cualquier identificador de ruta (UUID legacy, código corto, número o ID PostgreSQL)
 * @param {string|null|undefined} rawRouteId
 * @param {string|null|undefined} [rawRouteName]
 * @returns {string|null}
 */
export function normalizeRouteId(rawRouteId, rawRouteName = null) {
  if (rawRouteId !== undefined && rawRouteId !== null && String(rawRouteId).trim() !== '') {
    const clean = String(rawRouteId).trim().toLowerCase();
    if (ROUTE_ALIAS_TO_PG_ID.has(clean)) {
      return ROUTE_ALIAS_TO_PG_ID.get(clean);
    }

    // Soportar formato UUID a00000XX-0000-0000-0000-0000000000XX
    const uuidMatch = clean.match(/^a0*(\d+)-0000-0000-0000-0*(\d+)$/i);
    if (uuidMatch) {
      const idx = parseInt(uuidMatch[1], 10);
      if (idx >= 1 && idx <= 12) {
        return `r-${String(idx).padStart(3, '0')}`;
      }
    }

    // Soportar formato r-XX
    const rMatch = clean.match(/^r-0*(\d+)$/i);
    if (rMatch) {
      const num = parseInt(rMatch[1], 10);
      if (num >= 1 && num <= 12) {
        return `r-${String(num).padStart(3, '0')}`;
      }
    }
  }

  if (rawRouteName && typeof rawRouteName === 'string') {
    const cleanName = rawRouteName.trim().toLowerCase();
    if (ROUTE_ALIAS_TO_PG_ID.has(cleanName)) {
      return ROUTE_ALIAS_TO_PG_ID.get(cleanName);
    }
    for (const [pgId, seed] of CANONICAL_SEED_BY_PG_ID.entries()) {
      if (seed.name && seed.name.toLowerCase().includes(cleanName)) {
        return pgId;
      }
    }
  }

  return rawRouteId ? String(rawRouteId).trim() : null;
}

/**
 * Formatea una fila de la tabla incidents con coordenadas numéricas y propiedades duales (camelCase + snake_case)
 */
export const toIncident = (row) => {
  if (!row) return null;

  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const delayMinutes = Number(row.delay_minutes ?? row.delayMinutes ?? 10);
  const routeId = row.route_id ?? row.routeId ?? null;
  const seedRoute = routeId ? CANONICAL_SEED_BY_PG_ID.get(routeId) : null;
  const routeName = row.route_name ?? row.routeName ?? seedRoute?.name ?? null;
  const routeColor = row.route_color ?? row.routeColor ?? seedRoute?.color ?? '#2563EB';
  const locationName = row.location_name ?? row.locationName ?? 'Tuxtla Gutiérrez';
  const reportedBy = row.reported_by ?? row.reportedBy ?? 'App Web';
  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const status = row.status || 'ACTIVE_ALERT';

  return {
    ...row,
    id: row.id,
    type: row.type || 'TRAFFIC',
    icon: row.icon || '⚠️',
    title: row.title || 'Reporte Vial',
    description: row.description || '',
    lat,
    lng,
    status,
    locationName,
    location_name: locationName,
    routeId,
    route_id: routeId,
    routeName,
    route_name: routeName,
    routeColor,
    route_color: routeColor,
    delayMinutes,
    delay_minutes: delayMinutes,
    reportedBy,
    reported_by: reportedBy,
    createdAt,
    created_at: createdAt
  };
};

export class PostgresIncidentRepository {
  /** @param {import('pg').Pool} [dbPool=pool] */
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  /**
   * Resuelve y garantiza que route_id exista en la tabla routes de PostgreSQL antes de insertar en incidents.
   * Si es una de las 12 rutas oficiales y aún no está en routes, la inserta; si no existe, hace fallback seguro a NULL.
   */
  async resolveDatabaseRoute(rawRouteId, rawRouteName, rawRouteColor) {
    const candidateId = normalizeRouteId(rawRouteId, rawRouteName);
    const seedMeta = candidateId ? CANONICAL_SEED_BY_PG_ID.get(candidateId) : null;

    if (!candidateId) {
      return {
        routeId: null,
        routeName: rawRouteName || null,
        routeColor: rawRouteColor || '#2563EB'
      };
    }

    try {
      // 1. Verificar si el candidateId ya existe en la tabla routes
      const existing = await this.pool.query(
        'SELECT id, name, color FROM routes WHERE id = $1 LIMIT 1;',
        [candidateId]
      );

      if (existing.rows.length > 0) {
        const dbRoute = existing.rows[0];
        return {
          routeId: dbRoute.id,
          routeName: rawRouteName || dbRoute.name || seedMeta?.name || null,
          routeColor: rawRouteColor || dbRoute.color || seedMeta?.color || '#2563EB'
        };
      }

      // 2. Si también pudiera estar guardada con el ID original sin normalizar, verificarlo
      if (rawRouteId && String(rawRouteId).trim() !== candidateId) {
        const byRaw = await this.pool.query(
          'SELECT id, name, color FROM routes WHERE id = $1 LIMIT 1;',
          [String(rawRouteId).trim()]
        );
        if (byRaw.rows.length > 0) {
          const dbRoute = byRaw.rows[0];
          return {
            routeId: dbRoute.id,
            routeName: rawRouteName || dbRoute.name || seedMeta?.name || null,
            routeColor: rawRouteColor || dbRoute.color || seedMeta?.color || '#2563EB'
          };
        }
      }

      // 3. Si corresponde a una de las 12 rutas base y falta en la tabla routes, sincronizarla en PostgreSQL
      if (seedMeta) {
        const geometryJson = JSON.stringify(
          seedMeta.geometry || { type: 'LineString', coordinates: [] }
        );
        await this.pool.query(
          `
          INSERT INTO routes (id, name, description, color, geometry, first_run, last_run, frequency_minutes, status)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            seedMeta.id,
            seedMeta.name,
            seedMeta.description || '',
            seedMeta.color || '#2563EB',
            geometryJson,
            seedMeta.scheduleInfo?.firstRun || '05:30',
            seedMeta.scheduleInfo?.lastRun || '22:30',
            Number(seedMeta.scheduleInfo?.frequencyMinutes || 6),
            seedMeta.scheduleInfo?.status || 'OPERATIONAL'
          ]
        );

        return {
          routeId: seedMeta.id,
          routeName: rawRouteName || seedMeta.name,
          routeColor: rawRouteColor || seedMeta.color || '#2563EB'
        };
      }

      // 4. Fallback seguro a NULL para que jamás falle con 23503 (incidents_route_id_fkey)
      return {
        routeId: null,
        routeName: rawRouteName || null,
        routeColor: rawRouteColor || '#2563EB'
      };
    } catch (err) {
      console.warn('[PostgresIncidentRepository] Fallback route_id a NULL por verificación:', err.message);
      return {
        routeId: null,
        routeName: rawRouteName || seedMeta?.name || null,
        routeColor: rawRouteColor || seedMeta?.color || '#2563EB'
      };
    }
  }

  async create(data = {}) {
    const type = data.type || 'TRAFFIC';
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Se requieren coordenadas válidas (lat, lng) para guardar el incidente.');
    }

    const rawRouteId = data.routeId ?? data.route_id ?? null;
    const rawRouteName = data.routeName ?? data.route_name ?? null;
    const rawRouteColor = data.routeColor ?? data.route_color ?? null;

    const resolvedRoute = await this.resolveDatabaseRoute(
      rawRouteId,
      rawRouteName,
      rawRouteColor
    );

    const id = data.id || `inc-${Date.now()}`;
    const query = `INSERT INTO incidents
      (id, type, icon, title, description, lat, lng, location_name, route_id, route_name,
       route_color, delay_minutes, status, reported_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        icon = EXCLUDED.icon,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        location_name = EXCLUDED.location_name,
        route_id = EXCLUDED.route_id,
        route_name = EXCLUDED.route_name,
        route_color = EXCLUDED.route_color,
        delay_minutes = EXCLUDED.delay_minutes,
        status = EXCLUDED.status,
        reported_by = EXCLUDED.reported_by
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
      resolvedRoute.routeId,
      resolvedRoute.routeName,
      resolvedRoute.routeColor,
      Number(data.delayMinutes ?? data.delay_minutes ?? 10),
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
    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    if (routeId) {
      const normalized = normalizeRouteId(routeId);
      values.push(normalized);
      filters.push(`route_id = $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    try {
      const { rows } = await this.pool.query(
        `SELECT * FROM incidents ${where} ORDER BY created_at DESC`,
        values
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
        `SELECT * FROM incidents WHERE status IN ('ACTIVE_ALERT', 'PENDING', 'ACTIVE') ORDER BY created_at DESC`
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
    if (status) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (delay !== undefined) {
      values.push(Number(delay));
      updates.push(`delay_minutes = $${values.length}`);
    }
    if (!updates.length) return null;
    try {
      const { rows: [row] } = await this.pool.query(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );
      return row ? toIncident(row) : null;
    } catch (err) {
      console.error('[POSTGRES_INCIDENT_ERROR]:', err);
      throw err;
    }
  }
}
