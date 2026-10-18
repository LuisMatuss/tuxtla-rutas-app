// Componente de Consola: Panel de Control Ejecutivo y Administración Operativa (Zero-Slop, Apple Maps style)
import React, { useState } from 'react';
import { Activity, Bus, MapPin, AlertTriangle, PlusCircle, Save, Radio, Sliders } from 'lucide-react';
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
  const [newUnitId, setNewUnitId] = useState(`TX-${Math.floor(100 + Math.random() * 900)}`);
  const [dispatchRouteId, setDispatchRouteId] = useState(routes[0]?.id || '');
  const [dispatchSpeed, setDispatchSpeed] = useState(28);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(null);

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
        setNewUnitId(`TX-${Math.floor(100 + Math.random() * 900)}`);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Sub-pestañas (Chips) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { id: 'kpis', label: '📊 KPIs' },
          { id: 'routes', label: '🛠️ Rutas' },
          { id: 'fleet', label: '🚐 Flota' }
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
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
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
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                {routes.length}
              </div>
              <div style={{ fontSize: '12px', color: suspendedRoutesCount > 0 ? '#ef4444' : '#10b981' }}>
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
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>
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
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
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
              <div style={{ fontSize: '20px', fontWeight: 800, color: activeAlertsCount > 0 ? '#f87171' : '#34d399' }}>
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
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RUTA:</label>
            <select
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
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>ESTADO:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { id: 'OPERATIONAL', label: '🟢 Normal', bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981', color: '#34d399' },
                { id: 'DELAYED', label: '🟡 Retrasos', bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', color: '#fbbf24' },
                { id: 'SUSPENDED', label: '🔴 Suspendida', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', color: '#f87171' }
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
                    color: routeStatus === st.id ? st.color : '#94a3b8',
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
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>FRECUENCIA:</span>
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>{freqMinutes} min</span>
            </div>
            <input
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
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>COLOR VECTORIAL:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
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
              background: 'linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)',
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
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>ECONÓMICO / PLACA:</label>
            <input
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
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>RUTA:</label>
            <select
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
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>VELOCIDAD:</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>{dispatchSpeed} km/h</span>
            </div>
            <input
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
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
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
    </div>
  );
}
