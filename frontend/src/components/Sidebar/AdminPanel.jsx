// Componente de Consola: Panel Ejecutivo de Administración Operativa (Paleta Colectivo Tuxtla)

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  MapPin,
  AlertTriangle,
  Save,
  Radio,
  Send,
  RefreshCw,
  Pause,
  Play,
  KeyRound
} from 'lucide-react';
import { apiClient } from '../../api/client.js';

export function AdminPanel({
  routes = [],
  telemetryUnits = [],
  incidents = [],
  onReloadRoutes
}) {
  const [activeTab, setActiveTab] = useState('kpis');
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');

  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const [freqMinutes, setFreqMinutes] = useState(currentRoute?.scheduleInfo?.frequencyMinutes || 10);
  const [routeStatus, setRouteStatus] = useState(currentRoute?.status || 'OPERATIONAL');
  const [routeColor, setRouteColor] = useState(currentRoute?.color || '#0284C7');
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSavedMsg, setRouteSavedMsg] = useState(null);

  const [newUnitId, setNewUnitId] = useState(`R-EXT-${Math.floor(10 + Math.random() * 90)}`);
  const [dispatchRouteId, setDispatchRouteId] = useState(routes[0]?.id || '');
  const [dispatchSpeed, setDispatchSpeed] = useState(28);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(null);

  const [tgStatus, setTgStatus] = useState({
    connected: false,
    botName: null,
    botUsername: null,
    totalProcessed: 0,
    lastError: null
  });
  const [newBotToken, setNewBotToken] = useState('');
  const [tgBusy, setTgBusy] = useState(false);
  const [tgFeedback, setTgFeedback] = useState(null);

  const loadTelegramStatus = useCallback(async () => {
    const res = await apiClient.fetchTelegramStatus();
    if (res) {
      setTgStatus({
        connected: Boolean(res.connected),
        botName: res.botName,
        botUsername: res.botUsername,
        totalProcessed: Number(res.totalProcessed) || 0,
        lastError: res.lastError || null
      });
    }
  }, []);

  useEffect(() => {
    loadTelegramStatus();
    const timer = setInterval(loadTelegramStatus, 5000);
    return () => clearInterval(timer);
  }, [loadTelegramStatus]);

  const handleToggleTelegramConnection = async () => {
    setTgBusy(true);
    setTgFeedback(null);
    try {
      if (tgStatus.connected && !newBotToken.trim()) {
        const res = await apiClient.disconnectTelegramBot();
        setTgStatus((prev) => ({
          ...prev,
          connected: res.connected,
          totalProcessed: res.totalProcessed
        }));
        setTgFeedback({ ok: true, text: 'Long Polling en pausa.' });
      } else {
        const res = await apiClient.connectTelegramBot(newBotToken.trim() || undefined);
        setTgStatus((prev) => ({
          ...prev,
          connected: res.connected,
          botName: res.botName,
          botUsername: res.botUsername,
          totalProcessed: res.totalProcessed
        }));
        setNewBotToken('');
        setTgFeedback({
          ok: true,
          text: `Bot activo: ${res.botUsername || res.botName || 'Telegram'}`
        });
      }
    } catch (err) {
      setTgFeedback({
        ok: false,
        text: err?.message || 'Error al gestionar conexión de Telegram.'
      });
    } finally {
      setTgBusy(false);
    }
  };

  const handleReconnectTelegram = async (e) => {
    e.preventDefault();
    setTgBusy(true);
    setTgFeedback(null);
    try {
      const res = await apiClient.connectTelegramBot(newBotToken.trim() || undefined);
      setTgStatus((prev) => ({
        ...prev,
        connected: res.connected,
        botName: res.botName,
        botUsername: res.botUsername,
        totalProcessed: res.totalProcessed
      }));
      setNewBotToken('');
      setTgFeedback({
        ok: true,
        text: `Token sincronizado (${res.botUsername || 'Conectado'}).`
      });
    } catch (err) {
      setTgFeedback({
        ok: false,
        text: err?.message || 'No fue posible autenticar el token.'
      });
    } finally {
      setTgBusy(false);
    }
  };

  const handleSelectRouteToEdit = (rId) => {
    setSelectedRouteId(rId);
    const r = routes.find((x) => x.id === rId);
    if (r) {
      setFreqMinutes(r.scheduleInfo?.frequencyMinutes || 10);
      setRouteStatus(r.status || 'OPERATIONAL');
      setRouteColor(r.color || '#0284C7');
      setRouteSavedMsg(null);
    }
  };

  const handleSaveRouteConfig = async (e) => {
    e.preventDefault();
    if (!selectedRouteId) return;
    setSavingRoute(true);
    setRouteSavedMsg(null);
    try {
      await apiClient.updateRouteConfig(selectedRouteId, {
        frequencyMinutes: Number(freqMinutes),
        status: routeStatus,
        color: routeColor
      });
      setRouteSavedMsg('Configuración aplicada a la red.');
      if (onReloadRoutes) onReloadRoutes();
    } catch (err) {
      console.warn('Error al actualizar ruta:', err);
      setRouteSavedMsg('Error al actualizar ruta.');
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDispatchUnit = async (e) => {
    e.preventDefault();
    setDispatching(true);
    setDispatchMsg(null);
    try {
      const res = await apiClient.dispatchFleetUnit({
        unitId: newUnitId.trim().toUpperCase(),
        routeId: dispatchRouteId || routes[0]?.id,
        speedKmh: Number(dispatchSpeed),
        status: 'EN_RUTA'
      });

      if (res.success) {
        setDispatchMsg(`Unidad ${newUnitId.toUpperCase()} despachada.`);
        setNewUnitId(`R-EXT-${Math.floor(10 + Math.random() * 90)}`);
      } else {
        setDispatchMsg(res.message || 'No se pudo despachar');
      }
    } catch {
      setDispatchMsg('Error al despachar unidad.');
    } finally {
      setDispatching(false);
    }
  };

  const totalStops = routes.reduce((acc, r) => acc + (Array.isArray(r.stops) ? r.stops.length : 0), 0);
  const activeAlertsCount = incidents.filter((i) => i.status === 'ACTIVE_ALERT').length;
  const suspendedRoutesCount = routes.filter((r) => r.status === 'SUSPENDED').length;

  const formattedUsername = tgStatus.botUsername
    ? tgStatus.botUsername.startsWith('@')
      ? tgStatus.botUsername
      : `@${tgStatus.botUsername}`
    : '@TuxtlaRutasUnach_Bot';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Sub-pestañas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { id: 'kpis', label: 'KPIs' },
          { id: 'routes', label: 'Rutas' },
          { id: 'fleet', label: 'Flota' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '7px 4px',
              background: activeTab === tab.id ? 'rgba(245, 158, 11, 0.2)' : '#1E293B',
              border: activeTab === tab.id ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: activeTab === tab.id ? '#FDE68A' : '#CBD5E1',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. KPIs */}
      {activeTab === 'kpis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '12px' }}>
              <span>Rutas</span>
              <Bus size={14} color="#38BDF8" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
              {routes.length}
            </div>
            <div style={{ fontSize: '12px', color: suspendedRoutesCount > 0 ? '#FCA5A5' : '#6EE7B7' }}>
              {suspendedRoutesCount > 0 ? `${suspendedRoutesCount} suspendida` : '100% operativas'}
            </div>
          </div>

          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '12px' }}>
              <span>Combis en vivo</span>
              <Radio size={14} color="#10B981" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#6EE7B7', fontVariantNumeric: 'tabular-nums' }}>
              {telemetryUnits.length}
            </div>
            <div style={{ fontSize: '12px', color: '#6EE7B7' }}>
              GPS activo
            </div>
          </div>

          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '12px' }}>
              <span>Paradas</span>
              <MapPin size={14} color="#F59E0B" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
              {totalStops}
            </div>
            <div style={{ fontSize: '12px', color: '#A8B8CD' }}>
              Georreferenciadas
            </div>
          </div>

          <div
            style={{
              background: '#1E293B',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '12px' }}>
              <span>Alertas</span>
              <AlertTriangle size={14} color={activeAlertsCount > 0 ? '#EF4444' : '#10B981'} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: activeAlertsCount > 0 ? '#FCA5A5' : '#6EE7B7', fontVariantNumeric: 'tabular-nums' }}>
              {activeAlertsCount}
            </div>
            <div style={{ fontSize: '12px', color: '#A8B8CD' }}>
              En mapa
            </div>
          </div>
        </div>
      )}

      {/* 2. GESTOR DE RUTAS */}
      {activeTab === 'routes' && (
        <form onSubmit={handleSaveRouteConfig} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="admin-route-select" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Ruta:
            </label>
            <select
              id="admin-route-select"
              value={selectedRouteId}
              onChange={(e) => handleSelectRouteToEdit(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'inherit'
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
            <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>Estado operativo:</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { id: 'OPERATIONAL', label: 'Normal', bg: 'rgba(13, 148, 104, 0.22)', border: '#10B981', color: '#6EE7B7' },
                { id: 'DELAYED', label: 'Retrasos', bg: 'rgba(245, 158, 11, 0.22)', border: '#F59E0B', color: '#FDE68A' },
                { id: 'SUSPENDED', label: 'Suspendida', bg: 'rgba(239, 68, 68, 0.22)', border: '#EF4444', color: '#FCA5A5' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRouteStatus(st.id)}
                  style={{
                    padding: '6px 2px',
                    background: routeStatus === st.id ? st.bg : '#1E293B',
                    border: routeStatus === st.id ? `1px solid ${st.border}` : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: routeStatus === st.id ? st.color : '#CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <label htmlFor="admin-freq-range" style={{ color: '#CBD5E1', fontWeight: 600 }}>
                Frecuencia:
              </label>
              <span style={{ color: '#7DD3FC', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {freqMinutes} min
              </span>
            </div>
            <input
              id="admin-freq-range"
              type="range"
              min="3"
              max="35"
              step="1"
              value={freqMinutes}
              onChange={(e) => setFreqMinutes(e.target.value)}
              style={{ width: '100%', accentColor: '#F59E0B', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="admin-route-color" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Color vectorial:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                id="admin-route-color"
                type="color"
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '12px', color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>{routeColor}</span>
            </div>
          </div>

          {routeSavedMsg && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6EE7B7' }}>
              {routeSavedMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={savingRoute}
            style={{
              padding: '8px',
              background: '#0369A1',
              border: '1px solid #38BDF8',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px'
            }}
          >
            <Save size={14} />
            <span>{savingRoute ? 'Guardando...' : 'Aplicar Cambios'}</span>
          </button>
        </form>
      )}

      {/* 3. DESPACHO DE FLOTA */}
      {activeTab === 'fleet' && (
        <form onSubmit={handleDispatchUnit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="admin-unit-id" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Económico / Placa:
            </label>
            <input
              id="admin-unit-id"
              type="text"
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
              placeholder="Ej. TX-43C"
              required
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'inherit',
                textTransform: 'uppercase'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="admin-dispatch-route" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
              Ruta asignada:
            </label>
            <select
              id="admin-dispatch-route"
              value={dispatchRouteId}
              onChange={(e) => setDispatchRouteId(e.target.value)}
              style={{
                padding: '7px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'inherit'
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <label htmlFor="admin-dispatch-speed" style={{ color: '#CBD5E1', fontWeight: 600 }}>
                Velocidad crucero:
              </label>
              <span style={{ color: '#6EE7B7', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {dispatchSpeed} km/h
              </span>
            </div>
            <input
              id="admin-dispatch-speed"
              type="range"
              min="15"
              max="50"
              step="1"
              value={dispatchSpeed}
              onChange={(e) => setDispatchSpeed(e.target.value)}
              style={{ width: '100%', accentColor: '#10B981', cursor: 'pointer' }}
            />
          </div>

          {dispatchMsg && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6EE7B7' }}>
              {dispatchMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={dispatching}
            style={{
              padding: '8px',
              background: '#065F46',
              border: '1px solid #10B981',
              borderRadius: '8px',
              color: '#FFFFFF',
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
            <Radio size={14} />
            <span>{dispatching ? 'Despachando...' : 'Despachar Combi'}</span>
          </button>
        </form>
      )}

      {/* 4. BLOQUE EN VIVO: BOT DE TELEGRAM EN VIVO (Separador limpio sin nested-cards) */}
      <section
        aria-label="Bot de Telegram en Vivo"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={14} color="#38BDF8" />
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0
              }}
            >
              Bot de Telegram en Vivo
            </h2>
          </div>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              background: tgStatus.connected ? 'rgba(13, 148, 104, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              border: tgStatus.connected ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(245, 158, 11, 0.45)',
              color: tgStatus.connected ? '#6EE7B7' : '#FDE68A',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {tgStatus.connected ? `Conectado: ${formattedUsername}` : 'Pausado / Sin enlace'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '8px'
          }}
        >
          <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
            <span>Consultas atendidas: </span>
            <strong style={{ color: '#FFFFFF', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {tgStatus.totalProcessed}
            </strong>
          </div>

          <button
            type="button"
            onClick={handleToggleTelegramConnection}
            disabled={tgBusy}
            style={{
              padding: '5px 10px',
              background: tgStatus.connected ? 'rgba(245, 158, 11, 0.2)' : '#065F46',
              border: tgStatus.connected ? '1px solid rgba(245, 158, 11, 0.48)' : '1px solid #10B981',
              borderRadius: '6px',
              color: tgStatus.connected ? '#FDE68A' : '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {tgStatus.connected ? <Pause size={12} /> : <Play size={12} />}
            <span>{tgStatus.connected ? 'Pausar' : 'Reconectar'}</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '12px'
          }}
        >
          <span style={{ color: '#CBD5E1', fontWeight: 700 }}>
            Flujo de Automatización (n8n + PostgreSQL):
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>1. Telegram Trigger ({formattedUsername})</span>
              <span style={{ color: tgStatus.connected ? '#6EE7B7' : '#FDE68A', fontWeight: 700 }}>
                {tgStatus.connected ? '● Activo' : '○ Pausa'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>2. Normalizar Consulta ➔ PostgreSQL</span>
              <span style={{ color: '#7DD3FC', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>● 12 Rutas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>3. IF Registro Existe (Validado / Inexistente)</span>
              <span style={{ color: '#6EE7B7', fontWeight: 700 }}>● Listo</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleReconnectTelegram} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor="admin-telegram-token"
            style={{
              fontSize: '12px',
              color: '#CBD5E1',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <KeyRound size={12} color="#F59E0B" />
            <span>Actualizar token (Zero-Trust):</span>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              id="admin-telegram-token"
              type="password"
              autoComplete="new-password"
              value={newBotToken}
              onChange={(e) => setNewBotToken(e.target.value)}
              placeholder="Nuevo token BotFather (opcional)"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '6px 8px',
                background: '#1E293B',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                fontFamily: 'inherit'
              }}
            />
            <button
              type="submit"
              disabled={tgBusy}
              title="Reconectar o aplicar nuevo token en caliente"
              style={{
                padding: '6px 10px',
                background: '#0369A1',
                border: '1px solid #38BDF8',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              <RefreshCw size={12} />
              <span>{newBotToken.trim() ? 'Cambiar' : 'Reconectar'}</span>
            </button>
          </div>
        </form>

        {tgFeedback && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: tgFeedback.ok ? '#6EE7B7' : '#FCA5A5'
            }}
          >
            {tgFeedback.text}
          </div>
        )}
      </section>
    </div>
  );
}
