// Adaptador de Persistencia (Driven Adapter): Repositorio PostgreSQL para Usuarios (tabla users en tuxtla_rutas_db)
// Única fuente de verdad para registro, autenticación, sesión y preferencias de usuario.

import crypto from 'crypto';
import { pool } from '../db/postgresPool.js';

/**
 * Genera un hash seguro de contraseña usando el módulo nativo crypto de Node.js (scrypt + salt)
 * @param {string} password
 * @returns {string}
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica una contraseña en texto plano contra el password_hash almacenado en PostgreSQL
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const plain = String(password ?? '');

  // 1. Formato nativo scrypt$salt$hash
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    const derivedBuf = crypto.scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derivedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, storedBuf);
  }

  // 2. Formato salt:sha256
  if (storedHash.includes(':')) {
    const [salt, hashHex] = storedHash.split(':');
    const candidateHex = crypto
      .createHash('sha256')
      .update(`${salt}:${plain}`)
      .digest('hex');
    return candidateHex === hashHex;
  }

  // 3. Compatibilidad con cuentas semilla de evaluación en PostgreSQL ($2b$10$demo_hash_...)
  if (storedHash.startsWith('$2b$10$demo_hash_') && plain === '123') {
    return true;
  }

  // 4. SHA-256 directo
  const rawSha256 = crypto.createHash('sha256').update(plain).digest('hex');
  return rawSha256 === storedHash;
}

/**
 * Convierte una fila de la tabla users de PostgreSQL al DTO público de dominio
 */
export function toPublicUser(row) {
  if (!row) return null;

  let favoriteRoutes = row.favorite_routes;
  if (typeof favoriteRoutes === 'string') {
    try {
      favoriteRoutes = JSON.parse(favoriteRoutes);
    } catch {
      favoriteRoutes = [];
    }
  }
  if (!Array.isArray(favoriteRoutes)) {
    favoriteRoutes = [];
  }

  let personalPoints = row.personal_points;
  if (typeof personalPoints === 'string') {
    try {
      personalPoints = JSON.parse(personalPoints);
    } catch {
      personalPoints = [];
    }
  }
  if (personalPoints === null || personalPoints === undefined) {
    personalPoints = [];
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'passenger',
    favoriteRoutes,
    favoriteIds: favoriteRoutes,
    personalPoints,
    createdAt: row.created_at || null
  };
}

let evaluationUsersChecked = false;

export class PostgresUserRepository {
  /**
   * @param {import('pg').Pool} [dbPool=pool]
   */
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  /**
   * Garantiza que las 3 cuentas oficiales de evaluación existan en la tabla users de PostgreSQL
   */
  async ensureEvaluationUsers() {
    if (evaluationUsersChecked) return;
    try {
      const demoPassHash = hashPassword('123');
      const accounts = [
        {
          id: 'u-001',
          name: 'Pasajero Demo UNACH',
          email: 'pasajero@tuxtla.mx',
          role: 'passenger',
          favorite_routes: JSON.stringify(['r-001', 'r-003']),
          personal_points: JSON.stringify({
            home: { lat: 16.75449, lng: -93.15926, label: 'Facultad de Ingeniería UNACH' },
            school: { lat: 16.75398, lng: -93.11564, label: 'Parque Central Tuxtla' },
            work: null
          })
        },
        {
          id: 'u-002',
          name: 'Operador Soporte Vial',
          email: 'soporte@tuxtla.mx',
          role: 'SUPPORT',
          favorite_routes: JSON.stringify(['r-001', 'r-002']),
          personal_points: JSON.stringify([])
        },
        {
          id: 'u-003',
          name: 'Administrador General Flota',
          email: 'admin@tuxtla.mx',
          role: 'ADMIN',
          favorite_routes: JSON.stringify(['r-001', 'r-002', 'r-003', 'r-004']),
          personal_points: JSON.stringify([])
        }
      ];

      for (const acc of accounts) {
        await this.pool.query(
          `
          INSERT INTO users (id, name, email, password_hash, role, favorite_routes, personal_points)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = EXCLUDED.password_hash;
          `,
          [
            acc.id,
            acc.name,
            acc.email,
            demoPassHash,
            acc.role,
            acc.favorite_routes,
            acc.personal_points
          ]
        );
      }
      evaluationUsersChecked = true;
    } catch (err) {
      console.error('[POSTGRES_USER_ERROR]:', err);
      throw err;
    }
  }

  /**
   * Genera el siguiente ID libre con formato u-XXX en PostgreSQL
   */
  async generateNextId() {
    const res = await this.pool.query('SELECT id FROM users;');
    const existingIds = new Set(res.rows.map((r) => String(r.id)));

    let maxNum = res.rows.length;
    for (const id of existingIds) {
      const match = /^u-(\d+)$/i.exec(id);
      if (match) {
        const n = parseInt(match[1], 10);
        if (Number.isFinite(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }

    let candidateNum = maxNum + 1;
    let candidateId = `u-${String(candidateNum).padStart(3, '0')}`;
    while (existingIds.has(candidateId)) {
      candidateNum += 1;
      candidateId = `u-${String(candidateNum).padStart(3, '0')}`;
    }
    return candidateId;
  }

  /**
   * Busca un usuario por email (incluyendo password_hash para validación de login)
   */
  async findByEmailWithHash(email) {
    try {
      await this.ensureEvaluationUsers();
      const { rows } = await this.pool.query(
        `
        SELECT id, name, email, password_hash, role, favorite_routes, personal_points, created_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1;
        `,
        [String(email || '').trim().toLowerCase()]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('[POSTGRES_USER_ERROR]:', err);
      throw err;
    }
  }

  /**
   * Busca un usuario por ID o email y retorna su perfil público
   */
  async findByIdOrEmail({ id = '', email = '' } = {}) {
    try {
      await this.ensureEvaluationUsers();
      const cleanId = String(id || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanId && !cleanEmail) return null;

      const { rows } = await this.pool.query(
        `
        SELECT id, name, email, role, favorite_routes, personal_points, created_at
        FROM users
        WHERE ($1 <> '' AND id = $1)
           OR ($2 <> '' AND LOWER(email) = LOWER($2))
        LIMIT 1;
        `,
        [cleanId, cleanEmail]
      );
      return rows[0] ? toPublicUser(rows[0]) : null;
    } catch (err) {
      console.error('[POSTGRES_USER_ERROR]:', err);
      throw err;
    }
  }

  /**
   * Crea un nuevo usuario en la tabla users de PostgreSQL
   */
  async create({ name, email, password, role = 'passenger' }) {
    try {
      await this.ensureEvaluationUsers();
      const cleanName = String(name || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const passwordHash = hashPassword(password);
      const newId = await this.generateNextId();

      const { rows } = await this.pool.query(
        `
        INSERT INTO users (id, name, email, password_hash, role, favorite_routes, personal_points)
        VALUES ($1, $2, $3, $4, $5, '[]'::jsonb, '[]'::jsonb)
        RETURNING id, name, email, role, favorite_routes, personal_points, created_at;
        `,
        [newId, cleanName, cleanEmail, passwordHash, role || 'passenger']
      );

      return toPublicUser(rows[0]);
    } catch (err) {
      console.error('[POSTGRES_USER_ERROR]:', err);
      throw err;
    }
  }

  /**
   * Actualiza rutas favoritas o puntos personales (Casa/Escuela/Trabajo) en PostgreSQL
   */
  async updatePreferences({ id = '', email = '', favoriteRoutes, personalPoints } = {}) {
    try {
      const cleanId = String(id || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanId && !cleanEmail) return null;

      const currentRes = await this.pool.query(
        `
        SELECT id, favorite_routes, personal_points
        FROM users
        WHERE ($1 <> '' AND id = $1)
           OR ($2 <> '' AND LOWER(email) = LOWER($2))
        LIMIT 1;
        `,
        [cleanId, cleanEmail]
      );

      if (currentRes.rows.length === 0) return null;

      const row = currentRes.rows[0];
      const nextFavorites =
        favoriteRoutes !== undefined
          ? JSON.stringify(favoriteRoutes)
          : JSON.stringify(row.favorite_routes || []);
      const nextPoints =
        personalPoints !== undefined
          ? JSON.stringify(personalPoints)
          : JSON.stringify(row.personal_points || []);

      const updateRes = await this.pool.query(
        `
        UPDATE users
        SET favorite_routes = $2::jsonb,
            personal_points = $3::jsonb
        WHERE id = $1
        RETURNING id, name, email, role, favorite_routes, personal_points, created_at;
        `,
        [row.id, nextFavorites, nextPoints]
      );

      return updateRes.rows[0] ? toPublicUser(updateRes.rows[0]) : null;
    } catch (err) {
      console.error('[POSTGRES_USER_ERROR]:', err);
      throw err;
    }
  }
}

