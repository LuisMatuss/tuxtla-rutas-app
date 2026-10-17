// Componente de Consola: Panel de Control Ejecutivo y Administración Operativa
// Gestión en tiempo real de frecuencias, estados de rutas (OPERATIONAL, DELAYED, SUSPENDED)
// y despacho de nuevas unidades de transporte colectivo en vivo.

import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Bus,
  MapPin,
  AlertTriangle,
  Play,
  Pause,
  PlusCircle,
  RefreshCw,
  Save,
  Radio,
  Sliders,
  CheckCircle2
} from 'lucide-react';
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
  const [routeColor, setRouteColor] = useState(currentRoute?.color || '#2563EB');
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSavedMsg, setRouteSavedMsg] = useState(null);

  // Formulario de despacho de nueva combi
  const [newUnitId, setNewUnitId] = useState(`TX-${Math.floor(100 + Math.random() * 900)}`);
  const [dispatchRouteId, setDispatchRouteId] = useState(routes[0]?.id || '');
  const [dispatchSpeed, setDispatchSpeed] = useState(25);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchMsg, setDispatchMsg] = useState(null);

  // Al cambiar de ruta en el selector, actualizar estado local
  const handleSelectRouteToEdit = (rId) => {
    setSelectedRouteId(rId);
    const r = routes.find((x) => x.id === rId);
    if (r) {
      setFreqMinutes(r.scheduleInfo?.frequencyMinutes || 10);
      setRouteStatus(r.status || 'OPERATIONAL');
      setRouteColor(r.color || '#2563EB');
      setRouteSavedMsg(null);
    }
  };

  // Guardar configuración de ruta
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
      setRouteSavedMsg('✅ Configuración aplicada a la red de transporte.');
      if (onReloadRoutes) onReloadRoutes();
    } catch (err) {
      console.warn('Error al actualizar ruta:', err);
      setRouteSavedMsg('❌ Error al actualizar ruta en backend.');
    } finally {
      setSavingRoute(false);
    }
  };

  // Despachar nueva unidad
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
        setDispatchMsg(`✅ Unidad ${newUnitId.toUpperCase()} despachada e incorporada a la telemetría.`);
        setNewUnitId(`TX-${Math.floor(100 + Math.random() * 900)}`);
      } else {
        setDispatchMsg(`❌ ${res.message || 'No se pudo despachar unidad'}`);
      }
    } catch (err) {
      setDispatchMsg('❌ Error al despachar unidad en el servidor.');
    } finally {
      setDispatching(false);
    }
  };

  // Cálculos de KPIs
  const totalStops = routes.reduce((acc, r) => acc + (Array.isArray(r.stops) ? r.stops.length : 0), 0);
  const activeAlertsCount = incidents.filter((i) => i.status === 'ACTIVE_ALERT').length;
  const suspendedRoutesCount = routes.filter((r) => r.status === 'SUSPENDED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de Sub-pestañas de Admin */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {[
          { id: 'kpis', label: '📊 KPIs', icon: Activity },
          { id: 'routes', label: '🛠️ Rutas', icon: Sliders },
          { id: 'fleet', label: '🚐 Flota', icon: Radio }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 4px',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(30, 41, 59, 0.5)',
              border: activeTab === tab.id ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: activeTab === tab.id ? '#c4b5fd' : '#94a3b8',
              fontSize: '11px',
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

      {/* 1. SECCIÓN KPIs EJECUTIVOS */}
      {activeTab === 'kpis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} />
            Métricas de Operación en Tiempo Real
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* KPI Rutas */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px' }}>
                <span>Red de Rutas</span>
                <Bus size={14} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                {routes.length}
              </div>
              <div style={{ fontSize: '10px', color: suspendedRoutesCount > 0 ? '#ef4444' : '#10b981' }}>
                {suspendedRoutesCount > 0 ? `⚠️ ${suspendedRoutesCount} suspendida(s)` : '🟢 100% operativas'}
              </div>
            </div>

            {/* KPI Combis Activas */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px' }}>
                <span>Combis en Calle</span>
                <Radio size={14} color="#10b981" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399' }}>
                {telemetryUnits.length}
              </div>
              <div style={{ fontSize: '10px', color: '#6ee7b7' }}>
                🛰️ Transmitiendo GPS
              </div>
            </div>

            {/* KPI Paradas */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px' }}>
                <span>Paradas Activas</span>
                <MapPin size={14} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
                {totalStops}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Nodos georreferenciados
              </div>
            </div>

            {/* KPI Alertas Viales */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px' }}>
                <span>Alertas Viales</span>
                <AlertTriangle size={14} color={activeAlertsCount > 0 ? '#ef4444' : '#10b981'} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: activeAlertsCount > 0 ? '#f87171' : '#34d399' }}>
                {activeAlertsCount}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                En mapa de Tuxtla
              </div>
            </div>
          </div>

          {/* Resumen Operativo de la Red */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ fontWeight: 700, color: '#e2e8f0' }}>Estado Global del Transporte Urbano</div>
            <div>• Horario Operativo General: <strong>05:30 - 22:30 hrs</strong></div>
            <div>• Frecuencia Promedio: <strong>8 - 12 minutos</strong> en horas pico</div>
            <div>• Cobertura Espacial: Terán, Chiapas Solidario, Plan de Ayala, Las Palmas, Patria Nueva, Copoya y San José Terán.</div>
          </div>
        </div>
      )}

      {/* 2. GESTOR OPERATIVO DE RUTAS */}
      {activeTab === 'routes' && (
        <form onSubmit={handleSaveRouteConfig} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} />
            Gestión en Caliente de Rutas (8 Rutas)
          </div>

          {/* Selector de Ruta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>SELECCIONAR RUTA A CONFIGURAR:</label>
            <select
              value={selectedRouteId}
              onChange={(e) => handleSelectRouteToEdit(e.target.value)}
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
                  {r.name} ({r.status || 'OPERATIONAL'})
                </option>
              ))}
            </select>
          </div>

          {/* Estado Operativo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>ESTADO DEL SERVICIO:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
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
                    padding: '8px 4px',
                    background: routeStatus === st.id ? st.bg : 'rgba(30, 41, 59, 0.5)',
                    border: routeStatus === st.id ? `1.5px solid ${st.border}` : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: routeStatus === st.id ? st.color : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frecuencia en minutos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>FRECUENCIA ENTRE UNIDADES:</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>{freqMinutes} minutos</span>
            </div>
            <input
              type="range"
              min="3"
              max="35"
              step="1"
              value={freqMinutes}
              onChange={(e) => setFreqMinutes(e.target.value)}
              style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
              <span>3 min (Pico Máximo)</span>
              <span>15 min</span>
              <span>35 min (Madrugada)</span>
            </div>
          </div>

          {/* Color de la ruta en mapa */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>COLOR VECTORIAL (HEX):</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={routeColor}
                onChange={(e) => setRouteColor(e.target.value)}
                style={{ width: '30px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
              <span style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace' }}>{routeColor}</span>
            </div>
          </div>

          {routeSavedMsg && (
            <div
              style={{
                padding: '8px',
                borderRadius: '6px',
                background: routeSavedMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: routeSavedMsg.startsWith('✅') ? '#6ee7b7' : '#fca5a5',
                fontSize: '11px',
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
              padding: '9px 12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
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
              marginTop: '4px'
            }}
          >
            <Save size={14} />
            <span>{savingRoute ? 'Guardando cambios...' : 'Aplicar Configuración a la Ruta'}</span>
          </button>
        </form>
      )}

      {/* 3. DESPACHO DE FLOTA EN VIVO */}
      {activeTab === 'fleet' && (
        <form onSubmit={handleDispatchUnit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={14} />
            Despachar Nueva Combi a Tuxtla
          </div>

          {/* Número / Placa de Unidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>NÚMERO ECONÓMICO / PLACA:</label>
            <input
              type="text"
              value={newUnitId}
              onChange={(e) => setNewUnitId(e.target.value)}
              placeholder="Ej. TX-43C o TX-01C"
              required
              style={{
                padding: '8px 10px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            />
          </div>

          {/* Ruta a Asignar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>RUTA ASIGNADA:</label>
            <select
              value={dispatchRouteId}
              onChange={(e) => setDispatchRouteId(e.target.value)}
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

          {/* Velocidad Inicial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>VELOCIDAD DE OPERACIÓN:</span>
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
                padding: '8px',
                borderRadius: '6px',
                background: dispatchMsg.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: dispatchMsg.startsWith('✅') ? '#6ee7b7' : '#fca5a5',
                fontSize: '11px',
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
              padding: '9px 12px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              border: 'none',
              borderRadius: '8px',
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
            <span>{dispatching ? 'Despachando combi...' : '+ Despachar Nueva Combi en Vivo'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
