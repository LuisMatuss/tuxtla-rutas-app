// Componente de Consola: Panel de Control Ejecutivo y Administración Operativa (Zero-Slop, Apple Maps style)
import React, { useState, useEffect, useCallback } from 'react';
import { Bus, MapPin, AlertTriangle, Save, Radio, Send, RefreshCw, Pause, Play, KeyRound } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export function AdminPanel({
  routes = [],
  telemetryUnits = [],
  incidents = [],
  onReloadRoutes,
  onRefreshIncidents
}) {
  const [activeTab, setActiveTab] = useState('kpis'); // 'kpis' | 'routes' | 'fleet'
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');

  // Formulario de edición de ruta
  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const [freqMinutes, setFreqMinutes] = useState(currentRoute?.scheduleInfo?.frequencyMinutes || 10);
  const [routeStatus, setRouteStatus] = useState(currentRoute?.status || 'OPERATIONAL');
  const [routeColor, setRouteColor] = useState(currentRoute?.color || '#0284c7');
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSavedMsg, setRouteSavedMsg] = useState(null);

  // Formulario de despacho de combi
  const [newUnitId, setNewUnitId] = useState(`R-EXT-${Math.floor(10 + Math.random() * 90)}`);
  const [dispatchRouteId, setDispatchRouteId] = useState(routes[0]?.id || '');
  const [dispatchSpeed, setDispatchSpeed] = useState(28);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(null);

  // Estado del Bot Real de Telegram en Vivo
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
      setRouteColor(r.color || '#0284c7');
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
      setRouteSavedMsg('✅ Configuración aplicada a la red.');
      if (onReloadRoutes) onReloadRoutes();
    } catch (err) {
      console.warn('Error al actualizar ruta:', err);
      setRouteSavedMsg('❌ Error al actualizar ruta.');
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
        setDispatchMsg(`✅ Unidad ${newUnitId.toUpperCase()} despachada.`);
        setNewUnitId(`R-EXT-${Math.floor(10 + Math.random() * 90)}`);
      } else {
        setDispatchMsg(`❌ ${res.message || 'No se pudo despachar'}`);
      }
    } catch (err) {
      setDispatchMsg('❌ Error al despachar unidad.');
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
    : '@bot_tuxtla';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Sub-pestañas (Chips) */}
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
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              border: activeTab === tab.id ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: activeTab === tab.id ? '#38bdf8' : '#cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. SECCIÓN KPIs */}
      {activeTab === 'kpis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
                <span>Rutas</span>
                <Bus size={14} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                {routes.length}
              </div>
              <div style={{ fontSize: '12px', color: suspendedRoutesCount > 0 ? '#f87171' : '#34d399' }}>
                {suspendedRoutesCount > 0 ? `${suspendedRoutesCount} suspendida` : '100% operativas'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
                <span>Combis en vivo</span>
                <Radio size={14} color="#10b981" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                {telemetryUnits.length}
              </div>
              <div style={{ fontSize: '12px', color: '#34d399' }}>
                GPS activo
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
                <span>Paradas</span>
                <MapPin size={14} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>
                {totalStops}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Georreferenciadas
              </div>
            </div>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px' }}>
                <span>Alertas</span>
                <AlertTriangle size={14} color={activeAlertsCount > 0 ? '#ef4444' : '#10b981'} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: activeAlertsCount > 0 ? '#f87171' : '#34d399', fontVariantNumeric: 'tabular-nums' }}>
                {activeAlertsCount}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                En mapa
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GESTOR DE RUTAS */}
      {activeTab === 'routes' && (
        <form onSubmit={handleSaveRouteConfig} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="admin-route-select" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RUTA:</label>
            <select
              id="admin-route-select"
              value={selectedRouteId}
              onChange={(e) => handleSelectRouteToEdit(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px'
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
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>ESTADO:</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { id: 'OPERATIONAL', label: 'Normal', bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', color: '#6ee7b7' },
                { id: 'DELAYED', label: 'Retrasos', bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', color: '#fcd34d' },
                { id: 'SUSPENDED', label: 'Suspendida', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', color: '#fca5a5' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRouteStatus(st.id)}
                  style={{
                    padding: '6px 2px',
                    background: routeStatus === st.id ? st.bg : 'rgba(30, 41, 59, 0.5)',
                    border: routeStatus === st.id ? `1px solid ${st.border}` : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: routeStatus === st.id ? st.color : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
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
              <label htmlFor="admin-freq-range" style={{ color: '#94a3b8', fontWeight: 600 }}>FRECUENCIA:</label>
              <span style={{ color: '#38bdf8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{freqMinutes} min</span>
            </div>
            <input
              id="admin-freq-range"
              type="range"
              min="3"
              max="35"
              step="1"
              value={freqMinutes}
              onChange={(e) => setFreqMinutes(e.target.value)}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label htmlFor="admin-route-color" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>COLOR VECTORIAL:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                id="admin-route-color"
                type="color"
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontFamily: 'monospace' }}>{routeColor}</span>
            </div>
          </div>

          {routeSavedMsg && (
            <div
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                background: routeSavedMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: routeSavedMsg.startsWith('✅') ? '#6ee7b7' : '#fca5a5',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {routeSavedMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={savingRoute}
            style={{
              padding: '8px',
              background: '#1d4ed8',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
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
            <label htmlFor="admin-unit-id" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>ECONÓMICO / PLACA:</label>
            <input
              id="admin-unit-id"
              type="text"
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
              placeholder="Ej. TX-43C"
              required
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="admin-dispatch-route" style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RUTA:</label>
            <select
              id="admin-dispatch-route"
              value={dispatchRouteId}
              onChange={(e) => setDispatchRouteId(e.target.value)}
              style={{
                padding: '7px 8px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px'
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
              <label htmlFor="admin-dispatch-speed" style={{ color: '#94a3b8', fontWeight: 600 }}>VELOCIDAD:</label>
              <span style={{ color: '#34d399', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dispatchSpeed} km/h</span>
            </div>
            <input
              id="admin-dispatch-speed"
              type="range"
              min="15"
              max="50"
              step="1"
              value={dispatchSpeed}
              onChange={(e) => setDispatchSpeed(e.target.value)}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
          </div>

          {dispatchMsg && (
            <div
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                background: dispatchMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: dispatchMsg.startsWith('✅') ? '#6ee7b7' : '#fca5a5',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {dispatchMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={dispatching}
            style={{
              padding: '8px',
              background: '#047857',
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
            <Radio size={14} />
            <span>{dispatching ? 'Despachando...' : 'Despachar Combi'}</span>
          </button>
        </form>
      )}

      {/* 4. BLOQUE EN VIVO: BOT DE TELEGRAM EN VIVO */}
      <section
        aria-label="Bot de Telegram en Vivo"
        style={{
          background: 'rgba(15, 23, 42, 0.72)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '4px'
        }}
      >
        {/* Cabecera y Badge de Estado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={14} color="#38bdf8" />
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Bot de Telegram en Vivo
            </h2>
          </div>

          <span
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              background: tgStatus.connected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              border: tgStatus.connected ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(245, 158, 11, 0.45)',
              color: tgStatus.connected ? '#6ee7b7' : '#fcd34d',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {tgStatus.connected ? `Conectado: ${formattedUsername}` : 'Pausado / Sin enlace'}
          </span>
        </div>

        {/* Métricas de Consultas Atendidas + Control Pausar / Reconectar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
            gap: '8px'
          }}
        >
          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
            <span>Consultas atendidas: </span>
            <strong style={{ color: '#ffffff', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {tgStatus.totalProcessed}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleToggleTelegramConnection}
              disabled={tgBusy}
              style={{
                padding: '5px 10px',
                background: tgStatus.connected ? 'rgba(245, 158, 11, 0.18)' : '#047857',
                border: tgStatus.connected ? '1px solid rgba(245, 158, 11, 0.45)' : 'none',
                borderRadius: '6px',
                color: tgStatus.connected ? '#fcd34d' : '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
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
        </div>

        {/* Campo protegido (Zero-Trust) para actualizar o reconectar token */}
        <form
          onSubmit={handleReconnectTelegram}
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <label
            htmlFor="admin-telegram-token"
            style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <KeyRound size={12} />
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
                background: 'rgba(9, 13, 22, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            />
            <button
              type="submit"
              disabled={tgBusy}
              title="Reconectar o aplicar nuevo token en caliente"
              style={{
                padding: '6px 10px',
                background: '#1d4ed8',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
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
              color: tgFeedback.ok ? '#6ee7b7' : '#fca5a5'
            }}
          >
            {tgFeedback.text}
          </div>
        )}
      </section>
    </div>
  );
}
