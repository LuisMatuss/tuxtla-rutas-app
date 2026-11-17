// Adaptador Primario (HTTP Controller): Autenticación Persistente en PostgreSQL (tuxtla_rutas_db)
// Delega todas las operaciones de persistencia al repositorio PostgresUserRepository.

import {
  PostgresUserRepository,
  hashPassword,
  verifyPassword,
  toPublicUser
} from '../../repositories/PostgresUserRepository.js';

export { hashPassword, verifyPassword };

export class AuthController {
  /**
   * @param {PostgresUserRepository} [userRepository]
   */
  constructor(userRepository = new PostgresUserRepository()) {
    this.userRepository = userRepository;
  }

  /**
   * POST /api/auth/register
   * Registra un nuevo usuario en la tabla users de tuxtla_rutas_db.
   */
  register = async (req, res, next) => {
    try {
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

      const existing = await this.userRepository.findByEmailWithHash(cleanEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Este correo ya está registrado.',
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Este correo ya está registrado.'
          }
        });
      }

      const publicUser = await this.userRepository.create({
        name: cleanName,
        email: cleanEmail,
        password: rawPassword,
        role: 'passenger'
      });

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
      next(err);
    }
  };

  /**
   * POST /api/auth/login
   * Autentica un usuario contra la tabla users de PostgreSQL.
   */
  login = async (req, res, next) => {
    try {
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

      const userRow = await this.userRepository.findByEmailWithHash(cleanEmail);
      if (!userRow || !verifyPassword(rawPassword, userRow.password_hash)) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales incorrectas.',
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciales incorrectas.'
          }
        });
      }

      const publicUser = toPublicUser(userRow);

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
      next(err);
    }
  };

  /**
   * GET /api/auth/me
   * Revalida la sesión persistida recibiendo id o email por query o headers.
   */
  me = async (req, res, next) => {
    try {
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

      const publicUser = await this.userRepository.findByIdOrEmail({ id, email });
      if (!publicUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado en la base de datos.',
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado en la base de datos.'
          }
        });
      }

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

      const publicUser = await this.userRepository.updatePreferences({
        id: cleanId,
        email: cleanEmail,
        favoriteRoutes,
        personalPoints
      });

      if (!publicUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado.'
        });
      }

      return res.status(200).json({
        ...publicUser,
        success: true,
        data: publicUser,
        user: publicUser
      });
    } catch (err) {
      next(err);
    }
  };
}
