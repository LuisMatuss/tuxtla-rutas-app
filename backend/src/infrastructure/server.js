// Punto de entrada de la aplicación Express y arranque del servidor HTTP
// Regla: Configuración de middlewares, endpoints base, montaje de rutas en /api y errorHandler

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRouteRouter, createStopsRouter, createTripsRouter } from './web/routes/route.routes.js';
import { createAutomationRouter } from './web/routes/automation.routes.js';
import { createIncidentsRouter } from './web/routes/incident.routes.js';
import { createAuthRouter } from './web/routes/auth.routes.js';
import { errorHandler } from './web/errorHandler.js';
import { verifyDatabasePool } from './db/postgresPool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: false });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Verificación de estado (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tuxtla-rutas-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tuxtla-rutas-backend',
    timestamp: new Date().toISOString()
  });
});

// Montar rutas de la API bajo el prefijo /api
app.use('/api/routes', createRouteRouter());
app.use('/api/stops', createStopsRouter());
app.use('/api/trips', createTripsRouter());
app.use('/api/incidents', createIncidentsRouter());
app.use('/api/automation', createAutomationRouter());
app.use('/api/auth', createAuthRouter());


// Manejador centralizado de errores
app.use(errorHandler);

export let httpServer = null;

// Arranque del servidor
if (process.env.NODE_ENV !== 'test') {
  httpServer = app.listen(PORT, async () => {
    console.log(`[Tuxtla-Rutas Backend] Servidor ejecutándose en http://localhost:${PORT}`);
    await verifyDatabasePool();
  });
}

export default app;
