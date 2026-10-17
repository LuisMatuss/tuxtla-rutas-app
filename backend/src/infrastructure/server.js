// Punto de entrada de la aplicación Express y arranque del servidor HTTP
// Regla: Configuración de middlewares, endpoints base, montaje de rutas en /api y errorHandler

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRouteRouter, createStopsRouter } from './web/routes/route.routes.js';
import { errorHandler } from './web/errorHandler.js';

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

// Manejador centralizado de errores
app.use(errorHandler);

// Arranque del servidor
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Tuxtla-Rutas Backend] Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

export default app;
