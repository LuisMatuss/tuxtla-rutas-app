// Componente de Panel Lateral: Planificador Inteligente de Viajes "¿Cómo llego?"
// Paleta Colectivo Tuxtla, contraste WCAG AA y estructura plana sin tarjetas anidadas.

import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Clock,
  ArrowRight,
  Compass,
  AlertCircle,
  Search,
  MapPin,
  Home,
  GraduationCap,
  Briefcase,
  RefreshCw,
  X
} from 'lucide-react';
import { apiClient, searchTuxtlaAddresses } from '../../api/client.js';

export function TripPlannerPanel({
  personalPoints,
  userLocation,
  currentUser = null,
  onRequestAuthPrompt,
  onPickPointOnMap,
  pickingTarget,
  onSelectTrip,
  selectedTrip
}) {
  const [originType, setOriginType] = useState('map');
  const [destType, setDestType] = useState('escuela');

  const [customOrigin, setCustomOrigin] = useState(null);
  const [customDest, setCustomDest] = useState(null);

  const [originQuery, setOriginQuery] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('all');

  const originContainerRef = useRef(null);
  const destContainerRef = useRef(null);

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
      } catch {
        if (isMounted) setOriginSuggestions([]);
      }
    }, 260);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [originQuery]);

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
      } catch {
        if (isMounted) setDestSuggestions([]);
      }
    }, 260);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [destQuery]);

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

  const getCoordinates = (type, isOrigin) => {
    if (type === 'custom') return isOrigin ? customOrigin : customDest;
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
          res.data.directOptions && res.data.directOptions.length > 0
            ? res.data.directOptions[0]
            : res.data.transferOptions && res.data.transferOptions.length > 0
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

  useEffect(() => {
    const orig = getCoordinates(originType, true);
    const dest = getCoordinates(destType, false);
    if (orig && dest && Number.isFinite(orig.lat) && Number.isFinite(dest.lat)) {
      handlePlanTrip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    originType,
    destType,
    customOrigin,
    customDest,
    userLocation,
    personalPoints?.home,
    personalPoints?.casa,
    personalPoints?.school,
    personalPoints?.escuela,
    personalPoints?.work,
    personalPoints?.trabajo
  ]);

  const originCoord = getCoordinates(originType, true);
  const destCoord = getCoordinates(destType, false);

  const directOptions = planResult?.directOptions || [];
  const transferOptions = planResult?.transferOptions || [];

  const ORIGIN_CHIPS = [
    { id: 'map', Icon: MapPin, label: 'Radar' },
    { id: 'casa', Icon: Home, label: 'Casa' },
    { id: 'escuela', Icon: GraduationCap, label: 'Escuela' },
    { id: 'trabajo', Icon: Briefcase, label: 'Trabajo' }
  ];

  const DEST_CHIPS = [
    { id: 'escuela', Icon: GraduationCap, label: 'Escuela' },
    { id: 'casa', Icon: Home, label: 'Casa' },
    { id: 'trabajo', Icon: Briefcase, label: 'Trabajo' },
    { id: 'map', Icon: MapPin, label: 'Radar' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Configuración de Trayecto (Estructura plana con borderBottom, cero nested-cards) */}
      <div
        style={{
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={15} color="#F59E0B" />
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0
              }}
            >
              Planificador de Trayecto
            </h3>
          </div>
          {pickingTarget && (
            <span style={{ fontSize: '12px', color: '#FDE68A', fontWeight: 600 }}>
              Toca el mapa para fijar...
            </span>
          )}
        </div>

        {/* Origen */}
        <div ref={originContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="input-origin-address" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700 }}>
              Punto de salida:
            </label>
            {originType !== 'map' && originType !== 'custom' && (
              <button
                type="button"
                onClick={() => handlePickPoint(originType)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7DD3FC',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit'
                }}
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
                color: '#10B981'
              }}
            />
            <input
              type="text"
              id="input-origin-address"
              placeholder={originCoord ? originCoord.label || 'Punto fijado en mapa' : 'Escribe calle, colonia o parada de salida...'}
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
                padding: '8px 28px 8px 32px',
                background: '#1E293B',
                border: originType === 'custom' && customOrigin ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#F8FAFC',
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
                  color: '#CBD5E1',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}

            {showOriginDropdown && originSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  background: '#0F172A',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px'
                }}
              >
                {originSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCustomOrigin({ lat: item.lat, lng: item.lng, label: item.displayName });
                      setOriginType('custom');
                      setOriginQuery(item.displayName);
                      setShowOriginDropdown(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#F8FAFC'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1E293B')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 700 }}>{item.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#A8B8CD' }}>{item.secondaryText}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {ORIGIN_CHIPS.map((btn) => {
              const ChipIcon = btn.Icon;
              const isSel = originType === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  id={`btn-origin-${btn.id}`}
                  onClick={() => handleSelectPointType(btn.id, true)}
                  style={{
                    padding: '6px 4px',
                    background: isSel ? 'rgba(2, 132, 199, 0.22)' : '#1E293B',
                    border: isSel ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: isSel ? '#7DD3FC' : '#CBD5E1',
                    fontSize: '12px',
                    fontWeight: isSel ? 700 : 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ChipIcon size={12} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Destino */}
        <div ref={destContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="input-dest-address" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 700 }}>
              Punto de destino:
            </label>
            {destType !== 'map' && destType !== 'custom' && (
              <button
                type="button"
                onClick={() => handlePickPoint(destType)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7DD3FC',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit'
                }}
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
                color: '#F59E0B'
              }}
            />
            <input
              type="text"
              id="input-dest-address"
              placeholder={destCoord ? destCoord.label || 'Punto fijado en mapa' : 'Escribe lugar, colonia o dirección de destino...'}
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
                padding: '8px 28px 8px 32px',
                background: '#1E293B',
                border: destType === 'custom' && customDest ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#F8FAFC',
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
                  color: '#CBD5E1',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}

            {showDestDropdown && destSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 1300,
                  background: '#0F172A',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px'
                }}
              >
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCustomDest({ lat: item.lat, lng: item.lng, label: item.displayName });
                      setDestType('custom');
                      setDestQuery(item.displayName);
                      setShowDestDropdown(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#F8FAFC'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1E293B')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 700 }}>{item.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#A8B8CD' }}>{item.secondaryText}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {DEST_CHIPS.map((btn) => {
              const ChipIcon = btn.Icon;
              const isSel = destType === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  id={`btn-dest-${btn.id}`}
                  onClick={() => handleSelectPointType(btn.id, false)}
                  style={{
                    padding: '6px 4px',
                    background: isSel ? 'rgba(13, 148, 104, 0.22)' : '#1E293B',
                    border: isSel ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: isSel ? '#6EE7B7' : '#CBD5E1',
                    fontSize: '12px',
                    fontWeight: isSel ? 700 : 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ChipIcon size={12} />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Botón de Cálculo con Contraste Alto */}
        <button
          type="button"
          id="btn-calculate-trip"
          onClick={handlePlanTrip}
          disabled={loading || !originCoord || !destCoord}
          style={{
            padding: '9px 12px',
            background: !originCoord || !destCoord ? '#1E293B' : '#F59E0B',
            border: !originCoord || !destCoord ? '1px solid var(--border-subtle)' : '1px solid #FDE68A',
            borderRadius: '8px',
            color: !originCoord || !destCoord ? '#A8B8CD' : '#0F172A',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: !originCoord || !destCoord ? 'not-allowed' : 'pointer',
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
                  background: activeResultTab === tab.id ? 'rgba(2, 132, 199, 0.22)' : '#1E293B',
                  border: activeResultTab === tab.id ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  color: activeResultTab === tab.id ? '#7DD3FC' : '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  fontVariantNumeric: 'tabular-nums',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Opciones Directas */}
          {(activeResultTab === 'all' || activeResultTab === 'direct') && directOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {directOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? '#1E293B' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#6EE7B7', fontSize: '13px', fontWeight: 800 }}>
                          {opt.routeName}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#A8B8CD', fontVariantNumeric: 'tabular-nums' }}>
                          • Directa ({opt.stopsCount} paradas)
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#FDE68A',
                          fontVariantNumeric: 'tabular-nums',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Clock size={12} />
                        <span>~{opt.estimatedMinutes} min</span>
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '10px', fontVariantNumeric: 'tabular-nums' }}>
                      <span>Caminata: {opt.originWalkMeters} m</span>
                      <span>• Baja en {opt.destStop.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Opciones con Trasbordo */}
          {(activeResultTab === 'all' || activeResultTab === 'transfer') && transferOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transferOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? '#1E293B' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                        <span>{opt.firstRoute.name.split(' - ')[0]}</span>
                        <ArrowRight size={12} color="#38BDF8" />
                        <span>{opt.secondRoute.name.split(' - ')[0]}</span>
                      </div>

                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#7DD3FC',
                          fontVariantNumeric: 'tabular-nums',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Clock size={12} />
                        <span>~{opt.estimatedMinutes} min</span>
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px', fontVariantNumeric: 'tabular-nums' }}>
                      <RefreshCw size={12} color="#F59E0B" />
                      <span>Trasbordo en {opt.transferNode.nodeName} ({opt.transferNode.walkMeters} m)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {directOptions.length === 0 && transferOptions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#CBD5E1', fontSize: '12px' }}>
              <AlertCircle size={20} color="#F59E0B" style={{ margin: '0 auto 6px auto' }} />
              <div>Sin rutas directas ni trasbordos cercanos entre esos dos puntos.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
