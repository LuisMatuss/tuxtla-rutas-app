// Componente de Consola: Panel Operativo de Soporte Vial
// Gestión de reportes ciudadanos y publicación de alertas viales en tiempo real

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Trash2, MapPin, PlusCircle, Radio, Send, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export function SupportPanel({
  routes = [],
  incidents = [],
  onRefreshIncidents,
  onPickCoordinateOnMap,
  pickingTarget,
  pickedCoordinate
}) {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'publisher'

  // Formulario para nueva alerta vial
  const [newType, setNewType] = useState('ROAD_BLOCK');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRouteId, setNewRouteId] = useState(routes[0]?.id || '');
  const [newDelay, setNewDelay] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const pendingReports = incidents.filter((i) => i.status === 'PENDING');
  const activeAlerts = incidents.filter((i) => i.status === 'ACTIVE_ALERT');

  // Verificar y publicar alerta
  const handleVerify = async (id) => {
    try {
      await apiClient.updateIncidentStatus(id, { status: 'ACTIVE_ALERT' });
      onRefreshIncidents();
    } catch (err) {
      console.warn('Error al verificar reporte:', err);
    }
  };

  // Descartar o resolver
  const handleResolve = async (id) => {
    try {
      await apiClient.updateIncidentStatus(id, { status: 'RESOLVED' });
      onRefreshIncidents();
    } catch (err) {
      console.warn('Error al resolver incidente:', err);
    }
  };

  // Enviar alerta oficial de soporte
  const handleSubmitAlert = async (e) => {
    e.preventDefault();
    const lat = pickedCoordinate?.lat || 16.7516;
    const lng = pickedCoordinate?.lng || -93.1161;

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const selectedRoute = routes.find((r) => r.id === newRouteId);
      await apiClient.reportIncident({
        type: newType,
        title: newTitle || `Alerta Vial en ${selectedRoute?.name || 'Tuxtla'}`,
        description: newDescription || 'Retrasos temporales reportados por centro de monitoreo vial.',
        lat,
        lng,
        routeId: newRouteId || null,
        delayMinutes: Number(newDelay),
        createdByRole: 'SUPPORT',
        locationName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });

      setFeedbackMsg('✅ Alerta publicada exitosamente en el mapa.');
      setNewTitle('');
      setNewDescription('');
      onRefreshIncidents();
    } catch (err) {
      setFeedbackMsg('❌ Error al publicar alerta vial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de Pestañas de Soporte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          style={{
            padding: '8px',
            background: activeTab === 'inbox' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.5)',
            border: activeTab === 'inbox' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: activeTab === 'inbox' ? '#93c5fd' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Radio size={14} />
          <span>Reportes ({pendingReports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('publisher')}
          style={{
            padding: '8px',
            background: activeTab === 'publisher' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(30, 41, 59, 0.5)',
            border: activeTab === 'publisher' ? '1px solid #d97706' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: activeTab === 'publisher' ? '#fbbf24' : '#94a3b8',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <PlusCircle size={14} />
          <span>Publicar Alerta</span>
        </button>
      </div>

      {/* PESTAÑA 1: BANDEJA DE REPORTES CIUDADANOS */}
      {activeTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>
              Reportes por Validar ({pendingReports.length})
            </span>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              {activeAlerts.length} alertas activas en mapa
            </span>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px' }}>
              <CheckCircle size={28} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
              <div>No hay reportes ciudadanos pendientes de validación.</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                La red de transporte en Tuxtla Gutiérrez opera sin contingencias reportadas.
              </div>
            </div>
          ) : (
            pendingReports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{report.icon || '⚠️'}</span>
                    <strong style={{ fontSize: '12px', color: '#f8fafc' }}>{report.title}</strong>
                  </div>
                  <span style={{ fontSize: '10px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    +{report.delayMinutes} min
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {report.description}
                </p>

                <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {report.locationName || `${report.lat?.toFixed(4)}, ${report.lng?.toFixed(4)}`}</span>
                  <span>{report.routeName}</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleVerify(report.id)}
                    style={{
                      flex: 1,
                      padding: '5px',
                      background: 'rgba(16, 185, 129, 0.25)',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      color: '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle size={12} />
                    <span>Publicar en Mapa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResolve(report.id)}
                    style={{
                      padding: '5px 10px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Descartar</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Alertas actualmente activas en el mapa */}
          {activeAlerts.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                🚨 Alertas Activas en Mapa ({activeAlerts.length})
              </div>

              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px' }}>{alert.icon || '⚠️'}</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>{alert.title}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{alert.routeName} (+{alert.delayMinutes} min)</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleResolve(alert.id)}
                    style={{
                      padding: '3px 8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: '#94a3b8',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Resolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: PUBLICADOR DE ALERTAS VIALES */}
      {activeTab === 'publisher' && (
        <form onSubmit={handleSubmitAlert} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {feedbackMsg && (
            <div style={{ padding: '8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', color: '#f8fafc' }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>TIPO DE INCIDENTE:</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              style={{
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value="ROAD_BLOCK">🚧 Bloqueo Vial / Manifestación</option>
              <option value="HEAVY_TRAFFIC">🚗 Tráfico Pesado / Congestión</option>
              <option value="HEAVY_RAIN">🌧️ Lluvia Fuerte / Encharcamiento</option>
              <option value="ROAD_WORK">🔧 Obra Pública / Desvío</option>
              <option value="ACCIDENT">⚠️ Percance Vial</option>
              <option value="CROWDED_BUS">🚐 Demanda Alta de Pasaje</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>RUTA AFECTADA:</label>
            <select
              value={newRouteId}
              onChange={(e) => setNewRouteId(e.target.value)}
              style={{
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value="">Todas las Rutas / Corredor General</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>RETRASO ESTIMADO:</label>
            <select
              value={newDelay}
              onChange={(e) => setNewDelay(e.target.value)}
              style={{
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value={5}>+5 minutos de demora</option>
              <option value={10}>+10 minutos de demora</option>
              <option value={15}>+15 minutos de demora</option>
              <option value={20}>+20 minutos de demora</option>
              <option value={30}>+30 minutos de demora crítica</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>TÍTULO DE LA ALERTA:</label>
            <input
              type="text"
              placeholder="Ej. Reducción de carril en Libramiento Sur"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>DESCRIPCIÓN OPERATIVA:</label>
            <textarea
              rows={2}
              placeholder="Detalles para los pasajeros y operadores..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                resize: 'none'
              }}
            />
          </div>

          {/* Selector de coordenada en mapa */}
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {pickedCoordinate
                ? `📍 Coordenada: ${pickedCoordinate.lat.toFixed(4)}, ${pickedCoordinate.lng.toFixed(4)}`
                : '📍 Ubicación: Parque Central (por defecto)'}
            </span>
            <button
              type="button"
              onClick={() => onPickCoordinateOnMap('incident')}
              style={{
                background: pickingTarget === 'incident' ? '#d97706' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {pickingTarget === 'incident' ? 'Haz clic en mapa...' : 'Fijar en mapa'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '9px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
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
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
            }}
          >
            <Send size={13} />
            <span>{submitting ? 'Publicando...' : 'Publicar Alerta Vial'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
