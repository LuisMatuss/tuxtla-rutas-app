// Componente de Panel Lateral: Planificador Inteligente de Viajes "¿Cómo llego?"
// Incluye autocompletado inteligente de direcciones y paradas en Tuxtla Gutiérrez para Salida y Llegada,
// botones rápidos de acceso a puntos frecuentes y del círculo radar, y cálculo multimodal.

import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Clock,
  Footprints,
  ArrowRight,
  Compass,
  AlertCircle,
  Search,
  MapPin,
  X
} from 'lucide-react';
import { apiClient, searchTuxtlaAddresses } from '../../api/client.js';

export function TripPlannerPanel({
  routes = [],
  personalPoints,
  userLocation,
  currentUser = null,
  onRequestAuthPrompt,
  onPickPointOnMap,
  pickingTarget,
  onSelectTrip,
  selectedTrip
}) {
  const [originType, setOriginType] = useState('map'); // 'map' | 'casa' | 'escuela' | 'trabajo' | 'custom'
  const [destType, setDestType] = useState('escuela'); // 'escuela' | 'casa' | 'trabajo' | 'map' | 'custom'

  // Direcciones personalizadas elegidas desde el autocompletado
  const [customOrigin, setCustomOrigin] = useState(null);
  const [customDest, setCustomDest] = useState(null);

  // Estados de búsqueda para Origen y Destino
  const [originQuery, setOriginQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('all'); // 'all' | 'direct' | 'transfer'

  const originContainerRef = useRef(null);
  const destContainerRef = useRef(null);

  // Autocompletado de dirección de Inicio (Salida)
  useEffect(() => {
    if (!originQuery.trim() || originQuery.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await searchTuxtlaAddresses(originQuery);
        if (isMounted) {
          setOriginSuggestions(res);
          setShowOriginDropdown(res.length > 0);
        }
      } catch (err) {
        if (isMounted) setOriginSuggestions([]);
      }
    }, 280);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [originQuery]);

  // Autocompletado de dirección de Destino (Llegada)
  useEffect(() => {
    if (!destQuery.trim() || destQuery.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await searchTuxtlaAddresses(destQuery);
        if (isMounted) {
          setDestSuggestions(res);
          setShowDestDropdown(res.length > 0);
        }
      } catch (err) {
        if (isMounted) setDestSuggestions([]);
      }
    }, 280);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [destQuery]);

  // Cerrar desplegables al hacer clic fuera
  useEffect(() => {
    const handleOutside = (e) => {
      if (originContainerRef.current && !originContainerRef.current.contains(e.target)) {
        setShowOriginDropdown(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(e.target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Resolver coordenadas
  const getCoordinates = (type, isOrigin) => {
    if (type === 'custom') {
      return isOrigin ? customOrigin : customDest;
    }
    if (type === 'map') return userLocation || null;
    if (!personalPoints) return null;
    if (type === 'casa') return personalPoints?.home || personalPoints?.casa || null;
    if (type === 'escuela') return personalPoints?.school || personalPoints?.escuela || null;
    if (type === 'trabajo') return personalPoints?.work || personalPoints?.trabajo || null;
    return null;
  };

  const handleSelectPointType = (type, isOrigin) => {
    if (type === 'casa' || type === 'escuela' || type === 'trabajo') {
      const point = getCoordinates(type, isOrigin);
      if (!currentUser && !point) {
        if (onRequestAuthPrompt) {
          if (type === 'casa') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Casa');
          if (type === 'escuela') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Escuela');
          if (type === 'trabajo') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Trabajo');
        }
        return;
      }
    }
    if (isOrigin) {
      setOriginType(type);
      if (type !== 'custom') setOriginQuery('');
    } else {
      setDestType(type);
      if (type !== 'custom') setDestQuery('');
    }
  };

  const handlePickPoint = (type) => {
    if (!currentUser && (type === 'casa' || type === 'escuela' || type === 'trabajo')) {
      if (onRequestAuthPrompt) {
        if (type === 'casa') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Casa');
        if (type === 'escuela') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Escuela');
        if (type === 'trabajo') onRequestAuthPrompt('Inicia sesión para poder configurar la ubicación de tu Trabajo');
      }
      return;
    }
    if (onPickPointOnMap) {
      onPickPointOnMap(type);
    }
  };

  const handlePlanTrip = async () => {
    const orig = getCoordinates(originType, true);
    const dest = getCoordinates(destType, false);

    if (!orig || !dest || !Number.isFinite(orig.lat) || !Number.isFinite(dest.lat)) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.planTrip({
        originLat: orig.lat,
        originLng: orig.lng,
        destLat: dest.lat,
        destLng: dest.lng
      });

      if (res.data) {
        setPlanResult(res.data);
        const firstOption =
          (res.data.directOptions && res.data.directOptions.length > 0)
            ? res.data.directOptions[0]
            : (res.data.transferOptions && res.data.transferOptions.length > 0)
            ? res.data.transferOptions[0]
            : null;

        if (firstOption && onSelectTrip) {
          onSelectTrip(firstOption);
        }
      }
    } catch (err) {
      console.warn('[TripPlannerPanel] Error al planificar viaje:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-planificar automáticamente cuando ambos puntos tienen coordenadas válidas
  useEffect(() => {
    const orig = getCoordinates(originType, true);
    const dest = getCoordinates(destType, false);
    if (orig && dest && Number.isFinite(orig.lat) && Number.isFinite(dest.lat)) {
      handlePlanTrip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originType, destType, customOrigin, customDest, userLocation, personalPoints?.home, personalPoints?.casa, personalPoints?.school, personalPoints?.escuela, personalPoints?.work, personalPoints?.trabajo]);

  const originCoord = getCoordinates(originType, true);
  const destCoord = getCoordinates(destType, false);

  const directOptions = planResult?.directOptions || [];
  const transferOptions = planResult?.transferOptions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Panel de Configuración de Trayecto con Autocompletado */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={15} color="#38bdf8" />
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              ¿Cómo llego?
            </h3>
          </div>
          {pickingTarget && (
            <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
              📍 Toca el mapa para fijar...
            </span>
          )}
        </div>

        {/* Campo de Salida / Origen con Autocompletado */}
        <div ref={originContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
              🟢 DIRECCIÓN DE INICIO (SALIDA):
            </span>
            {originType !== 'map' && originType !== 'custom' && (
              <button
                type="button"
                onClick={() => handlePickPoint(originType)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Fijar en mapa
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              id="input-origin-address"
              placeholder={originCoord ? (originCoord.label || 'Punto fijado en mapa') : 'Escribe calle, colonia o parada de salida...'}
              value={originQuery}
              onChange={(e) => {
                setOriginQuery(e.target.value);
                setOriginType('custom');
              }}
              onFocus={() => {
                if (originSuggestions.length > 0) setShowOriginDropdown(true);
              }}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: originType === 'custom' && customOrigin ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {originQuery && (
              <button
                type="button"
                onClick={() => {
                  setOriginQuery('');
                  setOriginSuggestions([]);
                  setShowOriginDropdown(false);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}

            {/* Desplegable de Origen */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px'
                }}
              >
                {originSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCustomOrigin({ lat: item.lat, lng: item.lng, label: item.displayName });
                      setOriginType('custom');
                      setOriginQuery(item.displayName);
                      setShowOriginDropdown(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 700 }}>{item.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.secondaryText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chips Rápidos de Salida */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[
              { id: 'map', icon: '📍', label: 'Círculo' },
              { id: 'casa', icon: '🏠', label: 'Casa' },
              { id: 'escuela', icon: '🎓', label: 'Escuela' },
              { id: 'trabajo', icon: '💼', label: 'Trabajo' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                id={`btn-origin-${btn.id}`}
                onClick={() => handleSelectPointType(btn.id, true)}
                style={{
                  padding: '5px 2px',
                  background: originType === btn.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  border: originType === btn.id ? '1px solid #38bdf8' : '1px solid transparent',
                  borderRadius: '6px',
                  color: originType === btn.id ? '#38bdf8' : '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: originType === btn.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Campo de Llegada / Destino con Autocompletado */}
        <div ref={destContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
              🏁 DIRECCIÓN DE DESTINO (LLEGADA):
            </span>
            {destType !== 'map' && destType !== 'custom' && (
              <button
                type="button"
                onClick={() => handlePickPoint(destType)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Fijar en mapa
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              id="input-dest-address"
              placeholder={destCoord ? (destCoord.label || 'Punto fijado en mapa') : 'Escribe lugar, colonia o dirección de destino...'}
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setDestType('custom');
              }}
              onFocus={() => {
                if (destSuggestions.length > 0) setShowDestDropdown(true);
              }}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: destType === 'custom' && customDest ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            {destQuery && (
              <button
                type="button"
                onClick={() => {
                  setDestQuery('');
                  setDestSuggestions([]);
                  setShowDestDropdown(false);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}

            {/* Desplegable de Destino */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px'
                }}
              >
                {destSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCustomDest({ lat: item.lat, lng: item.lng, label: item.displayName });
                      setDestType('custom');
                      setDestQuery(item.displayName);
                      setShowDestDropdown(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 700 }}>{item.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.secondaryText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chips Rápidos de Destino */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[
              { id: 'escuela', icon: '🎓', label: 'Escuela' },
              { id: 'casa', icon: '🏠', label: 'Casa' },
              { id: 'trabajo', icon: '💼', label: 'Trabajo' },
              { id: 'map', icon: '📍', label: 'Círculo' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                id={`btn-dest-${btn.id}`}
                onClick={() => handleSelectPointType(btn.id, false)}
                style={{
                  padding: '5px 2px',
                  background: destType === btn.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                  border: destType === btn.id ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: '6px',
                  color: destType === btn.id ? '#34d399' : '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: destType === btn.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Cálculo Manual */}
        <button
          type="button"
          id="btn-calculate-trip"
          onClick={handlePlanTrip}
          disabled={loading || !originCoord || !destCoord}
          style={{
            padding: '8px 12px',
            background: (!originCoord || !destCoord)
              ? 'rgba(255, 255, 255, 0.08)'
              : 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
            border: 'none',
            borderRadius: '6px',
            color: (!originCoord || !destCoord) ? '#64748b' : '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: (!originCoord || !destCoord) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Navigation size={14} />
          <span>{loading ? 'Calculando combis...' : 'Calcular Trayecto'}</span>
        </button>
      </div>

      {/* Resultados de Planificación */}
      {planResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Pestañas de Filtro */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'all', label: `Todas (${directOptions.length + transferOptions.length})` },
              { id: 'direct', label: `Directas (${directOptions.length})` },
              { id: 'transfer', label: `Trasbordo (${transferOptions.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveResultTab(tab.id)}
                style={{
                  background: activeResultTab === tab.id ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: activeResultTab === tab.id ? '1px solid #38bdf8' : '1px solid transparent',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  color: activeResultTab === tab.id ? '#38bdf8' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Opciones Directas */}
          {(activeResultTab === 'all' || activeResultTab === 'direct') && directOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {directOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                      border: isSelected ? `1.5px solid ${opt.routeColor || '#10b981'}` : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            background: opt.routeColor || '#0284c7',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        >
                          {opt.routeName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Directa &bull; {opt.stopsCount} paradas
                        </span>
                      </div>

                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        ~{opt.estimatedMinutes} min
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>🚶 {opt.originWalkMeters} m a parada</span>
                      <span>🏁 {opt.destStop.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Opciones con Trasbordo */}
          {(activeResultTab === 'all' || activeResultTab === 'transfer') && transferOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {transferOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                      border: isSelected ? '1.5px solid #38bdf8' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            background: opt.firstRoute.color || '#0284c7',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        >
                          {opt.firstRoute.name.split(' - ')[0]}
                        </span>
                        <ArrowRight size={12} color="#94a3b8" />
                        <span
                          style={{
                            background: opt.secondRoute.color || '#10b981',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        >
                          {opt.secondRoute.name.split(' - ')[0]}
                        </span>
                      </div>

                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        ~{opt.estimatedMinutes} min
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fbbf24' }}>🔄 1 trasbordo</span>
                      <span>{opt.transferNode.nodeName} ({opt.transferNode.walkMeters}m)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {directOptions.length === 0 && transferOptions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
              <AlertCircle size={20} color="#f59e0b" style={{ margin: '0 auto 6px auto' }} />
              <div>Sin rutas directas ni trasbordos en esa distancia.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
