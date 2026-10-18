// Componente Modal: Reporte Ciudadano de Incidencias en Ruta / Parada (Zero-Slop, Apple Maps style)
import React, { useState } from 'react';
import { X, Send, AlertTriangle, MapPin } from 'lucide-react';
import { apiClient } from '../../api/client.js';

const INCIDENT_CATEGORIES = [
  { id: 'CROWDED_UNIT', label: '🚐 Combi Llena', icon: '🚐' },
  { id: 'HIGH_DELAY', label: '⏳ Demora (+20 min)', icon: '⏳' },
  { id: 'ROAD_BLOCK', label: '🚧 Calle Cerrada', icon: '🚧' },
  { id: 'HEAVY_TRAFFIC', label: '🚗 Tráfico Severo', icon: '🚗' },
  { id: 'FLOODING', label: '🌧️ Encharcamiento', icon: '🌧️' }
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
        description: comment.trim() || 'Reporte de incidencia enviado por pasajero.',
        lat,
        lng,
        routeId: routeId || null,
        delayMinutes: category === 'HIGH_DELAY' ? 20 : 10,
        createdByRole: 'USER',
        locationName: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      });

      setSuccess(true);
      if (onIncidentReported) onIncidentReported();

      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('Error al enviar reporte:', err);
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '420px',
          background: 'rgba(15, 23, 42, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '16px',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>
              Reportar Incidencia
            </h3>
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
              padding: '20px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div style={{ fontSize: '32px' }}>✅</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
              Reporte enviado
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Categoría (Chips) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                INCIDENCIA:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {INCIDENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '6px 8px',
                      background: category === cat.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                      border: category === cat.id ? '1px solid #38bdf8' : '1px solid transparent',
                      borderRadius: '6px',
                      color: category === cat.id ? '#38bdf8' : '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: category === cat.id ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ruta Afectada */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                COLECTIVO / RUTA:
              </label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                style={{
                  padding: '7px 8px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
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

            {/* Comentario Breve */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                DETALLES (OPCIONAL):
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Breve referencia o ubicación..."
                style={{
                  padding: '7px 8px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Ubicación */}
            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="#94a3b8" />
              <span>
                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Tuxtla Centro'}
              </span>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
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
                  padding: '8px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Send size={13} />
                <span>{submitting ? 'Enviando...' : 'Enviar Reporte'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
