// Componente de Panel Lateral: Selector interactivo y buscador de rutas y direcciones
// Soporta búsqueda inteligente en paradas, colonias y Nominatim OSM en Tuxtla Gutiérrez,
// trazado directo de combis al destino, y visualización compacta de frecuencias y paradas Ida/Vuelta.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bus,
  Layers,
  MapPin,
  Search,
  Star,
  Eye,
  EyeOff,
  Navigation,
  Compass,
  ArrowRight,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { searchTuxtlaAddresses, apiClient } from '../../api/client.js';

export function RouteSelector({
  routes = [],
  selectedRouteId = null,
  visibleRouteIds = [],
  favoriteIds = [],
  onToggleFavorite,
  onSelectRoute,
  onToggleRouteVisibility,
  onShowAllRoutes,
  onClearAllRoutes,
  activeStop = null,
  onSelectStop,
  userLocation = null,
  onSetUserLocation,
  onClearUserLocation,
  directionFilter = 'ALL',
  onSetDirectionFilter,
  onSelectTrip,
  selectedTrip = null,
  onSwitchToPlanner
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inlineDirection, setInlineDirection] = useState('ALL'); // 'ALL' | 'IDA' | 'VUELTA'
  const [activePlannedTrip, setActivePlannedTrip] = useState(null);

  const searchContainerRef = useRef(null);
  const favorites = Array.isArray(favoriteIds) ? favoriteIds : [];

  // Búsqueda inteligente de direcciones y paradas con debounce
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setAddressSuggestions([]);
      setIsSearchingAddresses(false);
      return;
    }

    let isMounted = true;
    setIsSearchingAddresses(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchTuxtlaAddresses(searchTerm);
        if (isMounted) {
          setAddressSuggestions(results);
          setShowDropdown(results.length > 0);
        }
      } catch (err) {
        if (isMounted) setAddressSuggestions([]);
      } finally {
        if (isMounted) setIsSearchingAddresses(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleFavorite = (routeId, e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(routeId);
    }
  };

  // Manejador al elegir sugerencia de dirección o lugar
  const handleSelectSuggestion = async (item) => {
    setShowDropdown(false);
    setSearchTerm('');

    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      // Caso A: Ya tiene un punto activo en el mapa -> Calcular qué combi tomar desde ese punto hasta la dirección buscada
      try {
        const planRes = await apiClient.planTrip({
          originLat: userLocation.lat,
          originLng: userLocation.lng,
          destLat: item.lat,
          destLng: item.lng
        });

        if (planRes?.data) {
          const trip =
            planRes.data.directOptions?.[0] ||
            planRes.data.transferOptions?.[0] ||
            null;

          if (trip) {
            setActivePlannedTrip(trip);
            if (onSelectTrip) onSelectTrip(trip);
            // Asegurar que la ruta esté visible en el mapa
            if (trip.routeId && onToggleRouteVisibility && !visibleRouteIds.includes(trip.routeId)) {
              onToggleRouteVisibility(trip.routeId);
            }
          }
        }
      } catch (err) {
        console.warn('Error al calcular trayecto hacia dirección buscada:', err);
      }
    } else {
      // Caso B: No tiene punto previo -> Mover el mapa a esa dirección y abrir ahí mismo el círculo radar
      if (onSetUserLocation) {
        onSetUserLocation({ lat: item.lat, lng: item.lng });
      }
    }
  };

  // Filtrado de lista de rutas por término
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (filterFavorites && !favorites.includes(r.id)) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    });
  }, [routes, searchTerm, filterFavorites, favorites]);

  // Ruta seleccionada
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Barra de Búsqueda Inteligente de Direcciones y Rutas */}
      <div ref={searchContainerRef} style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: isSearchingAddresses ? '#10b981' : 'var(--text-muted)'
          }}
        />
        <input
          type="text"
          id="search-route-input"
          placeholder="Buscar ruta, calle o dirección destino..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (addressSuggestions.length > 0) setShowDropdown(true);
          }}
          style={{
            width: '100%',
            padding: '9px 12px 9px 36px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease'
          }}
          onFocusCapture={(e) => (e.target.style.borderColor = '#10b981')}
          onBlurCapture={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setAddressSuggestions([]);
              setShowDropdown(false);
            }}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <X size={14} />
          </button>
        )}

        {/* Desplegable de Sugerencias de Direcciones y Paradas */}
        {showDropdown && addressSuggestions.length > 0 && (
          <div
            id="search-address-suggestions-dropdown"
            style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              right: 0,
              zIndex: 1200,
              background: 'rgba(15, 23, 42, 0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.65)',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px'
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#10b981',
                textTransform: 'uppercase',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              Lugares y Paradas en Tuxtla ({addressSuggestions.length})
            </div>

            {addressSuggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: item.type === 'stop' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <MapPin size={13} color={item.type === 'stop' ? '#38bdf8' : '#10b981'} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.secondaryText}
                  </div>
                </div>

                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                  {userLocation ? 'Ir ➔' : 'Ver 🔍'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarjeta de Trayecto Planificado Activo (si se calculó desde el buscador) */}
      {activePlannedTrip && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1.5px solid #10b981',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={14} color="#10b981" />
              <strong style={{ fontSize: '13px', color: '#f8fafc' }}>
                Ruta recomendada al destino
              </strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setActivePlannedTrip(null);
                if (onSelectTrip) onSelectTrip(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: activePlannedTrip.routeColor || '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              {activePlannedTrip.routeName || 'Combi'}
            </span>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              ⏱️ ~{activePlannedTrip.estimatedMinutes || 15} min
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              ({activePlannedTrip.stopsCount || 5} paradas)
            </span>
          </div>

          {onSwitchToPlanner && (
            <button
              type="button"
              onClick={onSwitchToPlanner}
              style={{
                marginTop: '2px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#6ee7b7',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>Ver recorrido paso a paso en "¿Cómo llego?"</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* Botones de Filtro Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        <button
          type="button"
          onClick={() => {
            setFilterFavorites(false);
            onSelectRoute(null);
            if (onShowAllRoutes) onShowAllRoutes();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '8px 6px',
            borderRadius: 'var(--radius-md)',
            border: !selectedRouteId && !filterFavorites ? '1.5px solid var(--color-primary-light)' : '1px solid var(--border-subtle)',
            background: !selectedRouteId && !filterFavorites ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            color: !selectedRouteId && !filterFavorites ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={13} color={!selectedRouteId && !filterFavorites ? '#10b981' : '#94a3b8'} />
          <span>Todas ({routes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterFavorites(!filterFavorites)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '8px 6px',
            borderRadius: 'var(--radius-md)',
            border: filterFavorites ? '1.5px solid #fbbf24' : '1px solid var(--border-subtle)',
            background: filterFavorites ? 'rgba(251, 191, 36, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            color: filterFavorites ? '#fbbf24' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <Star size={13} fill={filterFavorites ? '#fbbf24' : 'none'} color="#fbbf24" />
          <span>Favoritas ({favorites.length})</span>
        </button>

        <button
          type="button"
          id="btn-limpiar-mapa-sidebar"
          title="Limpiar Mapa"
          onClick={() => {
            if (onClearAllRoutes) onClearAllRoutes();
            if (onClearUserLocation) onClearUserLocation();
            setActivePlannedTrip(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '8px 6px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <span>🧹 Limpiar</span>
        </button>
      </div>

      {/* Lista de Tarjetas de Rutas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const routeColor = route.color || '#2563EB';
          const stopsCount = Array.isArray(route.stops) ? route.stops.length : 0;
          const isFavorite = favorites.includes(route.id);
          const isSuspended = route.status === 'SUSPENDED';
          const isDelayed = route.status === 'DELAYED';
          const isVisible = visibleRouteIds.includes(route.id);

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              style={{
                padding: '12px 8px',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'rgba(255, 255, 255, 0.08)'
                  : isSuspended
                  ? 'rgba(239, 68, 68, 0.05)'
                  : 'transparent',
                borderRadius: isSelected ? '8px' : '0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                opacity: isSuspended ? 0.75 : 1
              }}
            >
              <div>
                {/* Cabecera de la Tarjeta */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: isSuspended ? '#ef4444' : routeColor,
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                    <Bus size={15} color={isSuspended ? '#ef4444' : routeColor} />
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                      {route.name}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Badge de Frecuencia / Estado */}
                    {isSuspended ? (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.25)',
                          color: '#fca5a5',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        🔴 Suspendida
                      </span>
                    ) : isDelayed ? (
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.25)',
                          color: '#fde047',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        🟡 Retrasos
                      </span>
                    ) : (
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {route.scheduleInfo?.frequencyMinutes ? `${route.scheduleInfo.frequencyMinutes} min` : 'Activa'}
                      </span>
                    )}

                    {/* Botón Ver en Mapa */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleRouteVisibility) onToggleRouteVisibility(route.id);
                      }}
                      style={{
                        background: isVisible ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                        border: isVisible ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: isVisible ? '#38bdf8' : '#94a3b8'
                      }}
                      title={isVisible ? 'Ocultar del mapa' : 'Mostrar en el mapa'}
                    >
                      {isVisible ? <Eye size={13} color="#38bdf8" /> : <EyeOff size={13} color="#94a3b8" />}
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {isVisible ? 'En mapa' : 'Oculta'}
                      </span>
                    </button>

                    {/* Botón Favorito Estrella */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(route.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={isFavorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    >
                      <Star
                        size={15}
                        fill={isFavorite ? '#fbbf24' : 'none'}
                        color={isFavorite ? '#fbbf24' : '#64748b'}
                      />
                    </button>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    lineHeight: '1.4',
                    margin: '4px 0 8px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: isSelected ? 3 : 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {route.description}
                </p>

                {/* Info Compacta General */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color={routeColor} />
                    {stopsCount} paradas
                  </span>

                  <span>
                    🕒 Cada {route.scheduleInfo?.frequencyMinutes || 6} min • {route.scheduleInfo?.firstRun || '05:30'} - {route.scheduleInfo?.lastRun || '22:00'}
                  </span>
                </div>

                {/* DETALLE COMPACTO INLINE CUANDO LA RUTA ESTÁ SELECCIONADA (REQUERIMIENTO 1) */}
                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Badge de Horario y Frecuencia Compacto */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8' }}>
                        <Clock size={13} />
                        <span style={{ fontWeight: 700 }}>
                          Cada {route.scheduleInfo?.frequencyMinutes || 6} min
                        </span>
                        <span style={{ color: '#94a3b8' }}>•</span>
                        <span style={{ color: '#e2e8f0' }}>
                          {route.scheduleInfo?.firstRun || '05:30'} - {route.scheduleInfo?.lastRun || '22:00'}
                        </span>
                      </div>

                      <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        Activo
                      </span>
                    </div>

                    {/* Selector de Sentido de Paradas: Ida / Vuelta / Todas */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                        PARADAS ({stopsCount})
                      </span>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { id: 'ALL', label: 'Todas' },
                          { id: 'IDA', label: 'Ida (➔)' },
                          { id: 'VUELTA', label: 'Vuelta (↩)' }
                        ].map((m) => {
                          const isActiveMode = inlineDirection === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setInlineDirection(m.id);
                                if (onSetDirectionFilter) onSetDirectionFilter(m.id);
                              }}
                              style={{
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: isActiveMode ? `1px solid ${routeColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                                background: isActiveMode ? `${routeColor}33` : 'transparent',
                                color: isActiveMode ? '#ffffff' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: isActiveMode ? 700 : 500,
                                cursor: 'pointer'
                              }}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lista Vertical de Paradas Interactivas */}
                    <div
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        paddingRight: '2px'
                      }}
                    >
                      {Array.isArray(route.stops) && route.stops.length > 0 ? (
                        (inlineDirection === 'VUELTA'
                          ? [...route.stops].reverse()
                          : route.stops
                        ).map((stop, sIdx) => {
                          const isStopActive = activeStop?.id === stop.id;
                          const orderNum = stop.stopOrder || sIdx + 1;

                          return (
                            <div
                              key={stop.id || `${stop.lat}-${stop.lng}`}
                              onClick={() => {
                                if (onSelectStop) onSelectStop(stop);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: isStopActive
                                  ? `${routeColor}33`
                                  : 'rgba(255, 255, 255, 0.03)',
                                border: isStopActive
                                  ? `1px solid ${routeColor}`
                                  : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isStopActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isStopActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                              }}
                            >
                              <span
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: isStopActive ? routeColor : 'rgba(255, 255, 255, 0.12)',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {orderNum}
                              </span>

                              <span
                                style={{
                                  fontSize: '12px',
                                  color: isStopActive ? '#ffffff' : '#cbd5e1',
                                  fontWeight: isStopActive ? 700 : 400,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: 1
                                }}
                              >
                                {stop.name}
                              </span>

                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                📍
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px' }}>
                          Sin paradas registradas para esta ruta.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredRoutes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px' }}>
            {filterFavorites
              ? 'No tienes rutas marcadas como favoritas. Haz clic en la estrella ⭐ de cualquier ruta para guardarla.'
              : 'No se encontraron rutas que coincidan con la búsqueda.'}
          </div>
        )}
      </div>
    </div>
  );
}
