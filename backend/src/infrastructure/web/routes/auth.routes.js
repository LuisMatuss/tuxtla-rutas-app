// Definición de rutas HTTP para Autenticación y Sesiones en PostgreSQL (/api/auth)

import { Router } from 'express';
import { pool } from '../../db/postgresPool.js';
import { PostgresUserRepository } from '../../repositories/PostgresUserRepository.js';
import { AuthController } from '../controllers/AuthController.js';

export function createAuthRouter(dbPool = pool) {
  const router = Router();
  const repository = new PostgresUserRepository(dbPool);
  const controller = new AuthController(repository);

  // POST /api/auth/register -> Registro de nuevo usuario en PostgreSQL
  router.post('/register', controller.register);

  // POST /api/auth/login -> Inicio de sesión validando hash en PostgreSQL
  router.post('/login', controller.login);

  // GET /api/auth/me -> Revalidación ligera de sesión persistida (?id=... o ?email=...)
  router.get('/me', controller.me);

  // PATCH /api/auth/preferences -> Persistencia de rutas favoritas y puntos personales en PostgreSQL
  router.patch('/preferences', controller.updatePreferences);

  return router;
}
