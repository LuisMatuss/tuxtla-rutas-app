// Componente Raíz: Plataforma Web y GIS Tuxtla Rutas
// Navegación fluida en 1 clic entre Landing Page ("Inicio") y Mapa en Vivo ("Mapa en Vivo"),
// Sistema Multi-Perfil (Pasajero, Soporte Vial, Administrador) y Telemetría GPS en Tiempo Real.

import React, { useState, useEffect } from 'react';
import {
  Bus,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Radio,
  Compass,
  Shield,
  Headphones,
  User,
  AlertTriangle,
  Megaphone,
  LogIn,
  Home
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo.jsx';
import { LandingPage } from './components/LandingPage.jsx';
import { RouteSelector } from './components/Sidebar/RouteSelector.jsx';
import { TripPlannerPanel } from './components/Sidebar/TripPlannerPanel.jsx';
import { SupportPanel } from './components/Sidebar/SupportPanel.jsx';
import { AdminPanel } from './components/Sidebar/AdminPanel.jsx';
import { ReportIncidentModal } from './components/Sidebar/ReportIncidentModal.jsx';
import {
  AuthModal,
  loadStoredUsers,
  saveStoredUsers,
  loadCurrentSessionUser,
  saveCurrentSessionUser
} from './components/AuthModal.jsx';
import { MapView } from './components/Map/MapView.jsx';
import { useGeoRoutes } from './hooks/useGeoRoutes.js';
import { apiClient } from './api/client.js';

const EMPTY_PERSONAL_POINTS = {
  home: null,
  school: null,
  work: null,
  casa: null,
  escuela: null,
  trabajo: null
};

function normalizeAppRole(role) {
  const upper = String(role || '').toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'SUPPORT') return 'SUPPORT';
  return 'USER';
}

function extractPersonalPoints(rawPoints) {
  if (!rawPoints || Array.isArray(rawPoints) || typeof rawPoints !== 'object') {
    return EMPTY_PERSONAL_POINTS;
  }
  return {
    home: rawPoints.home || rawPoints.casa || null,
    school: rawPoints.school || rawPoints.escuela || null,
    work: rawPoints.work || rawPoints.trabajo || null,
    casa: rawPoints.home || rawPoints.casa || null,
    escuela: rawPoints.school || rawPoints.escuela || null,
    trabajo: rawPoints.work || rawPoints.trabajo || null
  };
}

function extractFavoriteIds(user) {
  if (!user) return [];
  if (Array.isArray(user.favoriteRoutes)) return user.favoriteRoutes;
  if (Array.isArray(user.favoriteIds)) return user.favoriteIds;
  return [];
}

export default function App() {
  const {
    routes,
    selectedRouteId,
    selectedRoute,
    activeStop,
    userLocation,
    telemetryUnits,
    visibleRouteIds,
    directionFilter,
    loading,
    selectRoute,
    selectStop,
    setUserLocation,
    clearUserLocation,
    setVisibleRouteIds,
    toggleRouteVisibility,
    showAllRoutes,
    clearAllRoutes,
    showFavoriteRoutes,
    setDirectionFilter,
    reloadRoutes
  } = useGeoRoutes();

  // Vista activa: 'landing' por defecto al entrar (o 'map' si ?view=map)
  const [currentView, setCurrentView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') === 'map' ? 'map' : 'landing';
    } catch {
      return 'landing';
    }
  });

  // 1. Estado de Sesión y Usuario Activo
  const [currentUser, setCurrentUser] = useState(() => loadCurrentSessionUser());
  const [currentRole, setCurrentRole] = useState(() => normalizeAppRole(currentUser?.role));
  const [userTab, setUserTab] = useState('routes');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. Puntos Personales
  const [personalPoints, setPersonalPoints] = useState(() => {
    if (!currentUser) return EMPTY_PERSONAL_POINTS;
    return extractPersonalPoints(currentUser.personalPoints);
  });

  // 3. Rutas Favoritas
  const [favoriteIds, setFavoriteIds] = useState(() => extractFavoriteIds(currentUser));

  // 4. Modal de Autenticación y Avisos Contextuales
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authPromptMessage, setAuthPromptMessage] = useState(null);

  // 5. Modo Selección en Mapa (Picking)
  const [pickingTarget, setPickingTarget] = useState(null);
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

  // Revalidación de sesión persistida en localStorage contra PostgreSQL (GET /api/auth/me) al recargar con F5
  useEffect(() => {
    const stored = loadCurrentSessionUser();
    if (!stored || (!stored.id && !stored.email)) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.fetchCurrentUser({
          id: stored.id,
          email: stored.email
        });
        if (cancelled) return;
        if (res.success && res.user) {
          const freshUser = {
            ...stored,
            ...res.user,
            favoriteRoutes: extractFavoriteIds(res.user),
            favoriteIds: extractFavoriteIds(res.user)
          };
          setCurrentUser(freshUser);
          setCurrentRole(normalizeAppRole(freshUser.role));
          setPersonalPoints(extractPersonalPoints(freshUser.personalPoints));
          setFavoriteIds(extractFavoriteIds(freshUser));
          saveCurrentSessionUser(freshUser);
        } else if (res.notFound) {
          saveCurrentSessionUser(null);
          setCurrentUser(null);
          setCurrentRole('USER');
          setPersonalPoints(EMPTY_PERSONAL_POINTS);
          setFavoriteIds([]);
        }
      } catch {
        // Si el backend no responde temporalmente, conservar la sesión persistida en localStorage
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestAuthPrompt = (message) => {
    setAuthPromptMessage(message);
    setAuthModalMode('prompt');
    setAuthModalOpen(true);
  };

  const handleToggleFavorite = (routeId) => {
    if (!currentUser) {
      handleRequestAuthPrompt('Inicia sesión para poder guardar tus rutas favoritas');
      return;
    }

    setFavoriteIds((prev) => {
      const next = prev.includes(routeId) ? prev.filter((id) => id !== routeId) : [...prev, routeId];
      const updatedUser = {
        ...currentUser,
        favoriteRoutes: next,
        favoriteIds: next
      };
      setCurrentUser(updatedUser);
      saveCurrentSessionUser(updatedUser);
      const allUsers = loadStoredUsers();
      saveStoredUsers(allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      apiClient.updateUserPreferences({
        id: updatedUser.id,
        email: updatedUser.email,
        favoriteRoutes: next
      });
      return next;
    });
  };

  const handleLogout = () => {
    saveCurrentSessionUser(null);
    setCurrentUser(null);
    setCurrentRole('USER');
    setPersonalPoints(EMPTY_PERSONAL_POINTS);
    setFavoriteIds([]);
    setPickingTarget(null);
    setAuthPromptMessage(null);
  };

  const handleLoginSuccess = (user) => {
    const normalizedFavs = extractFavoriteIds(user);
    const enrichedUser = {
      ...user,
      favoriteRoutes: normalizedFavs,
      favoriteIds: normalizedFavs
    };
    setCurrentUser(enrichedUser);
    setCurrentRole(normalizeAppRole(enrichedUser.role));
    setPersonalPoints(extractPersonalPoints(enrichedUser.personalPoints));
    setFavoriteIds(normalizedFavs);
    setAuthPromptMessage(null);
    setCurrentView('map');
  };

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
        apiClient.updateUserPreferences({
          id: updatedUser.id,
          email: updatedUser.email,
          personalPoints: updated
        });
      }
      setPickingTarget(null);
    } else if (pickingTarget === 'incident') {
      setPickedSupportCoordinate(coords);
      setPickingTarget(null);
    }
  };

  const handleSelectRoute = (id) => {
    selectRoute(id);
    setSelectedTrip(null);
    if (id && !visibleRouteIds.includes(id)) {
      toggleRouteVisibility(id);
    }
  };

  // Navegación en 1 clic desde los 12 badges de la Landing Page hacia el Mapa en Vivo
  const handleSelectRouteFromLanding = (routeId) => {
    setCurrentRole('USER');
    setUserTab('routes');
    setSidebarOpen(true);
    setSelectedTrip(null);
    if (selectedRouteId !== routeId) {
      selectRoute(routeId);
    }
    setVisibleRouteIds((prev) => (prev.includes(routeId) ? prev : [...prev, routeId]));
    setCurrentView('map');
  };

  // Navegación desde el Buscador Rápido del Hero hacia el Mapa (trazando ruta o abriendo radar)
  const handleSelectDestinationFromLanding = async (place) => {
    setCurrentRole('USER');
    setUserTab('routes');
    setSidebarOpen(true);
    setCurrentView('map');

    if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
      return;
    }

    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      try {
        const planRes = await apiClient.planTrip({
          originLat: userLocation.lat,
          originLng: userLocation.lng,
          destLat: place.lat,
          destLng: place.lng
        });
        const bestTrip =
          planRes?.data?.directOptions?.[0] ||
          planRes?.data?.transferOptions?.[0] ||
          null;
        if (bestTrip) {
          setSelectedTrip(bestTrip);
          if (selectedRouteId) selectRoute(null);
          if (bestTrip.routeId) {
            setVisibleRouteIds((prev) => (prev.includes(bestTrip.routeId) ? prev : [...prev, bestTrip.routeId]));
          }
          return;
        }
      } catch {
        // Si falla planificación directa, activar radar de cercanía en el destino
      }
    }

    if (selectedRouteId) selectRoute(null);
    setSelectedTrip(null);
    setUserLocation({ lat: place.lat, lng: place.lng });
  };

  const activeAlertsCount = incidents.filter((i) => i.status === 'ACTIVE_ALERT').length;

  return (
    <>
      {currentView === 'landing' ? (
        <LandingPage
          routes={routes}
          telemetryCount={telemetryUnits.length}
          currentUser={currentUser}
          onOpenMap={() => setCurrentView('map')}
          onSelectRouteFromLanding={handleSelectRouteFromLanding}
          onSelectDestinationFromLanding={handleSelectDestinationFromLanding}
          onOpenLogin={() => {
            setAuthPromptMessage(null);
            setAuthModalMode('login');
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-app)'
          }}
        >
          {/* 1. BARRA SUPERIOR DEL MAPA EN VIVO */}
          <header
            style={{
              height: '62px',
              background: 'rgba(15, 23, 42, 0.97)',
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
            {/* Identidad de Marca, Toggle de Sidebar y Botón Inicio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '7px',
                  color: '#F8FAFC',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={sidebarOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
              >
                {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <BrandLogo size={38} alt="Emblema Tuxtla Rutas" />
                <div>
                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      margin: 0,
                      color: '#F8FAFC',
                      lineHeight: 1.32
                    }}
                  >
                    Tuxtla Rutas
                  </h1>
                  <span style={{ fontSize: '12px', color: '#CBD5E1', display: 'block' }}>
                    Movilidad Urbana &bull; Chiapas
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-header-home"
                onClick={() => setCurrentView('landing')}
                title="Volver a la página de Inicio"
                style={{
                  marginLeft: '4px',
                  padding: '6px 11px',
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Home size={13} color="#F59E0B" />
                <span>Inicio</span>
              </button>
            </div>

            {/* 2. SELECTOR DE ROLES (SOPORTE / ADMIN) */}
            {(currentUser?.role === 'SUPPORT' || currentUser?.role === 'ADMIN') && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1E293B',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '2px'
                }}
              >
                {[
                  {
                    id: 'USER',
                    label: 'Pasajero',
                    Icon: User,
                    activeBg: '#065F46',
                    activeColor: '#FFFFFF',
                    title: 'Modo Pasajero: Rutas, Qué combi tomo y horarios'
                  },
                  {
                    id: 'SUPPORT',
                    label: 'Soporte Vial',
                    Icon: Headphones,
                    activeBg: '#0369A1',
                    activeColor: '#FFFFFF',
                    title: 'Centro de Alertas y Reportes Ciudadanos'
                  },
                  {
                    id: 'ADMIN',
                    label: 'Administrador',
                    Icon: Shield,
                    activeBg: '#F59E0B',
                    activeColor: '#0F172A',
                    title: 'Control Operativo de Frecuencias y Flota'
                  }
                ].map((role) => {
                  const isSelected = currentRole === role.id;
                  const RoleIcon = role.Icon;
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
                        background: isSelected ? role.activeBg : 'transparent',
                        border: 'none',
                        borderRadius: '7px',
                        color: isSelected ? role.activeColor : '#CBD5E1',
                        fontSize: '12px',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <RoleIcon size={13} />
                      <span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. ACCIONES RÁPIDAS, BADGES Y SESIÓN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  borderRadius: '8px',
                  color: '#FCA5A5',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Enviar reporte ciudadano de combi llena o bloqueo"
              >
                <Megaphone size={13} />
                <span>Reportar Incidente</span>
              </button>

              <div
                style={{
                  padding: '5px 10px',
                  borderRadius: '16px',
                  background: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(13, 148, 104, 0.18)',
                  border: activeAlertsCount > 0 ? '1px solid rgba(239, 68, 68, 0.48)' : '1px solid rgba(16, 185, 129, 0.42)',
                  color: activeAlertsCount > 0 ? '#FCA5A5' : '#6EE7B7',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle size={12} color={activeAlertsCount > 0 ? '#F87171' : '#10B981'} />
                <span>
                  {activeAlertsCount} {activeAlertsCount === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>

              <div
                style={{
                  padding: '5px 10px',
                  borderRadius: '16px',
                  background: 'rgba(2, 132, 199, 0.18)',
                  border: '1px solid rgba(56, 189, 248, 0.42)',
                  color: '#7DD3FC',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Radio size={12} color="#38BDF8" />
                <span>{telemetryUnits.length} combis</span>
              </div>

              {!currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '2px' }}>
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
                      background: '#F59E0B',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <LogIn size={13} color="#0F172A" />
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
                      color: '#7DD3FC',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '4px 6px',
                      textDecoration: 'underline'
                    }}
                  >
                    Regístrate
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '2px' }}>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
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
                            ? 'rgba(245, 158, 11, 0.22)'
                            : currentUser.role === 'SUPPORT'
                            ? 'rgba(2, 132, 199, 0.25)'
                            : 'rgba(13, 148, 104, 0.25)',
                        color:
                          currentUser.role === 'ADMIN'
                            ? '#FDE68A'
                            : currentUser.role === 'SUPPORT'
                            ? '#7DD3FC'
                            : '#6EE7B7'
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
                      background: 'rgba(239, 68, 68, 0.16)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      color: '#FCA5A5',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                    title="Cerrar sesión actual"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}

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
                  color: '#CBD5E1',
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

          {/* 2. ÁREA DE TRABAJO PRINCIPAL: SIDEBAR + MAPA */}
          <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
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
                    background: '#1E293B',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {currentRole === 'ADMIN' ? (
                      <Shield size={15} color="#FBBF24" />
                    ) : currentRole === 'SUPPORT' ? (
                      <Headphones size={15} color="#38BDF8" />
                    ) : (
                      <User size={15} color="#10B981" />
                    )}
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#F8FAFC'
                      }}
                    >
                      {currentRole === 'ADMIN'
                        ? 'Consola de Administración de Flota'
                        : currentRole === 'SUPPORT'
                        ? 'Consola de Soporte Vial y Alertas'
                        : 'Portal del Pasajero de Tuxtla'}
                    </span>
                  </div>
                </div>

                {/* Sub-Pestañas para el Perfil USUARIO */}
                {currentRole === 'USER' && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      padding: '6px 12px 0 12px',
                      gap: '4px',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <button
                      type="button"
                      id="tab-btn-rutas"
                      onClick={() => setUserTab('routes')}
                      style={{
                        padding: '8px 4px',
                        background: userTab === 'routes' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                        border: 'none',
                        borderBottom: userTab === 'routes' ? '2px solid #10B981' : '2px solid transparent',
                        color: userTab === 'routes' ? '#FFFFFF' : '#A8B8CD',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Bus size={13} color={userTab === 'routes' ? '#10B981' : '#A8B8CD'} />
                      <span>Rutas</span>
                    </button>

                    <button
                      type="button"
                      id="tab-btn-planner"
                      onClick={() => setUserTab('planner')}
                      style={{
                        padding: '8px 4px',
                        background: userTab === 'planner' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                        border: 'none',
                        borderBottom: userTab === 'planner' ? '2px solid #F59E0B' : '2px solid transparent',
                        color: userTab === 'planner' ? '#FFFFFF' : '#A8B8CD',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Compass size={13} color={userTab === 'planner' ? '#F59E0B' : '#A8B8CD'} />
                      <span>¿Cómo llego?</span>
                    </button>
                  </div>
                )}

                {/* Contenido según el rol activo */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
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
                          activeStop={activeStop}
                          onSelectStop={selectStop}
                          userLocation={userLocation}
                          onSetUserLocation={setUserLocation}
                          onClearUserLocation={clearUserLocation}
                          directionFilter={directionFilter}
                          onSetDirectionFilter={setDirectionFilter}
                          onSelectTrip={(trip) => {
                            setSelectedTrip(trip);
                            selectRoute(null);
                          }}
                          selectedTrip={selectedTrip}
                          onSwitchToPlanner={() => setUserTab('planner')}
                        />
                      )}

                      {userTab === 'planner' && (
                        <TripPlannerPanel
                          routes={routes}
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
                            if (trip) {
                              if (trip.routeId && !visibleRouteIds.includes(trip.routeId)) {
                                setVisibleRouteIds((prev) => [...prev, trip.routeId]);
                              }
                              if (trip.firstLeg?.routeId && !visibleRouteIds.includes(trip.firstLeg.routeId)) {
                                setVisibleRouteIds((prev) => [...prev, trip.firstLeg.routeId]);
                              }
                              if (trip.secondLeg?.routeId && !visibleRouteIds.includes(trip.secondLeg.routeId)) {
                                setVisibleRouteIds((prev) => [...prev, trip.secondLeg.routeId]);
                              }
                            }
                          }}
                          selectedTrip={selectedTrip}
                        />
                      )}
                    </>
                  )}

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
                onClearUserLocation={clearUserLocation}
                onStartTripFromLocation={(coords) => {
                  setUserLocation(coords);
                  setUserTab('planner');
                  setSidebarOpen(true);
                }}
                onSelectRoute={handleSelectRoute}
                onSelectStop={selectStop}
              />
            </main>
          </div>

          <ReportIncidentModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            routes={routes}
            userLocation={userLocation}
            onIncidentReported={() => {
              fetchIncidentsList();
            }}
          />
        </div>
      )}

      {/* Modal de Autenticación disponible tanto en Landing Page como en Mapa en Vivo */}
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
    </>
  );
}
