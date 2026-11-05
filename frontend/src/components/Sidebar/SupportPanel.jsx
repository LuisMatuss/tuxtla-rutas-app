// Componente de Consola: Panel Operativo de Soporte Vial (Paleta Colectivo Tuxtla, Cero nested-cards)

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  Trash2,
  PlusCircle,
  Radio,
  Send,
  Check,
  MessageSquare,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { apiClient } from '../../api/client.js';

function formatLogTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function SupportPanel({
  routes = [],
  incidents = [],
  onRefreshIncidents,
  onPickCoordinateOnMap,
  pickingTarget,
  pickedCoordinate
}) {
  const [activeTab, setActiveTab] = useState('inbox');

  const [newType, setNewType] = useState('ROAD_BLOCK');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRouteId, setNewRouteId] = useState(routes[0]?.id || '');
  const [newDelay, setNewDelay] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const [botActivity, setBotActivity] = useState({
    connected: false,
    botUsername: null,
    totalProcessed: 0,
    logs: []
  });

  const loadBotActivity = useCallback(async () => {
    const res = await apiClient.fetchTelegramStatus();
    if (res) {
      setBotActivity({
        connected: Boolean(res.connected),
        botUsername: res.botUsername || null,
        totalProcessed: Number(res.totalProcessed) || 0,
        logs: Array.isArray(res.logs) ? res.logs : []
      });
    }
  }, []);

  useEffect(() => {
    loadBotActivity();
    const timer = setInterval(loadBotActivity, 5000);
    return () => clearInterval(timer);
  }, [loadBotActivity]);

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

      setFeedbackMsg('Alerta publicada en el mapa.');
      setNewTitle('');
      setNewDescription('');
      onRefreshIncidents();
    } catch {
      setFeedbackMsg('Error al publicar alerta.');
    } finally {
      setSubmitting(false);
    }
  };

  const recentLogs = botActivity.logs.slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Selector de Pestañas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          style={{
            padding: '7px 8px',
            background: activeTab === 'inbox' ? 'rgba(2, 132, 199, 0.22)' : '#1E293B',
            border: activeTab === 'inbox' ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: activeTab === 'inbox' ? '#7DD3FC' : '#CBD5E1',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
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
            background: activeTab === 'publisher' ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
            border: activeTab === 'publisher' ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: activeTab === 'publisher' ? '#FDE68A' : '#CBD5E1',
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
          <PlusCircle size={14} />
          <span>Publicar Alerta</span>
        </button>
      </div>

      {/* 1. BANDEJA DE REPORTES CIUDADANOS */}
      {activeTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1', fontVariantNumeric: 'tabular-nums' }}>
              Por validar ({pendingReports.length})
            </span>
            <span style={{ fontSize: '12px', color: '#6EE7B7', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {activeAlerts.length} activas
            </span>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#A8B8CD', fontSize: '12px' }}>
              <CheckCircle size={22} color="#10B981" style={{ margin: '0 auto 6px auto' }} />
              <div>Sin reportes pendientes de validar.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '9px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                      <strong
                        style={{
                          fontSize: '12px',
                          color: '#F8FAFC',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {report.title}
                      </strong>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#FDE68A',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        +{report.delayMinutes}m
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#A8B8CD', marginTop: '2px' }}>
                      {report.routeName || 'Ruta'} &bull; {report.locationName || 'Tuxtla'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleVerify(report.id)}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(13, 148, 104, 0.22)',
                        border: '1px solid #10B981',
                        borderRadius: '6px',
                        color: '#6EE7B7',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'inherit',
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
                      title="Descartar reporte"
                      style={{
                        padding: '4px 6px',
                        background: 'rgba(239, 68, 68, 0.16)',
                        border: '1px solid rgba(239, 68, 68, 0.38)',
                        borderRadius: '6px',
                        color: '#FCA5A5',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alertas Activas en Mapa */}
          {activeAlerts.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FDE68A', fontVariantNumeric: 'tabular-nums' }}>
                Alertas activas ({activeAlerts.length})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      padding: '8px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <AlertTriangle size={13} color="#EF4444" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#F8FAFC',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {alert.title}
                      </span>
                      <span style={{ fontSize: '12px', color: '#FDE68A', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        +{alert.delayMinutes}m
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResolve(alert.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#1E293B',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        color: '#E2E8F0',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Resolver
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PUBLICADOR DE ALERTAS VIALES */}
      {activeTab === 'publisher' && (
        <form onSubmit={handleSubmitAlert} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {feedbackMsg && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                color: '#6EE7B7'
              }}
            >
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="support-alert-type" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Tipo de incidencia:
            </label>
            <select
              id="support-alert-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                fontFamily: 'inherit'
              }}
            >
              <option value="ROAD_BLOCK">Bloqueo Vial</option>
              <option value="HEAVY_TRAFFIC">Tráfico Pesado</option>
              <option value="HEAVY_RAIN">Lluvia Fuerte</option>
              <option value="ROAD_WORK">Obra Pública</option>
              <option value="ACCIDENT">Percance Vial</option>
              <option value="CROWDED_BUS">Demanda Alta</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="support-alert-route" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Ruta afectada:
            </label>
            <select
              id="support-alert-route"
              value={newRouteId}
              onChange={(e) => setNewRouteId(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                fontFamily: 'inherit'
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
            <label htmlFor="support-alert-delay" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Retraso estimado:
            </label>
            <select
              id="support-alert-delay"
              value={newDelay}
              onChange={(e) => setNewDelay(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                fontFamily: 'inherit'
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
            <label htmlFor="support-alert-title" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Título de la alerta:
            </label>
            <input
              id="support-alert-title"
              type="text"
              placeholder="Ej. Reducción de carril en Libramiento Sur"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div
            style={{
              padding: '6px 0',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '12px', color: '#CBD5E1', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} color="#EF4444" />
              <span>
                {pickedCoordinate
                  ? `${pickedCoordinate.lat.toFixed(4)}, ${pickedCoordinate.lng.toFixed(4)}`
                  : 'Centro de Tuxtla'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onPickCoordinateOnMap('incident')}
              style={{
                background: pickingTarget === 'incident' ? '#F59E0B' : '#1E293B',
                border: '1px solid var(--border-subtle)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: pickingTarget === 'incident' ? '#0F172A' : '#F8FAFC',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'inherit',
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
              padding: '9px',
              background: '#F59E0B',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              color: '#0F172A',
              fontSize: '13px',
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
            <span>{submitting ? 'Publicando...' : 'Publicar Alerta'}</span>
          </button>
        </form>
      )}

      {/* 3. ACTIVIDAD DEL BOT DE TELEGRAM EN VIVO */}
      <section
        aria-label="Actividad del Bot de Telegram"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} color="#38BDF8" />
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0
              }}
            >
              Actividad del Bot de Telegram
            </h2>
          </div>

          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: botActivity.connected ? '#6EE7B7' : '#A8B8CD',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {botActivity.connected
              ? `${botActivity.botUsername || '@TuxtlaRutasUnach_Bot'} • ${botActivity.totalProcessed}`
              : 'En pausa'}
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#A8B8CD', paddingTop: '2px' }}>
            Esperando consultas en vivo desde celulares...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentLogs.map((log, index) => {
              const isNotFound = log.validationStatus === 'NOT_FOUND';
              const shortBadge = isNotFound ? 'Registro No Encontrado' : 'Validado en PostgreSQL';

              return (
                <div
                  key={log.id || index}
                  title={log.botReplyPreview ? `Respuesta: ${log.botReplyPreview}` : log.userText}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    padding: '7px 0',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: '#A8B8CD', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {formatLogTime(log.timestamp)}
                      </span>
                      <strong
                        style={{
                          color: '#7DD3FC',
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '72px'
                        }}
                      >
                        {String(log.userName || 'Pasajero').split(' ')[0]}:
                      </strong>
                      <span style={{ color: '#FFFFFF', fontWeight: 700, flexShrink: 0 }}>
                        "{log.userText}"
                      </span>
                    </div>

                    <span
                      style={{
                        color: isNotFound ? '#FCA5A5' : '#6EE7B7',
                        fontWeight: 700,
                        flexShrink: 0,
                        fontSize: '12px'
                      }}
                    >
                      {isNotFound ? `✕ ${shortBadge}` : `✓ ${shortBadge}`}
                    </span>
                  </div>

                  {log.botReplyPreview && (
                    <div
                      style={{
                        color: '#CBD5E1',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      ↳ {log.botReplyPreview}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
