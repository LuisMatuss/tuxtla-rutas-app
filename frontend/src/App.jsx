// Componente Raíz: Dashboard de Movilidad Urbana y GIS para Tuxtla Gutiérrez
import React, { useState } from 'react';
import { Bus, MapPin, Layers, RefreshCw, PanelLeftClose, PanelLeft, Clock, Radio } from 'lucide-react';
import { RouteSelector } from './components/Sidebar/RouteSelector.jsx';
import { ScheduleInfo } from './components/Sidebar/ScheduleInfo.jsx';
import { MapView } from './components/Map/MapView.jsx';
import { useGeoRoutes } from './hooks/useGeoRoutes.js';

export default function App() {
  const {
    routes,
    selectedRouteId,
    selectedRoute,
    activeStop,
    userLocation,
    nearestStops,
    telemetryUnits,
    loading,
    loadingNearest,
    isDemoMode,
    selectRoute,
    selectStop,
    setUserLocation,
    simulateTuxtlaLocation,
    clearUserLocation,
    reloadRoutes
  } = useGeoRoutes();

  const [activeTab, setActiveTab] = useState('routes'); // 'routes' | 'schedule'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Manejador al seleccionar ruta: cambia la pestaña si es relevante
  const handleSelectRoute = (id) => {
    selectRoute(id);
    if (id) {
      setActiveTab('schedule');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 1. BARRA SUPERIOR (HEADER DEL SISTEMA) */}
      <header
        style={{
          height: '60px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1100,
          flexShrink: 0
        }}
      >
        {/* Identidad de Marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={sidebarOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}
            >
              <Bus size={20} color="#ffffff" />
            </div>

            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0, color: '#f8fafc' }}>
                Tuxtla-Rutas
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Sistema GIS de Movilidad Urbana &bull; Chiapas
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas y Puntos Clave */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Puntos emblemáticos de simulación rápida */}
          <button
            type="button"
            onClick={() => simulateTuxtlaLocation(16.7516, -93.1161)}
            style={{
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#93c5fd',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <MapPin size={13} />
            <span>Parque Central</span>
          </button>

          <button
            type="button"
            onClick={() => simulateTuxtlaLocation(16.7589, -93.1534)}
            style={{
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#93c5fd',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <MapPin size={13} />
            <span>Plaza Cristal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              selectRoute(null);
              clearUserLocation();
            }}
            style={{
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Layers size={13} />
            <span>Ver Todo</span>
          </button>

          {/* Badge de Telemetría GPS en vivo */}
          <div
            style={{
              padding: '5px 10px',
              borderRadius: '20px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              color: '#60a5fa',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Radio size={12} color="#60a5fa" />
            <span>{telemetryUnits.length} combis en vivo</span>
          </div>

          {/* Badge de Estado del Backend / Modo Demo */}
          <div
            style={{
              padding: '5px 10px',
              borderRadius: '20px',
              background: isDemoMode ? 'rgba(217, 119, 6, 0.15)' : 'rgba(5, 150, 105, 0.15)',
              border: isDemoMode ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid rgba(5, 150, 105, 0.4)',
              color: isDemoMode ? '#fbbf24' : '#34d399',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={
              isDemoMode
                ? 'El backend no está accesible; se están utilizando los datos locales de Tuxtla Gutiérrez.'
                : 'Conexión activa con el backend PostgreSQL/PostGIS.'
            }
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isDemoMode ? '#f59e0b' : '#10b981'
              }}
            />
            <span>{isDemoMode ? 'Modo Resiliencia (Demo Tuxtla)' : 'Backend PostGIS Activo'}</span>
          </div>

          <button
            type="button"
            onClick={reloadRoutes}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Recargar datos"
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </header>

      {/* 2. ÁREA DE TRABAJO PRINCIPAL: SIDEBAR + MAPA */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Panel Lateral Desplegable */}
        {sidebarOpen && (
          <aside
            style={{
              width: '380px',
              maxWidth: '90vw',
              background: 'var(--bg-sidebar)',
              backdropFilter: 'var(--glass-blur)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              boxShadow: 'var(--shadow-lg)',
              height: '100%',
              flexShrink: 0
            }}
          >
            {/* Pestañas del Panel Lateral */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '12px 16px 0 16px',
                gap: '8px',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('routes')}
                style={{
                  padding: '9px 12px',
                  background: activeTab === 'routes' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'routes' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                  color: activeTab === 'routes' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: 'inherit'
                }}
              >
                <Bus size={15} />
                <span>Rutas ({routes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                style={{
                  padding: '9px 12px',
                  background: activeTab === 'schedule' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'schedule' ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === 'schedule' ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: 'inherit'
                }}
              >
                <Clock size={15} />
                <span>Horarios & Cercanía</span>
              </button>
            </div>

            {/* Contenido de la pestaña activa */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {activeTab === 'routes' ? (
                <RouteSelector
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={handleSelectRoute}
                />
              ) : (
                <ScheduleInfo
                  route={selectedRoute}
                  activeStop={activeStop}
                  nearestStops={nearestStops}
                  loadingNearest={loadingNearest}
                  userLocation={userLocation}
                  onSelectStop={selectStop}
                  onSimulateLocation={simulateTuxtlaLocation}
                  onClearLocation={clearUserLocation}
                />
              )}
            </div>
          </aside>
        )}

        {/* Mapa Leaflet a pantalla completa */}
        <main style={{ flex: 1, height: '100%', position: 'relative' }}>
          <MapView
            routes={routes}
            selectedRouteId={selectedRouteId}
            selectedRoute={selectedRoute}
            activeStop={activeStop}
            userLocation={userLocation}
            units={telemetryUnits}
            onMapClick={setUserLocation}
            onSelectRoute={handleSelectRoute}
            onSelectStop={selectStop}
          />
        </main>
      </div>
    </div>
  );
}
