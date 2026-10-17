// Componente Modal: Reporte Ciudadano de Incidencias en Ruta / Parada
// Permite a los pasajeros notificar combis llenas, demoras altas, bloqueos o lluvia

import React, { useState } from 'react';
import { X, Send, AlertTriangle, Bus, MessageSquare, MapPin } from 'lucide-react';
import { apiClient } from '../../api/client.js';

const INCIDENT_CATEGORIES = [
  { id: 'CROWDED_UNIT', label: '🚐 Combi Llena / Sin Espacio', icon: '🚐' },
  { id: 'HIGH_DELAY', label: '⏳ Demora Excesiva (+20 min)', icon: '⏳' },
  { id: 'ROAD_BLOCK', label: '🚧 Calle Cerrada / Bloqueo', icon: '🚧' },
  { id: 'HEAVY_TRAFFIC', label: '🚗 Tráfico Severo', icon: '🚗' },
  { id: 'FLOODING', label: '🌧️ Encharcamiento / Lluvia', icon: '🌧️' }
];

export function ReportIncidentModal({
  isOpen,
  onClose,
  routes = [],
  userLocation,
  onIncidentReported
}) {
  const [category, setCategory] = useState('CROWDED_UNIT');
  const [routeId, setRouteId] = useState(routes[0]?.id || '');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedCat = INCIDENT_CATEGORIES.find((c) => c.id === category);
      const selectedRoute = routes.find((r) => r.id === routeId);

      const lat = userLocation?.lat || 16.7516;
      const lng = userLocation?.lng || -93.1161;

      await apiClient.reportIncident({
        type: category,
        title: `${selectedCat?.label || 'Reporte'}: ${selectedRoute?.name || 'Ruta'}`,
        description: comment.trim() || 'Reporte de incidencia enviado por pasajero en ruta.',
        lat,
        lng,
        routeId: routeId || null,
        delayMinutes: category === 'HIGH_DELAY' ? 20 : 10,
        createdByRole: 'USER',
        locationName: `Ubicación reportada (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      });

      setSuccess(true);
      if (onIncidentReported) onIncidentReported();

      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1400);
    } catch (err) {
      console.warn('Error al enviar reporte ciudadano:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                Reportar Incidencia Vial
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Tu reporte llegará al centro de Soporte Vial de Tuxtla
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '36px' }}>✅</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#34d399' }}>
              ¡Reporte enviado exitosamente!
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Soporte Vial revisará la incidencia para alertar a otros usuarios.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Categoría */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                ¿QUÉ SUCEDE EN EL TRAYECTO?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {INCIDENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '8px 12px',
                      background: category === cat.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                      border: category === cat.id ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: category === cat.id ? '#93c5fd' : '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: category === cat.id ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ruta Afectada */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                RUTA O COLECTIVO AFECTADO:
              </label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Comentario Adicional */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                DETALLES ADICIONALES (OPCIONAL):
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ej. La unidad no se detuvo en la esquina de la 5ª Norte porque venía sin cupo..."
                rows={2}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                  resize: 'none'
                }}
              />
            </div>

            {/* Coordenada de referencia */}
            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="#94a3b8" />
              <span>
                Ubicación del reporte: {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Tuxtla Centro'}
              </span>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                <Send size={14} />
                <span>{submitting ? 'Enviando reporte...' : 'Enviar Reporte a Soporte'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
