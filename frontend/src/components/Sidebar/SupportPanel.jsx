// Componente de Consola: Panel Operativo de Soporte Vial (Zero-Slop, Apple Maps style)
import React, { useState } from 'react';
import { CheckCircle, Trash2, PlusCircle, Radio, Send, Check } from 'lucide-react';
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

  const handleVerify = async (id) => {
    try {
      await apiClient.updateIncidentStatus(id, { status: 'ACTIVE_ALERT' });
      onRefreshIncidents();
    } catch (err) {
      console.warn('Error al verificar reporte:', err);
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiClient.updateIncidentStatus(id, { status: 'RESOLVED' });
      onRefreshIncidents();
    } catch (err) {
      console.warn('Error al resolver incidente:', err);
    }
  };

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
        description: newDescription || 'Retrasos temporales reportados por centro vial.',
        lat,
        lng,
        routeId: newRouteId || null,
        delayMinutes: Number(newDelay),
        createdByRole: 'SUPPORT',
        locationName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      });

      setFeedbackMsg('✅ Alerta publicada en el mapa.');
      setNewTitle('');
      setNewDescription('');
      onRefreshIncidents();
    } catch (err) {
      setFeedbackMsg('❌ Error al publicar alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Selector de Pestañas (Chips) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          style={{
            padding: '7px 8px',
            background: activeTab === 'inbox' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: activeTab === 'inbox' ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
            borderRadius: '6px',
            color: activeTab === 'inbox' ? '#38bdf8' : '#94a3b8',
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
            padding: '7px 8px',
            background: activeTab === 'publisher' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: activeTab === 'publisher' ? '1px solid #d97706' : '1px solid var(--border-subtle)',
            borderRadius: '6px',
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

      {/* 1. BANDEJA DE REPORTES CIUDADANOS */}
      {activeTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
              POR VALIDAR ({pendingReports.length})
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              {activeAlerts.length} activas
            </span>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
              <CheckCircle size={22} color="#10b981" style={{ margin: '0 auto 6px auto' }} />
              <div>Sin reportes pendientes de validar.</div>
            </div>
          ) : (
            pendingReports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{report.icon || '⚠️'}</span>
                    <strong style={{ fontSize: '12px', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.title}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      +{report.delayMinutes}m
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {report.routeName || 'Ruta'} &bull; {report.locationName || 'Tuxtla'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleVerify(report.id)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      borderRadius: '4px',
                      color: '#34d399',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Check size={12} />
                    <span>Publicar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResolve(report.id)}
                    style={{
                      padding: '4px 6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '4px',
                      color: '#f87171',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Alertas Activas en Mapa */}
          {activeAlerts.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                ALERTAS ACTIVAS ({activeAlerts.length})
              </span>

              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span>{alert.icon || '⚠️'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {alert.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#fbbf24' }}>+{alert.delayMinutes}m</span>
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
                      fontSize: '12px',
                      cursor: 'pointer',
                      flexShrink: 0
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

      {/* 2. PUBLICADOR DE ALERTAS VIALES */}
      {activeTab === 'publisher' && (
        <form onSubmit={handleSubmitAlert} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {feedbackMsg && (
            <div style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', color: '#f8fafc' }}>
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>TIPO:</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value="ROAD_BLOCK">🚧 Bloqueo Vial</option>
              <option value="HEAVY_TRAFFIC">🚗 Tráfico Pesado</option>
              <option value="HEAVY_RAIN">🌧️ Lluvia Fuerte</option>
              <option value="ROAD_WORK">🔧 Obra Pública</option>
              <option value="ACCIDENT">⚠️ Percance Vial</option>
              <option value="CROWDED_BUS">🚐 Demanda Alta</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RUTA:</label>
            <select
              value={newRouteId}
              onChange={(e) => setNewRouteId(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value="">Todas las Rutas</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RETRASO:</label>
            <select
              value={newDelay}
              onChange={(e) => setNewDelay(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            >
              <option value={5}>+5 min</option>
              <option value={10}>+10 min</option>
              <option value={15}>+15 min</option>
              <option value={20}>+20 min</option>
              <option value={30}>+30 min</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>TÍTULO:</label>
            <input
              type="text"
              placeholder="Ej. Reducción de carril en Libramiento Sur"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            />
          </div>

          {/* Selector de coordenada en mapa */}
          <div
            style={{
              padding: '6px 8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {pickedCoordinate
                ? `📍 ${pickedCoordinate.lat.toFixed(4)}, ${pickedCoordinate.lng.toFixed(4)}`
                : '📍 Centro de Tuxtla'}
            </span>
            <button
              type="button"
              onClick={() => onPickCoordinateOnMap('incident')}
              style={{
                background: pickingTarget === 'incident' ? '#d97706' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {pickingTarget === 'incident' ? 'Toca mapa...' : 'Fijar mapa'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '8px',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
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
            <span>{submitting ? 'Publicando...' : 'Publicar Alerta'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
