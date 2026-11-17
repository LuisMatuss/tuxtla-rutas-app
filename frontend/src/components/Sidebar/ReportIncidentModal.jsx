// Componente Modal: Reporte Ciudadano de Incidencias en Ruta / Parada (Paleta Colectivo Tuxtla)

import React, { useState, useEffect } from 'react';
import { X, Send, AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client.js';

const INCIDENT_CATEGORIES = [
  { id: 'CROWDED_UNIT', label: 'Combi Llena' },
  { id: 'HIGH_DELAY', label: 'Demora (+20 min)' },
  { id: 'ROAD_BLOCK', label: 'Calle Cerrada' },
  { id: 'HEAVY_TRAFFIC', label: 'Tráfico Severo' },
  { id: 'FLOODING', label: 'Encharcamiento' }
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

  useEffect(() => {
    if (!routeId && routes.length > 0) {
      setRouteId(routes[0].id);
    }
  }, [routes, routeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedCat = INCIDENT_CATEGORIES.find((c) => c.id === category);
      const selectedRoute = routes.find((r) => r.id === routeId);

      const lat = userLocation?.lat || 16.7516;
      const lng = userLocation?.lng || -93.1161;

      const res = await apiClient.reportIncident({
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
      if (onIncidentReported) onIncidentReported(res?.data || null);

      setTimeout(() => {
        setSuccess(false);
        setComment('');
        onClose();
      }, 1100);
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
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0F172A',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          padding: '18px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={17} color="#EF4444" />
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                margin: 0,
                fontSize: '15px',
                color: '#F8FAFC',
                fontWeight: 700
              }}
            >
              Reportar Incidencia Vial
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
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
              gap: '8px'
            }}
          >
            <CheckCircle2 size={28} color="#10B981" />
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#6EE7B7' }}>
              Reporte enviado al centro vial
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                Tipo de incidencia:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {INCIDENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '7px 8px',
                      background: category === cat.id ? 'rgba(2, 132, 199, 0.22)' : '#1E293B',
                      border: category === cat.id ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: category === cat.id ? '#7DD3FC' : '#CBD5E1',
                      fontSize: '12px',
                      fontWeight: category === cat.id ? 700 : 500,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="report-modal-route" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                Colectivo / Ruta:
              </label>
              <select
                id="report-modal-route"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                style={{
                  padding: '7px 8px',
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'inherit',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label htmlFor="report-modal-comment" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                Detalles (opcional):
              </label>
              <input
                id="report-modal-comment"
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Breve referencia o calle..."
                style={{
                  padding: '7px 8px',
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#A8B8CD', display: 'flex', alignItems: 'center', gap: '5px', fontVariantNumeric: 'tabular-nums' }}>
              <MapPin size={13} color="#EF4444" />
              <span>
                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Tuxtla Centro'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '9px',
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
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
                  padding: '9px',
                  background: '#F59E0B',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  color: '#0F172A',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
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
