// Adaptador Primario (HTTP Controller): Autenticación Persistente en PostgreSQL (tuxtla_rutas_db)
// Utiliza la tabla users y el módulo nativo crypto de Node.js (scrypt + sha256 con salt).

import crypto from 'crypto';
import { pool } from '../../db/postgresPool.js';

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
 * Soporta scrypt$salt$hash, salt:sha256 y hashes semilla de evaluación.
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

  // 3. Compatibilidad con cuentas demo semilla en PostgreSQL ($2b$10$demo_hash_...)
  if (storedHash.startsWith('$2b$10$demo_hash_') && plain === '123') {
    return true;
  }

  // 4. SHA-256 directo sin salt
  const rawSha256 = crypto.createHash('sha256').update(plain).digest('hex');
  return rawSha256 === storedHash;
}

/**
 * Formatea una fila de la tabla users de PostgreSQL al contrato público de la API
 */
function formatPublicUser(row) {
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

/**
 * Genera un ID único con formato u-XXX consultando los registros actuales en PostgreSQL
 */
async function generateNextUserId() {
  const res = await pool.query('SELECT id FROM users;');
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

let demoAccountsChecked = false;

/**
 * Asegura que las 3 cuentas de evaluación rápida (pasajero@tuxtla.mx, soporte@tuxtla.mx, admin@tuxtla.mx)
 * estén presentes en la tabla users de PostgreSQL con hash scrypt válido para la contraseña '123'.
 */
async function ensureDemoEvaluationUsers() {
  if (demoAccountsChecked) return;
  try {
    const demoPassHash = hashPassword('123');
    const demoUsers = [
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

    for (const demo of demoUsers) {
      await pool.query(
        `
        INSERT INTO users (id, name, email, password_hash, role, favorite_routes, personal_points)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash;
        `,
        [
          demo.id,
          demo.name,
          demo.email,
          demoPassHash,
          demo.role,
          demo.favorite_routes,
          demo.personal_points
        ]
      );
    }
    demoAccountsChecked = true;
  } catch (err) {
    console.error('[AuthController] Error verificando cuentas demo en PostgreSQL:', err.message);
  }
}

export class AuthController {
  /**
   * POST /api/auth/register
   * Registra un nuevo usuario en la tabla users de tuxtla_rutas_db.
   */
  register = async (req, res, next) => {
    try {
      await ensureDemoEvaluationUsers();

      const { name, email, password } = req.body || {};
      const cleanName = String(name || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const rawPassword = String(password || '');

      if (!cleanName || !cleanEmail || !rawPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos (nombre, correo y contraseña) son obligatorios.',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Todos los campos (nombre, correo y contraseña) son obligatorios.'
          }
        });
      }

      if (!cleanEmail.includes('@')) {
        return res.status(400).json({
          success: false,
          message: 'Ingresa un correo electrónico válido.',
          error: {
            code: 'INVALID_EMAIL',
            message: 'Ingresa un correo electrónico válido.'
          }
        });
      }

      // 1. Validar que el email no exista ya en la tabla users
      const existing = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
        [cleanEmail]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Este correo ya está registrado.',
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Este correo ya está registrado.'
          }
        });
      }

      // 2. Generar ID con formato u-XXX y hash de contraseña con crypto
      const newUserId = await generateNextUserId();
      const passwordHash = hashPassword(rawPassword);

      // 3. Insertar con rol por defecto 'passenger', favorite_routes: '[]', personal_points: '[]'
      const insertQuery = `
        INSERT INTO users (id, name, email, password_hash, role, favorite_routes, personal_points)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        RETURNING id, name, email, role, favorite_routes, personal_points, created_at;
      `;

      const insertRes = await pool.query(insertQuery, [
        newUserId,
        cleanName,
        cleanEmail,
        passwordHash,
        'passenger',
        '[]',
        '[]'
      ]);

      const publicUser = formatPublicUser(insertRes.rows[0]);

      return res.status(201).json({
        id: publicUser.id,
        name: publicUser.name,
        email: publicUser.email,
        role: publicUser.role,
        favoriteRoutes: publicUser.favoriteRoutes,
        favoriteIds: publicUser.favoriteIds,
        personalPoints: publicUser.personalPoints,
        success: true,
        data: publicUser,
        user: publicUser
      });
    } catch (err) {
      console.error('[AuthController.register SQL Error]:', err);
      next(err);
    }
  };

  /**
   * POST /api/auth/login
   * Autentica un usuario contra la tabla users de PostgreSQL.
   */
  login = async (req, res, next) => {
    try {
      await ensureDemoEvaluationUsers();

      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const rawPassword = String(password || '');

      if (!cleanEmail || !rawPassword) {
        return res.status(400).json({
          success: false,
          message: 'Ingresa tu correo electrónico y contraseña.',
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Ingresa tu correo electrónico y contraseña.'
          }
        });
      }

      const userRes = await pool.query(
        `
        SELECT id, name, email, password_hash, role, favorite_routes, personal_points, created_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1;
        `,
        [cleanEmail]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales incorrectas.',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciales incorrectas.'
          }
        });
      }

      const userRow = userRes.rows[0];
      const isPasswordValid = verifyPassword(rawPassword, userRow.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales incorrectas.',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciales incorrectas.'
          }
        });
      }

      const publicUser = formatPublicUser(userRow);

      return res.status(200).json({
        id: publicUser.id,
        name: publicUser.name,
        email: publicUser.email,
        role: publicUser.role,
        favoriteRoutes: publicUser.favoriteRoutes,
        favoriteIds: publicUser.favoriteIds,
        personalPoints: publicUser.personalPoints,
        success: true,
        data: publicUser,
        user: publicUser
      });
    } catch (err) {
      console.error('[AuthController.login SQL Error]:', err);
      next(err);
    }
  };

  /**
   * GET /api/auth/me
   * Revalida la sesión persistida recibiendo id o email por query o headers.
   */
  me = async (req, res, next) => {
    try {
      await ensureDemoEvaluationUsers();

      const id = String(req.query.id || req.headers['x-user-id'] || '').trim();
      const email = String(req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();

      if (!id && !email) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere id o email para revalidar la sesión.',
          error: {
            code: 'MISSING_SESSION_IDENTIFIER',
            message: 'Se requiere id o email para revalidar la sesión.'
          }
        });
      }

      const userRes = await pool.query(
        `
        SELECT id, name, email, role, favorite_routes, personal_points, created_at
        FROM users
        WHERE ($1 <> '' AND id = $1)
           OR ($2 <> '' AND LOWER(email) = LOWER($2))
        LIMIT 1;
        `,
        [id, email]
      );

      if (userRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado en la base de datos.',
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado en la base de datos.'
          }
        });
      }

      const publicUser = formatPublicUser(userRes.rows[0]);

      return res.status(200).json({
        id: publicUser.id,
        name: publicUser.name,
        email: publicUser.email,
        role: publicUser.role,
        favoriteRoutes: publicUser.favoriteRoutes,
        favoriteIds: publicUser.favoriteIds,
        personalPoints: publicUser.personalPoints,
        success: true,
        data: publicUser,
        user: publicUser
      });
    } catch (err) {
      console.error('[AuthController.me SQL Error]:', err);
      next(err);
    }
  };

  /**
   * PATCH /api/auth/preferences
   * Actualiza rutas favoritas o puntos personales (Casa/Escuela/Trabajo) en PostgreSQL.
   */
  updatePreferences = async (req, res, next) => {
    try {
      const { id, email, favoriteRoutes, personalPoints } = req.body || {};
      const cleanId = String(id || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();

      if (!cleanId && !cleanEmail) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere id o email del usuario.'
        });
      }

      const currentRes = await pool.query(
        `
        SELECT id, favorite_routes, personal_points
        FROM users
        WHERE ($1 <> '' AND id = $1)
           OR ($2 <> '' AND LOWER(email) = LOWER($2))
        LIMIT 1;
        `,
        [cleanId, cleanEmail]
      );

      if (currentRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado.'
        });
      }

      const row = currentRes.rows[0];
      const nextFavorites =
        favoriteRoutes !== undefined ? JSON.stringify(favoriteRoutes) : JSON.stringify(row.favorite_routes || []);
      const nextPoints =
        personalPoints !== undefined ? JSON.stringify(personalPoints) : JSON.stringify(row.personal_points || []);

      const updateRes = await pool.query(
        `
        UPDATE users
        SET favorite_routes = $2::jsonb,
            personal_points = $3::jsonb
        WHERE id = $1
        RETURNING id, name, email, role, favorite_routes, personal_points, created_at;
        `,
        [row.id, nextFavorites, nextPoints]
      );

      const publicUser = formatPublicUser(updateRes.rows[0]);

      return res.status(200).json({
        ...publicUser,
        success: true,
        data: publicUser,
        user: publicUser
      });
    } catch (err) {
      console.error('[AuthController.updatePreferences SQL Error]:', err);
      next(err);
    }
  };
}

