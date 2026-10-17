// Middleware de Infraestructura: Manejador global centralizado de errores para la capa HTTP de Express
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Error interno del servidor';

  // Log de diagnóstico en entorno no productivo
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    console.error(`[Error ${statusCode}] ${req.method} ${req.url} - ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
};
