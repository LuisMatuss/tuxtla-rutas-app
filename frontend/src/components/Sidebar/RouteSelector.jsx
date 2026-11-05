// Componente de Panel Lateral: Selector interactivo y buscador de rutas y direcciones
// Paleta Colectivo Tuxtla (Cero tarjetas anidadas, contraste WCAG AA y tipografía >= 12px)

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
  ArrowRight,
  Clock,
  CheckCircle2,
  RotateCcw,
  X
} from 'lucide-react';
import { searchTuxtlaAddresses, apiClient } from '../../api/client.js';

function resolveColectivoColor(rawColor) {
  if (!rawColor) return '#0284C7';
  const upper = rawColor.toUpperCase();
  // Reemplazar cualquier tono índigo/violeta heredado por Azul Cielo Colectivo
  if (upper === '#4F46E5' || upper === '#6366F1' || upper === '#7C3AED' || upper === '#8B5CF6') {
    return '#0284C7';
  }
  return rawColor;
}

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
  onSetDirectionFilter,
  onSelectTrip,
  onSwitchToPlanner
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inlineDirection, setInlineDirection] = useState('ALL');
  const [activePlannedTrip, setActivePlannedTrip] = useState(null);

  const searchContainerRef = useRef(null);
  const favorites = Array.isArray(favoriteIds) ? favoriteIds : [];

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
      } catch {
        if (isMounted) setAddressSuggestions([]);
      } finally {
        if (isMounted) setIsSearchingAddresses(false);
      }
    }, 260);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

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

  const handleSelectSuggestion = async (item) => {
    setShowDropdown(false);
    setSearchTerm('');

    if (userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
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
            if (trip.routeId && onToggleRouteVisibility && !visibleRouteIds.includes(trip.routeId)) {
              onToggleRouteVisibility(trip.routeId);
            }
          }
        }
      } catch (err) {
        console.warn('Error al calcular trayecto hacia dirección buscada:', err);
      }
    } else if (onSetUserLocation) {
      onSetUserLocation({ lat: item.lat, lng: item.lng });
    }
  };

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
            color: isSearchingAddresses ? '#10B981' : '#38BDF8'
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
            padding: '9px 32px 9px 36px',
            background: '#1E293B',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: '#F8FAFC',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease'
          }}
          onFocusCapture={(e) => (e.target.style.borderColor = '#38BDF8')}
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
            aria-label="Limpiar texto"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}

        {/* Desplegable de Sugerencias */}
        {showDropdown && addressSuggestions.length > 0 && (
          <div
            id="search-address-suggestions-dropdown"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 1200,
              background: '#0F172A',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
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
                color: '#6EE7B7',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              Lugares y paradas en Tuxtla ({addressSuggestions.length})
            </div>

            {addressSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  width: '100%'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1E293B')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <MapPin
                  size={14}
                  color={item.type === 'stop' ? '#38BDF8' : '#10B981'}
                  style={{ flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#F8FAFC',
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
                      color: '#A8B8CD',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.secondaryText}
                  </div>
                </div>

                <span style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 700, flexShrink: 0 }}>
                  {userLocation ? 'Ir ➔' : 'Ver'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trayecto Planificado Activo (Fila destacada sin tarjetas anidadas) */}
      {activePlannedTrip && (
        <div
          style={{
            background: '#1E293B',
            border: '1px solid #10B981',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={14} color="#10B981" />
              <strong style={{ fontSize: '13px', color: '#F8FAFC' }}>
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
                color: '#CBD5E1',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <strong style={{ color: '#6EE7B7', fontWeight: 800 }}>
              {activePlannedTrip.routeName || 'Combi'}
            </strong>
            <span style={{ color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>
              • ~{activePlannedTrip.estimatedMinutes || 15} min
            </span>
            <span style={{ color: '#A8B8CD', fontVariantNumeric: 'tabular-nums' }}>
              ({activePlannedTrip.stopsCount || 5} paradas)
            </span>
          </div>

          {onSwitchToPlanner && (
            <button
              type="button"
              onClick={onSwitchToPlanner}
              style={{
                background: '#065F46',
                border: '1px solid #10B981',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
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
            border: !selectedRouteId && !filterFavorites ? '1px solid #10B981' : '1px solid var(--border-subtle)',
            background: !selectedRouteId && !filterFavorites ? 'rgba(13, 148, 104, 0.2)' : '#1E293B',
            color: !selectedRouteId && !filterFavorites ? '#FFFFFF' : '#CBD5E1',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <Layers size={13} color={!selectedRouteId && !filterFavorites ? '#10B981' : '#A8B8CD'} />
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
            border: filterFavorites ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
            background: filterFavorites ? 'rgba(245, 158, 11, 0.18)' : '#1E293B',
            color: filterFavorites ? '#FDE68A' : '#CBD5E1',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <Star size={13} fill={filterFavorites ? '#F59E0B' : 'none'} color="#F59E0B" />
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
            gap: '5px',
            padding: '8px 6px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(239, 68, 68, 0.42)',
            background: 'rgba(239, 68, 68, 0.14)',
            color: '#FCA5A5',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          <RotateCcw size={12} />
          <span>Limpiar</span>
        </button>
      </div>

      {/* Lista Limpia de Rutas con Separadores border-bottom (Cero nested-cards) */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const routeColor = resolveColectivoColor(route.color);
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
                borderBottom: '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'rgba(30, 41, 59, 0.85)'
                  : isSuspended
                  ? 'rgba(239, 68, 68, 0.06)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                opacity: isSuspended ? 0.78 : 1
              }}
            >
              {/* Cabecera de la Fila de Ruta */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isSuspended ? '#EF4444' : routeColor,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <Bus size={15} color={isSuspended ? '#EF4444' : routeColor} style={{ flexShrink: 0 }} />
                  <strong
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '13px',
                      color: '#FFFFFF',
                      lineHeight: 1.38
                    }}
                  >
                    {route.name}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {isSuspended ? (
                    <span
                      style={{
                        background: 'rgba(239, 68, 68, 0.22)',
                        color: '#FCA5A5',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      Suspendida
                    </span>
                  ) : isDelayed ? (
                    <span
                      style={{
                        background: 'rgba(245, 158, 11, 0.22)',
                        color: '#FDE68A',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      Retrasos
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#1E293B',
                        border: '1px solid var(--border-subtle)',
                        color: '#F8FAFC',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {route.scheduleInfo?.frequencyMinutes ? `${route.scheduleInfo.frequencyMinutes} min` : 'Activa'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleRouteVisibility) onToggleRouteVisibility(route.id);
                    }}
                    style={{
                      background: isVisible ? 'rgba(2, 132, 199, 0.22)' : 'transparent',
                      border: isVisible ? '1px solid rgba(56, 189, 248, 0.48)' : '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '3px 7px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: isVisible ? '#7DD3FC' : '#A8B8CD'
                    }}
                    title={isVisible ? 'Ocultar del mapa' : 'Mostrar en el mapa'}
                  >
                    {isVisible ? <Eye size={13} color="#38BDF8" /> : <EyeOff size={13} color="#A8B8CD" />}
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      {isVisible ? 'En mapa' : 'Oculta'}
                    </span>
                  </button>

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
                      fill={isFavorite ? '#F59E0B' : 'none'}
                      color={isFavorite ? '#F59E0B' : '#A8B8CD'}
                    />
                  </button>
                </div>
              </div>

              <p
                style={{
                  fontSize: '12px',
                  color: '#A8B8CD',
                  lineHeight: 1.45,
                  margin: '4px 0 8px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: isSelected ? 3 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {route.description}
              </p>

              {/* Metadatos compactos */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#CBD5E1',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} color={routeColor} />
                  <span>{stopsCount} paradas</span>
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} color="#F59E0B" />
                  <span>
                    Cada {route.scheduleInfo?.frequencyMinutes || 6} min • {route.scheduleInfo?.firstRun || '05:30'} - {route.scheduleInfo?.lastRun || '22:00'}
                  </span>
                </span>
              </div>

              {/* Detalle inline de paradas Ida/Vuelta cuando está seleccionada */}
              {isSelected && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#7DD3FC' }}>
                      <Clock size={13} />
                      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        Cada {route.scheduleInfo?.frequencyMinutes || 6} min
                      </span>
                      <span style={{ color: '#A8B8CD' }}>•</span>
                      <span style={{ color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>
                        {route.scheduleInfo?.firstRun || '05:30'} - {route.scheduleInfo?.lastRun || '22:00'}
                      </span>
                    </div>

                    <span style={{ fontSize: '12px', color: '#6EE7B7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Operativa</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#CBD5E1', fontVariantNumeric: 'tabular-nums' }}>
                      Paradas ({stopsCount})
                    </span>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { id: 'ALL', label: 'Todas' },
                        { id: 'IDA', label: 'Ida ➔' },
                        { id: 'VUELTA', label: 'Vuelta ↩' }
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
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: isActiveMode ? `1px solid ${routeColor}` : '1px solid var(--border-subtle)',
                              background: isActiveMode ? '#0F172A' : 'transparent',
                              color: isActiveMode ? '#FFFFFF' : '#CBD5E1',
                              fontSize: '12px',
                              fontWeight: isActiveMode ? 700 : 500,
                              fontFamily: 'inherit',
                              cursor: 'pointer'
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
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
                          <button
                            key={stop.id || `${stop.lat}-${stop.lng}`}
                            type="button"
                            onClick={() => {
                              if (onSelectStop) onSelectStop(stop);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 6px',
                              background: isStopActive ? '#0F172A' : 'transparent',
                              border: 'none',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              width: '100%'
                            }}
                          >
                            <span
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: isStopActive ? routeColor : '#0F172A',
                                border: '1px solid var(--border-subtle)',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
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
                                color: isStopActive ? '#FFFFFF' : '#CBD5E1',
                                fontWeight: isStopActive ? 700 : 400,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1
                              }}
                            >
                              {stop.name}
                            </span>

                            <MapPin size={12} color={isStopActive ? '#F59E0B' : '#A8B8CD'} style={{ flexShrink: 0 }} />
                          </button>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: '12px', color: '#A8B8CD', padding: '6px' }}>
                        Sin paradas registradas para esta ruta.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredRoutes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#CBD5E1', fontSize: '12px' }}>
            {filterFavorites
              ? 'No tienes rutas marcadas como favoritas. Pulsa la estrella en cualquier ruta para guardarla.'
              : 'No se encontraron rutas que coincidan con la búsqueda.'}
          </div>
        )}
      </div>
    </div>
  );
}
