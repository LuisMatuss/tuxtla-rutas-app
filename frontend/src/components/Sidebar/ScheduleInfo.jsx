// Componente de Panel Lateral: Visualización de horarios de operación, frecuencias y detalles de la ruta
import React from 'react';

export function ScheduleInfo({ route }) {
  if (!route) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
        Selecciona una ruta para consultar horarios y frecuencias.
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Horarios y Servicio</h3>
      <p style={{ fontSize: '13px' }}>
        <strong>Horario:</strong> {route.scheduleStart} - {route.scheduleEnd}
      </p>
      <p style={{ fontSize: '13px' }}>
        <strong>Frecuencia aprox.:</strong> cada {route.frequencyMinutes} min
      </p>
    </div>
  );
}
