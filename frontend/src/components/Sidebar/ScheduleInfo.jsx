// Componente de Panel Lateral: Horarios, Timeline de paradas y Paradas cercanas (Zero-Slop, Apple Maps style)
import React from 'react';
import { Clock, Navigation, MapPin, Footprints, Bus, CheckCircle2 } from 'lucide-react';

export function ScheduleInfo({
  route = null,
  activeStop = null,
  nearestStops = [],
  loadingNearest = false,
  userLocation = null,
  onSelectStop,
  onSimulateLocation,
  onClearLocation
}) {
  const schedule = route?.scheduleInfo || {
    firstRun: '05:30',
    lastRun: '22:00',
    frequencyMinutes: 8,
    estimatedWaitMinutes: 4,
    status: 'OPERATIONAL'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* SECCIÓN 1: PARADAS CERCANAS (ESTILO APPLE MAPS) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={15} color="#38bdf8" />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Paradas Cercanas
            </h3>
          </div>

          {userLocation ? (
            <button
              type="button"
              onClick={onClearLocation}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Limpiar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSimulateLocation && onSimulateLocation(16.7516, -93.1161)}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 600,
                padding: '3px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <MapPin size={12} />
              <span>Parque Central</span>
            </button>
          )}
        </div>

        {userLocation && (
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              📍 GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </div>

            {loadingNearest ? (
              <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Buscando paradas...
              </div>
            ) : nearestStops.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {nearestStops.map((stop) => {
                  const isStopActive = activeStop?.id === stop.id;
                  const routeColor = stop.routeColor || '#2563EB';

                  return (
                    <div
                      key={stop.id || `${stop.lat}-${stop.lng}`}
                      onClick={() => onSelectStop && onSelectStop(stop)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isStopActive ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isStopActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isStopActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {stop.name}
                        </div>
                      </div>

                      {/* Chips estilo Apple Maps: 1 sola línea */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Footprints size={12} />
                          {stop.distanceMeters}m
                        </span>

                        <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Bus size={12} />
                          ~{stop.nextBusMinutes}m
                        </span>

                        <span
                          style={{
                            background: `${routeColor}25`,
                            color: routeColor,
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {stop.routeName || 'Ruta'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>
                Sin paradas en 1.5 km.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: HORARIOS Y RECORRIDO */}
      {route ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Cabecera de Horarios */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color={route.color || '#38bdf8'} />
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Horarios y Servicio
              </h4>
            </div>

            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#34d399',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={13} />
              Operativo
            </span>
          </div>

          {/* Ribbon de Chips Estilo Apple Maps (Sin sub-tarjetas anidadas) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              ⏱️ Frecuencia: {schedule.frequencyMinutes || 8} min
            </span>

            <span
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              🌅 {schedule.firstRun || '05:30'} - {schedule.lastRun || '22:00'}
            </span>

            <span
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              ⏳ Espera: ~{schedule.estimatedWaitMinutes || 4} min
            </span>
          </div>

          {/* Timeline de Paradas de 1 Sola Línea */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                PARADAS ({route.stops?.length || 0})
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Toca para ubicar
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                maxHeight: '260px',
                overflowY: 'auto'
              }}
            >
              {route.stops && route.stops.length > 0 ? (
                route.stops.map((stop, index) => {
                  const isStopActive = activeStop?.id === stop.id;

                  return (
                    <div
                      key={stop.id}
                      onClick={() => onSelectStop && onSelectStop(stop)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isStopActive ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isStopActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isStopActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isStopActive ? '#0284c7' : 'rgba(255, 255, 255, 0.08)',
                          color: isStopActive ? '#ffffff' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {stop.stopOrder || index + 1}
                      </span>

                      <span
                        style={{
                          fontSize: '12px',
                          color: isStopActive ? '#ffffff' : '#cbd5e1',
                          fontWeight: isStopActive ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {stop.name}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>
                  Sin paradas registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '14px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}
        >
          Selecciona una ruta para ver paradas y horarios.
        </div>
      )}
    </div>
  );
}
