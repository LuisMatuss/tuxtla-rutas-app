// Componente Raíz: Dashboard de Movilidad Urbana y GIS para Tuxtla Gutiérrez
// Sistema Multi-Perfil (Pasajero, Soporte Vial, Administrador), Planificador Inteligente de Viajes,
// Gestión de Alertas Viales y Telemetría GPS en Tiempo Real.

import React, { useState, useEffect } from 'react';
import {
  Bus,
  MapPin,
  Layers,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Clock,
  Radio,
  Compass,
  Shield,
  Headphones,
  User,
  AlertTriangle,
  Megaphone,
  LogIn
} from 'lucide-react';
import { RouteSelector } from './components/Sidebar/RouteSelector.jsx';
import { ScheduleInfo } from './components/Sidebar/ScheduleInfo.jsx';
import { TripPlannerPanel } from './components/Sidebar/TripPlannerPanel.jsx';
import { SupportPanel } from './components/Sidebar/SupportPanel.jsx';
import { AdminPanel } from './components/Sidebar/AdminPanel.jsx';
import { ReportIncidentModal } from './components/Sidebar/ReportIncidentModal.jsx';
import { AuthModal, loadStoredUsers, saveStoredUsers, loadCurrentSessionUser, saveCurrentSessionUser } from './components/AuthModal.jsx';
import { MapView } from './components/Map/MapView.jsx';
import { useGeoRoutes } from './hooks/useGeoRoutes.js';
import { apiClient } from './api/client.js';

// Estado vacío estricto para usuarios sin sesión o cuentas nuevas (cero puntos predeterminados)
const EMPTY_PERSONAL_POINTS = { home: null, school: null, work: null, casa: null, escuela: null, trabajo: null };

export default function App() {
  const {
    routes,
    selectedRouteId,
    selectedRoute,
    activeStop,
    userLocation,
    nearestStops,
    telemetryUnits,
    visibleRouteIds,
    directionFilter,
    loading,
    loadingNearest,
    selectRoute,
    selectStop,
    setUserLocation,
    simulateTuxtlaLocation,
    clearUserLocation,
    setVisibleRouteIds,
    toggleRouteVisibility,
    showAllRoutes,
    clearAllRoutes,
    showFavoriteRoutes,
    setDirectionFilter,
    reloadRoutes
  } = useGeoRoutes();

  // 1. Estado de Sesión y Usuario Activo
  const [currentUser, setCurrentUser] = useState(() => loadCurrentSessionUser());
  const [currentRole, setCurrentRole] = useState(() => currentUser?.role || 'USER'); // 'USER' | 'SUPPORT' | 'ADMIN'
  const [userTab, setUserTab] = useState('routes'); // 'routes' | 'planner' | 'schedule'
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. Puntos Personales (Cero Casa, Escuela o Trabajo predeterminados)
  const [personalPoints, setPersonalPoints] = useState(() => {
    if (!currentUser) return EMPTY_PERSONAL_POINTS;
    const p = currentUser.personalPoints || {};
    return {
      home: p.home || p.casa || null,
      school: p.school || p.escuela || null,
      work: p.work || p.trabajo || null,
      casa: p.home || p.casa || null,
      escuela: p.school || p.escuela || null,
      trabajo: p.work || p.trabajo || null
    };
  });

  // 3. Rutas Favoritas (Vacío por defecto si no hay sesión)
  const [favoriteIds, setFavoriteIds] = useState(() => (currentUser ? currentUser.favoriteIds || [] : []));

  // 4. Modal de Autenticación y Avisos Contextuales
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'prompt'
  const [authPromptMessage, setAuthPromptMessage] = useState(null);

  // 5. Modo Selección en Mapa (Picking)
  const [pickingTarget, setPickingTarget] = useState(null); // 'casa' | 'escuela' | 'trabajo' | 'incident' | null
  const [pickedSupportCoordinate, setPickedSupportCoordinate] = useState(null);

  // 6. Viaje Planificado Activo
  const [selectedTrip, setSelectedTrip] = useState(null);

  // 7. Modal de Reporte Ciudadano
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 8. Alertas e Incidencias Viales
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const fetchIncidentsList = async () => {
    setLoadingIncidents(true);
    try {
      const res = await apiClient.fetchIncidents();
      if (res.data) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.warn('Error al obtener incidencias:', err);
    } finally {
      setLoadingIncidents(false);
    }
  };

  useEffect(() => {
    fetchIncidentsList();
  }, []);

  // Manejador para solicitar inicio de sesión con aviso contextual dinámico
  const handleRequestAuthPrompt = (message) => {
    setAuthPromptMessage(message);
    setAuthModalMode('prompt');
    setAuthModalOpen(true);
  };

  // Manejador de favoritos con protección contextual
  const handleToggleFavorite = (routeId) => {
    if (!currentUser) {
      handleRequestAuthPrompt('Inicia sesión para poder guardar tus rutas favoritas');
      return;
    }

    setFavoriteIds((prev) => {
      const next = prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId];
      const updatedUser = {
        ...currentUser,
        favoriteIds: next
      };
      setCurrentUser(updatedUser);
      saveCurrentSessionUser(updatedUser);
      const allUsers = loadStoredUsers();
      saveStoredUsers(allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      return next;
    });
  };

  // Manejador de cierre de sesión
  const handleLogout = () => {
    saveCurrentSessionUser(null);
    setCurrentUser(null);
    setCurrentRole('USER');
    setPersonalPoints(EMPTY_PERSONAL_POINTS);
    setFavoriteIds([]);
    setPickingTarget(null);
    setAuthPromptMessage(null);
  };

  // Manejador de inicio de sesión o registro exitoso
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentRole(user.role || 'USER');
    const p = user.personalPoints || {};
    setPersonalPoints({
      home: p.home || p.casa || null,
      school: p.school || p.escuela || null,
      work: p.work || p.trabajo || null,
      casa: p.home || p.casa || null,
      escuela: p.school || p.escuela || null,
      trabajo: p.work || p.trabajo || null
    });
    setFavoriteIds(user.favoriteIds || []);
    setAuthPromptMessage(null);
  };

  // Manejador de clics en el mapa durante el modo picking
  const handlePickCoordinate = (coords) => {
    if (!pickingTarget) return;

    if (pickingTarget === 'casa' || pickingTarget === 'escuela' || pickingTarget === 'trabajo') {
      const keyMap = { casa: 'home', escuela: 'school', trabajo: 'work' };
      const engKey = keyMap[pickingTarget] || pickingTarget;

      const pointData = {
        lat: coords.lat,
        lng: coords.lng,
        label: `Fijado en mapa (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
      };

      const updated = {
        ...personalPoints,
        [pickingTarget]: pointData,
        [engKey]: pointData
      };
      setPersonalPoints(updated);

      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          personalPoints: updated
        };
        setCurrentUser(updatedUser);
        saveCurrentSessionUser(updatedUser);
        const allUsers = loadStoredUsers();
        saveStoredUsers(allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      }
      setPickingTarget(null);
    } else if (pickingTarget === 'incident') {
      setPickedSupportCoordinate(coords);
      setPickingTarget(null);
    }
  };

  // Manejador al seleccionar ruta
  const handleSelectRoute = (id) => {
    selectRoute(id);
    setSelectedTrip(null);
    if (id && currentRole === 'USER') {
      setUserTab('schedule');
    }
  };

  // Conteo de alertas activas
  const activeAlertsCount = incidents.filter((i) => i.status === 'ACTIVE_ALERT').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 1. BARRA SUPERIOR (HEADER DEL SISTEMA) */}
      <header
        style={{
          height: '62px',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1100,
          flexShrink: 0,
          gap: '12px'
        }}
      >
        {/* Identidad de Marca y Toggle de Sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
              }}
            >
              <Bus size={20} color="#ffffff" />
            </div>

            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: '#f8fafc' }}>
                Tuxtla-Rutas
              </h1>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                Movilidad Urbana &bull; Chiapas
              </span>
            </div>
          </div>
        </div>

        {/* 2. SELECTOR DE ROLES: Solo visible si el usuario tiene rol SOPORTE o ADMIN */}
        {(currentUser?.role === 'SUPPORT' || currentUser?.role === 'ADMIN') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '3px'
            }}
          >
            {[
              { id: 'USER', label: '👤 Pasajero', badgeColor: '#047857', title: 'Modo Pasajero: Rutas, Qué combi tomo y horarios' },
              { id: 'SUPPORT', label: '🎧 Soporte Vial', badgeColor: '#2563eb', title: 'Centro de Alertas y Reportes Ciudadanos' },
              { id: 'ADMIN', label: '🛡️ Administrador', badgeColor: '#0284c7', title: 'Control Operativo de Frecuencias y Flota' }
            ].map((role) => {
              const isSelected = currentRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setCurrentRole(role.id);
                    setSidebarOpen(true);
                  }}
                  title={role.title}
                  style={{
                    padding: '6px 12px',
                    background: isSelected ? role.badgeColor : 'transparent',
                    border: 'none',
                    borderRadius: '9px',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Acciones Rápidas, Badges y Control de Sesión */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botón Pasajero: Reportar Incidente (Protegido por aviso contextual) */}
          <button
            type="button"
            id="btn-report-incident"
            onClick={() => {
              if (!currentUser) {
                handleRequestAuthPrompt('Inicia sesión para poder enviar un reporte vial');
                return;
              }
              setIsReportModalOpen(true);
            }}
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
            title="Enviar reporte ciudadano de combi llena o bloqueo"
          >
            <Megaphone size={13} />
            <span>Reportar Incidente</span>
          </button>

          {/* Badge de Alertas Viales */}
          <div
            style={{
              padding: '5px 9px',
              borderRadius: '16px',
              background: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              border: activeAlertsCount > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.4)',
              color: activeAlertsCount > 0 ? '#fca5a5' : '#34d399',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <AlertTriangle size={12} color={activeAlertsCount > 0 ? '#f87171' : '#10b981'} />
            <span>{activeAlertsCount} {activeAlertsCount === 1 ? 'alerta' : 'alertas'}</span>
          </div>

          {/* Badge de Combis GPS en Vivo */}
          <div
            style={{
              padding: '5px 9px',
              borderRadius: '16px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              color: '#60a5fa',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Radio size={12} color="#60a5fa" />
            <span>{telemetryUnits.length} combis</span>
          </div>

          {/* ÁREA DE SESIÓN: Visitante discreto vs Usuario Autenticado */}
          {!currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
              <button
                type="button"
                id="btn-header-login"
                onClick={() => {
                  setAuthPromptMessage(null);
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                style={{
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                <LogIn size={13} />
                <span>Iniciar sesión</span>
              </button>

              <button
                type="button"
                id="btn-header-register"
                onClick={() => {
                  setAuthPromptMessage(null);
                  setAuthModalMode('register');
                  setAuthModalOpen(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px'
                }}
              >
                ¿No tienes cuenta? Regístrate
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                  {currentUser.name}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background:
                      currentUser.role === 'ADMIN'
                        ? 'rgba(2, 132, 199, 0.3)'
                        : currentUser.role === 'SUPPORT'
                        ? 'rgba(37, 99, 235, 0.3)'
                        : 'rgba(16, 185, 129, 0.3)',
                    color:
                      currentUser.role === 'ADMIN'
                        ? '#7dd3fc'
                        : currentUser.role === 'SUPPORT'
                        ? '#93c5fd'
                        : '#6ee7b7'
                  }}
                >
                  {currentUser.role === 'ADMIN'
                    ? 'Admin'
                    : currentUser.role === 'SUPPORT'
                    ? 'Soporte'
                    : 'Pasajero'}
                </span>
              </div>

              <button
                type="button"
                id="btn-header-logout"
                onClick={handleLogout}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Cerrar sesión actual"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          {/* Botón Recargar */}
          <button
            type="button"
            onClick={() => {
              reloadRoutes();
              fetchIncidentsList();
            }}
            disabled={loading || loadingIncidents}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Recargar datos del sistema"
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </header>

      {/* 2. ÁREA DE TRABAJO PRINCIPAL: SIDEBAR MULTI-PERFIL + MAPA */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Panel Lateral Desplegable */}
        {sidebarOpen && (
          <aside
            style={{
              width: '400px',
              maxWidth: '92vw',
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
            {/* Header del Perfil Activo */}
            <div
              style={{
                padding: '10px 16px',
                background:
                  currentRole === 'ADMIN'
                    ? 'linear-gradient(90deg, rgba(2, 132, 199, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : currentRole === 'SUPPORT'
                    ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : 'linear-gradient(90deg, rgba(5, 150, 105, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentRole === 'ADMIN' ? (
                  <Shield size={16} color="#7dd3fc" />
                ) : currentRole === 'SUPPORT' ? (
                  <Headphones size={16} color="#93c5fd" />
                ) : (
                  <User size={16} color="#6ee7b7" />
                )}
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                  {currentRole === 'ADMIN'
                    ? 'Consola de Administración de Flota'
                    : currentRole === 'SUPPORT'
                    ? 'Consola de Soporte Vial & Alertas'
                    : 'Portal del Pasajero de Tuxtla'}
                </span>
              </div>
            </div>

            {/* Sub-Pestañas para el Perfil USUARIO */}
            {currentRole === 'USER' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  padding: '8px 12px 0 12px',
                  gap: '4px',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setUserTab('routes')}
                  style={{
                    padding: '8px 4px',
                    background: userTab === 'routes' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'routes' ? '2px solid var(--color-primary-light)' : '2px solid transparent',
                    color: userTab === 'routes' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Bus size={13} />
                  <span>Rutas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserTab('planner')}
                  style={{
                    padding: '8px 4px',
                    background: userTab === 'planner' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'planner' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: userTab === 'planner' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Compass size={13} color="#38bdf8" />
                  <span>¿Qué Combi?</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserTab('schedule')}
                  style={{
                    padding: '8px 4px',
                    background: userTab === 'schedule' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: userTab === 'schedule' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: userTab === 'schedule' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Clock size={13} />
                  <span>Horarios</span>
                </button>
              </div>
            )}

            {/* Contenido según el rol activo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {/* ROL USUARIO */}
              {currentRole === 'USER' && (
                <>
                  {userTab === 'routes' && (
                    <RouteSelector
                      routes={routes}
                      selectedRouteId={selectedRouteId}
                      visibleRouteIds={visibleRouteIds}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={handleToggleFavorite}
                      onSelectRoute={handleSelectRoute}
                      onToggleRouteVisibility={toggleRouteVisibility}
                      onShowAllRoutes={showAllRoutes}
                      onShowFavoriteRoutes={() => showFavoriteRoutes(favoriteIds)}
                      onClearAllRoutes={clearAllRoutes}
                    />
                  )}

                  {userTab === 'planner' && (
                    <TripPlannerPanel
                      personalPoints={personalPoints}
                      userLocation={userLocation}
                      currentUser={currentUser}
                      onRequestAuthPrompt={handleRequestAuthPrompt}
                      onPickPointOnMap={(type) => {
                        if (!currentUser && (type === 'casa' || type === 'escuela' || type === 'trabajo')) {
                          if (type === 'casa') handleRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Casa');
                          if (type === 'escuela') handleRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Escuela');
                          if (type === 'trabajo') handleRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Trabajo');
                          return;
                        }
                        setPickingTarget(type);
                      }}
                      pickingTarget={pickingTarget}
                      onSelectTrip={(trip) => {
                        setSelectedTrip(trip);
                        selectRoute(null);
                      }}
                      selectedTrip={selectedTrip}
                    />
                  )}

                  {userTab === 'schedule' && (
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
                </>
              )}

              {/* ROL SOPORTE VIAL */}
              {currentRole === 'SUPPORT' && (
                <SupportPanel
                  routes={routes}
                  incidents={incidents}
                  onRefreshIncidents={fetchIncidentsList}
                  onPickCoordinateOnMap={() => setPickingTarget('incident')}
                  pickingTarget={pickingTarget}
                  pickedCoordinate={pickedSupportCoordinate}
                />
              )}

              {/* ROL ADMINISTRADOR */}
              {currentRole === 'ADMIN' && (
                <AdminPanel
                  routes={routes}
                  telemetryUnits={telemetryUnits}
                  incidents={incidents}
                  onReloadRoutes={reloadRoutes}
                  onRefreshIncidents={fetchIncidentsList}
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
            personalPoints={personalPoints}
            incidents={incidents}
            selectedTrip={selectedTrip}
            pickingTarget={pickingTarget}
            visibleRouteIds={visibleRouteIds}
            directionFilter={directionFilter}
            onToggleRouteVisibility={toggleRouteVisibility}
            onShowAllRoutes={showAllRoutes}
            onClearAllRoutes={clearAllRoutes}
            onShowFavoriteRoutes={showFavoriteRoutes}
            onSetDirectionFilter={setDirectionFilter}
            onPickCoordinate={handlePickCoordinate}
            onCancelPicking={() => setPickingTarget(null)}
            onMapClick={setUserLocation}
            onSelectRoute={handleSelectRoute}
            onSelectStop={selectStop}
          />
        </main>
      </div>

      {/* Modal de Reporte Ciudadano */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        routes={routes}
        userLocation={userLocation}
        onIncidentReported={fetchIncidentsList}
      />

      {/* Modal de Autenticación y Avisos Contextuales */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthPromptMessage(null);
        }}
        initialMode={authModalMode}
        promptMessage={authPromptMessage}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
