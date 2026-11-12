// Landing Page Minimalista ("Zero Slop") — Tuxtla Rutas
// Inspirada en el emblema oficial Rubber Hose (Combi Ruta 108 Centro) y el sistema de diseño Colectivo Tuxtla.

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Send,
  LogIn,
  Route,
  Radar,
  MessageSquare,
  X,
  ArrowRight
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.jsx';
import { searchTuxtlaAddresses } from '../api/client.js';

const TELEGRAM_BOT_URL = 'https://t.me/TuxtlaRutasUnach_Bot';

// Catálogo oficial de las 12 rutas troncales para acceso en 1 clic (cero violetas/índigos)
const OFFICIAL_TWELVE_ROUTES = [
  { id: 'r-001', code: 'R-1', shortDest: 'UNACH / Terán', color: '#0284C7' },
  { id: 'r-002', code: 'R-A', shortDest: 'Patria Nueva', color: '#EF4444' },
  { id: 'r-003', code: 'R-43', shortDest: 'Libramiento Sur', color: '#F59E0B' },
  { id: 'r-004', code: 'R-90', shortDest: 'Libramiento Norte', color: '#EA580C' },
  { id: 'r-005', code: 'R-58', shortDest: 'UNACH / San Roque', color: '#10B981' },
  { id: 'r-006', code: 'R-52', shortDest: 'Caña Hueca', color: '#F97316' },
  { id: 'r-007', code: 'R-30', shortDest: 'Las Granjas', color: '#38BDF8' },
  { id: 'r-008', code: 'R-73', shortDest: 'Ing. UNACH', color: '#0D9468' },
  { id: 'r-009', code: 'R-108', shortDest: 'Centro / ISSSTE', color: '#FBBF24' },
  { id: 'r-010', code: 'R-51', shortDest: 'Juan Crispín', color: '#EF4444' },
  { id: 'r-011', code: 'R-115', shortDest: 'Real del Bosque', color: '#F59E0B' },
  { id: 'r-012', code: 'R-22', shortDest: 'San José Terán', color: '#29ABE2' }
];

// Destinos frecuentes de Tuxtla Gutiérrez para respuesta inmediata en el buscador del Hero
const QUICK_DESTINATIONS = [
  {
    id: 'quick-unach',
    shortLabel: 'UNACH',
    displayName: 'UNACH Campus I (Blvd. Belisario Domínguez)',
    secondaryText: 'Rutas 1, 58 y 73 • Poniente',
    lat: 16.7547,
    lng: -93.1592
  },
  {
    id: 'quick-parque-central',
    shortLabel: 'Parque Central',
    displayName: 'Parque Central / Catedral de San Marcos',
    secondaryText: 'Rutas 1, A, 30, 51, 52, 108 y 115 • Centro',
    lat: 16.7536,
    lng: -93.1156
  },
  {
    id: 'quick-cobach-13',
    shortLabel: 'COBACH 13',
    displayName: 'COBACH Plantel 13 (Oriente)',
    secondaryText: 'Conexión oriente • Tuxtla Gutiérrez',
    lat: 16.7512,
    lng: -93.0848
  },
  {
    id: 'quick-marimba',
    shortLabel: 'Parque de la Marimba',
    displayName: 'Parque Jardín de la Marimba (Av. Central)',
    secondaryText: 'Rutas 1, A, 51, 52 y 108 • Poniente-Centro',
    lat: 16.7548,
    lng: -93.1243
  }
];

export function LandingPage({
  routes = [],
  telemetryCount = 24,
  currentUser = null,
  onOpenMap,
  onSelectRouteFromLanding,
  onSelectDestinationFromLanding,
  onOpenLogin,
  onLogout
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let mounted = true;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchTuxtlaAddresses(trimmed);
        if (mounted) {
          setSuggestions(Array.isArray(res) ? res.slice(0, 6) : []);
          setDropdownOpen(true);
        }
      } catch {
        if (mounted) setSuggestions([]);
      } finally {
        if (mounted) setIsSearching(false);
      }
    }, 240);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleChoosePlace = (place) => {
    setDropdownOpen(false);
    setQuery('');
    if (onSelectDestinationFromLanding) {
      onSelectDestinationFromLanding(place);
    } else if (onOpenMap) {
      onOpenMap();
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      if (onOpenMap) onOpenMap();
      return;
    }

    // 1. Si escribió número o código de ruta (ej. "108", "Ruta 43", "R-1"), abrir esa ruta directamente
    const routeMatch = OFFICIAL_TWELVE_ROUTES.find((r) => {
      const cleanCode = r.code.replace('R-', '').toLowerCase();
      const lower = trimmed.toLowerCase();
      return (
        lower === cleanCode ||
        lower === `ruta ${cleanCode}` ||
        lower === r.code.toLowerCase()
      );
    });
    if (routeMatch && onSelectRouteFromLanding) {
      setDropdownOpen(false);
      setQuery('');
      onSelectRouteFromLanding(routeMatch.id);
      return;
    }

    // 2. Si ya hay sugerencias cargadas, tomar la primera
    if (suggestions.length > 0) {
      handleChoosePlace(suggestions[0]);
      return;
    }

    // 3. Buscar coincidencia rápida en destinos locales o consultar API
    const quickHit = QUICK_DESTINATIONS.find(
      (d) =>
        d.shortLabel.toLowerCase().includes(trimmed.toLowerCase()) ||
        d.displayName.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (quickHit) {
      handleChoosePlace(quickHit);
      return;
    }

    try {
      const res = await searchTuxtlaAddresses(trimmed);
      if (Array.isArray(res) && res.length > 0) {
        handleChoosePlace(res[0]);
        return;
      }
    } catch {
      // Continuar hacia el mapa general
    }

    if (onOpenMap) onOpenMap();
  };

  const activeRoutesCount = routes.length > 0 ? routes.length : 12;
  const activeCombisCount = telemetryCount > 0 ? telemetryCount : 24;

  const displayedSuggestions =
    query.trim().length >= 2 ? suggestions : QUICK_DESTINATIONS;

  return (
    <div className="landing-shell">
      {/* 1. BARRA SUPERIOR LIMPIA */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'var(--glass-blur)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          className="landing-container"
          style={{
            minHeight: '66px',
            paddingTop: '10px',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {/* Marca oficial izquierda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrandLogo size={42} alt="Logo Tuxtla Rutas" />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '19px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#F8FAFC'
              }}
            >
              Tuxtla Rutas
            </span>
          </div>

          {/* Acciones directas derecha */}
          <nav
            aria-label="Navegación principal"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              id="btn-landing-nav-map"
              onClick={onOpenMap}
              style={{
                padding: '8px 14px',
                backgroundColor: '#1E293B',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                color: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MapPin size={15} color="#F59E0B" />
              <span>Mapa en Vivo</span>
            </button>

            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-landing-nav-telegram"
              style={{
                padding: '8px 14px',
                backgroundColor: 'rgba(2, 132, 199, 0.16)',
                border: '1px solid rgba(56, 189, 248, 0.42)',
                borderRadius: '8px',
                color: '#7DD3FC',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={14} color="#38BDF8" />
              <span>Bot Telegram</span>
            </a>

            {!currentUser ? (
              <button
                type="button"
                id="btn-landing-nav-login"
                onClick={onOpenLogin}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F59E0B',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  color: '#0F172A',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <LogIn size={14} color="#0F172A" />
                <span>Iniciar sesión</span>
              </button>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#1E293B',
                    border: '1px solid var(--border-subtle)',
                    color: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  {currentUser.name}
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.14)',
                      border: '1px solid rgba(239, 68, 68, 0.38)',
                      borderRadius: '8px',
                      color: '#FCA5A5',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Salir
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* CONTENIDO CENTRAL ESCANEABLE */}
      <main
        className="landing-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px',
          paddingTop: '8px',
          paddingBottom: '24px'
        }}
      >
        {/* 2. SECCIÓN HERO PRINCIPAL */}
        <section className="landing-hero-grid" aria-label="Presentación Tuxtla Rutas">
          {/* Columna Izquierda: Propuesta de valor + Buscador Rápido + 2 CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(13, 148, 104, 0.16)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#E2E8F0',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block'
                  }}
                />
                <span>Transporte Público en Tiempo Real • Tuxtla Gutiérrez</span>
              </span>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(34px, 4vw, 50px)',
                  fontWeight: 800,
                  lineHeight: 1.07,
                  letterSpacing: '-0.03em',
                  color: '#F8FAFC',
                  marginTop: '16px',
                  maxWidth: '16ch'
                }}
              >
                Muévete por Tuxtla{' '}
                <span style={{ color: '#FBBF24' }}>sin adivinar tu combi</span>
              </h1>

              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.5,
                  color: '#CBD5E1',
                  marginTop: '12px',
                  maxWidth: '62ch'
                }}
              >
                Rutas de Ida y Vuelta, paradas cercanas y tiempos de paso en la web o desde Telegram.
              </p>
            </div>

            {/* Buscador Rápido Integrado en el Hero */}
            <div ref={searchBoxRef} style={{ position: 'relative', maxWidth: '580px' }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1E293B',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  padding: '6px 6px 6px 14px',
                  gap: '8px',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <Search
                  size={18}
                  color={isSearching ? '#10B981' : '#38BDF8'}
                  style={{ flexShrink: 0 }}
                />
                <input
                  id="landing-hero-search"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="¿A dónde vas hoy? (Ej. UNACH, Parque Central, COBACH 13...)"
                  aria-label="Buscar destino o ruta en Tuxtla Gutiérrez"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#F8FAFC',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    padding: '8px 4px'
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSuggestions([]);
                    }}
                    aria-label="Limpiar búsqueda"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#CBD5E1',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    padding: '9px 14px',
                    backgroundColor: '#065F46',
                    border: '1px solid #10B981',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    flexShrink: 0
                  }}
                >
                  Buscar
                </button>
              </form>

              {/* Menú desplegable de sugerencias de paradas y lugares de Tuxtla */}
              {dropdownOpen && displayedSuggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Sugerencias de destinos en Tuxtla"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 140,
                    backgroundColor: '#0F172A',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    maxHeight: '250px',
                    overflowY: 'auto'
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
                    {query.trim().length >= 2
                      ? `Destinos y paradas en Tuxtla (${displayedSuggestions.length})`
                      : 'Destinos frecuentes en 1 clic'}
                  </div>
                  {displayedSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChoosePlace(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '9px 10px',
                        color: '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1E293B';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <MapPin size={15} color="#38BDF8" style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#F8FAFC',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.displayName}
                          </div>
                          {item.secondaryText && (
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
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#FBBF24', flexShrink: 0 }}>
                        Ver ruta ➔
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Atajos inmediatos bajo el buscador */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '12px', color: '#A8B8CD', fontWeight: 500 }}>
                  Rápido:
                </span>
                {QUICK_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleChoosePlace(dest)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(30, 41, 59, 0.85)',
                      border: '1px solid var(--border-subtle)',
                      color: '#CBD5E1',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {dest.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* 2 Botones de Acción (CTAs) con estética táctil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '2px' }}>
              <button
                type="button"
                id="btn-hero-open-map"
                className="tactile-cta-primary"
                onClick={onOpenMap}
                style={{
                  padding: '13px 22px',
                  backgroundColor: '#F59E0B',
                  border: '1.5px solid #FDE68A',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <span>Abrir Mapa en Vivo</span>
                <ArrowRight size={17} strokeWidth={2.6} />
              </button>

              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-hero-open-telegram"
                className="tactile-cta-secondary"
                style={{
                  padding: '13px 20px',
                  backgroundColor: '#0369A1',
                  border: '1.5px solid #38BDF8',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display)',
                  fontSize: '15px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <Send size={16} />
                <span>Abrir @TuxtlaRutasUnach_Bot</span>
              </a>
            </div>
          </div>

          {/* Columna Derecha: Emblema Oficial Rubber Hose (260px - 300px) + Estado en Vivo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px'
            }}
          >
            <BrandLogo size={276} alt="Emblema Oficial Tuxtla Rutas — Ruta 108 Centro" />

            <div
              style={{
                padding: '9px 16px',
                borderRadius: '999px',
                backgroundColor: '#1E293B',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#F8FAFC',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'center'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  flexShrink: 0
                }}
              />
              <span>
                {activeRoutesCount} Rutas Oficiales • {activeCombisCount} Combis en Circulación • Parada de 15s
              </span>
            </div>
          </div>
        </section>

        {/* 3. TIRA INTERACTIVA DE LAS 12 RUTAS ("ACCESO EN 1 CLIC") */}
        <section
          aria-label="Acceso directo a las 12 rutas oficiales"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0
              }}
            >
              Las 12 Rutas Oficiales en 1 Clic
            </h2>
            <span style={{ fontSize: '13px', color: '#A8B8CD' }}>
              Selecciona una ruta para enfocar su recorrido de Ida y Vuelta en las calles de Tuxtla
            </span>
          </div>

          <div className="landing-route-badges">
            {OFFICIAL_TWELVE_ROUTES.map((item) => {
              const liveMatch = routes.find((r) => r.id === item.id);
              const targetId = liveMatch ? liveMatch.id : item.id;

              return (
                <button
                  key={item.code}
                  type="button"
                  id={`landing-route-chip-${item.code}`}
                  className="route-quick-chip"
                  onClick={() => {
                    if (onSelectRouteFromLanding) {
                      onSelectRouteFromLanding(targetId);
                    } else if (onOpenMap) {
                      onOpenMap();
                    }
                  }}
                  title={liveMatch?.name || `${item.code} • ${item.shortDest}`}
                  style={{
                    padding: '9px 10px',
                    backgroundColor: '#1E293B',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '9px',
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    minWidth: 0
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      flexShrink: 0
                    }}
                  />
                  <strong
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0
                    }}
                  >
                    {item.code}
                  </strong>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#CBD5E1',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.shortDest}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. TRES BLOQUES HORIZONTALES COMPACTOS (CERO TARJETAS ANIDADAS) */}
        <section className="landing-pillars-grid" aria-label="Capacidades principales">
          <div className="landing-pillar-item">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <Route size={16} color="#10B981" style={{ flexShrink: 0 }} />
              <span>01. Trazado Vial Exacto</span>
            </h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#CBD5E1' }}>
              Circuitos separados de Ida y Vuelta sobre calles reales.
            </p>
          </div>

          <div className="landing-pillar-item">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <Radar size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
              <span>02. Radar de Cercanía</span>
            </h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#CBD5E1' }}>
              Toca cualquier punto del mapa para ver qué combis pasan a tu alrededor.
            </p>
          </div>

          <div className="landing-pillar-item">
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              <MessageSquare size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
              <span>03. Asistente en Telegram</span>
            </h3>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#CBD5E1' }}>
              Envía tu ubicación GPS a @TuxtlaRutasUnach_Bot y recibe tu ruta al instante.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
