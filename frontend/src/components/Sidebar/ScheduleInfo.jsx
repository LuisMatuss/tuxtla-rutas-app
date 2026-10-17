// Componente de Panel Lateral: Horarios, Timeline de paradas y Calculador de paradas cercanas
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* SECCIÓN 1: PARADAS MÁS CERCANAS A TU PUNTO (GEOLOCALIZACIÓN) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: userLocation ? '1.5px solid #3b82f6' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          boxShadow: userLocation ? '0 0 16px rgba(59, 130, 246, 0.15)' : 'none',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={16} color="#3b82f6" />
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              Paradas Cercanas a tu Punto
            </h3>
          </div>

          {userLocation && (
            <button
              type="button"
              onClick={onClearLocation}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '11px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        {userLocation ? (
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
              📍 Coordenadas: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </div>

            {loadingNearest ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Buscando paradas próximas...
              </div>
            ) : nearestStops.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nearestStops.map((stop) => {
                  const isStopActive = activeStop?.id === stop.id;
                  const routeColor = stop.routeColor || '#2563EB';

                  return (
                    <div
                      key={stop.id || `${stop.lat}-${stop.lng}`}
                      onClick={() => onSelectStop && onSelectStop(stop)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: isStopActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                        border: isStopActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px', color: '#ffffff' }}>
                          {stop.name}
                        </strong>

                        <span
                          style={{
                            background: `${routeColor}20`,
                            color: routeColor,
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px'
                          }}
                        >
                          {stop.routeName || 'Ruta'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
                        <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Footprints size={12} />
                          {stop.distanceMeters} m ({stop.walkingTimeMinutes} min)
                        </span>

                        <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <Bus size={12} />
                          Próximo: ~{stop.nextBusMinutes} min
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                No se encontraron paradas en un radio de 1.5 km.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.4' }}>
              Haz clic en el mapa o usa el botón directo para calcular paradas cercanas y tiempos de caminata.
            </p>

            <button
              type="button"
              onClick={() => onSimulateLocation && onSimulateLocation(16.7516, -93.1161)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#93c5fd',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)')}
            >
              <MapPin size={14} />
              Simular punto en Parque Central
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: INFORMACIÓN DE RUTA Y HORARIOS */}
      {route ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Métricas de horario */}
          <div
            style={{
              padding: '14px',
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color={route.color || '#2563EB'} />
                <h4 style={{ fontSize: '13px', fontWeight: 600 }}>Horarios y Frecuencias</h4>
              </div>

              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#34d399',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={12} />
                En Servicio
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>PRIMERA CORRIDA</span>
                <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{schedule.firstRun || '05:30'}</strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>ÚLTIMA CORRIDA</span>
                <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{schedule.lastRun || '22:00'}</strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>FRECUENCIA PROMEDIO</span>
                <strong style={{ color: '#f8fafc', fontSize: '13px' }}>cada {schedule.frequencyMinutes || 8} min</strong>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '8px', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '10px', display: 'block' }}>ESPERA ESTIMADA</span>
                <strong style={{ color: '#38bdf8', fontSize: '13px' }}>~{schedule.estimatedWaitMinutes || 4} min</strong>
              </div>
            </div>
          </div>

          {/* Timeline de Paradas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                Recorrido de Paradas ({route.stops?.length || 0})
              </h4>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Clic para centrar</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '280px',
                overflowY: 'auto',
                paddingRight: '4px'
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
                        gap: '10px',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        background: isStopActive ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                        border: isStopActive ? '1px solid #3b82f6' : '1px solid transparent',
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
                      {/* Número de secuencia */}
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: isStopActive ? '#3b82f6' : `${route.color || '#2563EB'}30`,
                          color: isStopActive ? '#ffffff' : route.color || '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
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
                          lineHeight: '1.3'
                        }}
                      >
                        {stop.name}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '12px', color: '#94a3b8', padding: '8px' }}>
                  No hay paradas registradas para esta ruta.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}
        >
          Selecciona una ruta de la lista para ver su horario completo y el recorrido de paradas paso a paso.
        </div>
      )}
    </div>
  );
}
