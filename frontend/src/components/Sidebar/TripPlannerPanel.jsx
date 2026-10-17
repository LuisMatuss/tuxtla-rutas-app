// Componente de Panel Lateral: Planificador Inteligente de Viajes "¿Qué combi tomo?"
// Soporta cálculo de rutas directas y con trasbordo entre las 8 rutas de Tuxtla Gutiérrez

import React, { useState, useEffect } from 'react';
import { Navigation, Clock, Footprints, ArrowRight, CornerDownRight, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import { apiClient } from '../../api/client.js';

export function TripPlannerPanel({
  personalPoints,
  userLocation,
  onPickPointOnMap,
  pickingTarget,
  onSelectTrip,
  selectedTrip
}) {
  const [originType, setOriginType] = useState('casa'); // 'casa' | 'escuela' | 'trabajo' | 'map'
  const [destType, setDestType] = useState('escuela');
  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('all'); // 'all' | 'direct' | 'transfer'

  // Resolver coordenadas según la selección actual
  const getCoordinates = (type) => {
    if (type === 'casa') return personalPoints.casa;
    if (type === 'escuela') return personalPoints.escuela;
    if (type === 'trabajo') return personalPoints.trabajo;
    if (type === 'map') return userLocation || personalPoints.casa;
    return personalPoints.casa;
  };

  const handlePlanTrip = async () => {
    const orig = getCoordinates(originType);
    const dest = getCoordinates(destType);

    if (!orig || !dest) return;

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
        // Si hay opciones directas, seleccionar la primera por defecto
        if (res.data.directOptions && res.data.directOptions.length > 0) {
          onSelectTrip(res.data.directOptions[0]);
        } else if (res.data.transferOptions && res.data.transferOptions.length > 0) {
          onSelectTrip(res.data.transferOptions[0]);
        }
      }
    } catch (err) {
      console.warn('[TripPlannerPanel] Error al planificar viaje:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular automáticamente al abrir o cambiar origen/destino
  useEffect(() => {
    handlePlanTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originType, destType, personalPoints.casa, personalPoints.escuela, personalPoints.trabajo]);

  const originCoord = getCoordinates(originType);
  const destCoord = getCoordinates(destType);

  const directOptions = planResult?.directOptions || [];
  const transferOptions = planResult?.transferOptions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Selector de Origen y Destino */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Compass size={14} />
            Configura tu trayecto
          </span>
          {pickingTarget && (
            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
              📍 Haz clic en el mapa...
            </span>
          )}
        </div>

        {/* Origen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>PUNTO DE SALIDA (ORIGEN):</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[
              { id: 'casa', icon: '🏠', label: 'Casa' },
              { id: 'escuela', icon: '🎓', label: 'Escuela' },
              { id: 'trabajo', icon: '💼', label: 'Trabajo' },
              { id: 'map', icon: '📍', label: 'Mapa' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setOriginType(btn.id)}
                style={{
                  padding: '6px 2px',
                  background: originType === btn.id ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                  border: originType === btn.id ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '6px',
                  color: originType === btn.id ? '#93c5fd' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: originType === btn.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px'
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>📍 {originCoord?.label || `${originCoord?.lat?.toFixed(4)}, ${originCoord?.lng?.toFixed(4)}`}</span>
            <button
              type="button"
              onClick={() => onPickPointOnMap(originType)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}
            >
              Cambiar en mapa
            </button>
          </div>
        </div>

        {/* Destino */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>PUNTO DE LLEGADA (DESTINO):</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[
              { id: 'escuela', icon: '🎓', label: 'Escuela' },
              { id: 'casa', icon: '🏠', label: 'Casa' },
              { id: 'trabajo', icon: '💼', label: 'Trabajo' },
              { id: 'map', icon: '📍', label: 'Mapa' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDestType(btn.id)}
                style={{
                  padding: '6px 2px',
                  background: destType === btn.id ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                  border: destType === btn.id ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: '6px',
                  color: destType === btn.id ? '#6ee7b7' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: destType === btn.id ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px'
                }}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🏁 {destCoord?.label || `${destCoord?.lat?.toFixed(4)}, ${destCoord?.lng?.toFixed(4)}`}</span>
            <button
              type="button"
              onClick={() => onPickPointOnMap(destType)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline' }}
            >
              Cambiar en mapa
            </button>
          </div>
        </div>

        {/* Botón de Cálculo */}
        <button
          type="button"
          onClick={handlePlanTrip}
          disabled={loading}
          style={{
            padding: '9px 14px',
            background: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          <Navigation size={15} />
          <span>{loading ? 'Calculando mejores combis...' : 'Calcular "¿Qué combi tomo?"'}</span>
        </button>
      </div>

      {/* Resultados de la Planificación */}
      {planResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Pestañas de Filtro de Resultados */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveResultTab('all')}
              style={{
                background: activeResultTab === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                color: activeResultTab === 'all' ? '#ffffff' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Todas ({directOptions.length + transferOptions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('direct')}
              style={{
                background: activeResultTab === 'direct' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                color: activeResultTab === 'direct' ? '#34d399' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Directas ({directOptions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('transfer')}
              style={{
                background: activeResultTab === 'transfer' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                color: activeResultTab === 'transfer' ? '#60a5fa' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Con Trasbordo ({transferOptions.length})
            </button>
          </div>

          {/* Opciones Directas */}
          {(activeResultTab === 'all' || activeResultTab === 'direct') && directOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🟢 Rutas Directas (Sin bajarte de la combi)
              </div>

              {directOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                      border: isSelected ? `2px solid ${opt.routeColor || '#10b981'}` : '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            background: opt.routeColor || '#2563EB',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                        >
                          {opt.routeName}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          ({opt.stopsCount} paradas)
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontWeight: 800, fontSize: '13px' }}>
                        <Clock size={13} />
                        <span>~{opt.estimatedMinutes} min</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>🚶 Sube en: <strong>{opt.originStop.name}</strong> ({opt.originWalkMeters} m a pie)</div>
                      <div>🏁 Baja en: <strong>{opt.destStop.name}</strong> ({opt.destWalkMeters} m a pie)</div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          marginTop: '4px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '10px',
                          color: '#94a3b8',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        {opt.instructions.map((inst, idx) => (
                          <div key={idx}>&bull; {inst}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Opciones con Trasbordo */}
          {(activeResultTab === 'all' || activeResultTab === 'transfer') && transferOptions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔄 Rutas con 1 Trasbordo (Combinación Rápida)
              </div>

              {transferOptions.map((opt) => {
                const isSelected = selectedTrip?.id === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => onSelectTrip(opt)}
                    style={{
                      background: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {/* Encabezado con las dos rutas */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            background: opt.firstRoute.color || '#2563EB',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          {opt.firstRoute.name.split(' - ')[0]}
                        </span>
                        <ArrowRight size={12} color="#94a3b8" />
                        <span
                          style={{
                            background: opt.secondRoute.color || '#10B981',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          {opt.secondRoute.name.split(' - ')[0]}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontWeight: 800, fontSize: '13px' }}>
                        <Clock size={13} />
                        <span>~{opt.estimatedMinutes} min</span>
                      </div>
                    </div>

                    {/* Nodo de transferencia */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.6)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>🔄</span>
                      <span>Transbordo en: <strong>{opt.transferNode.nodeName}</strong> (~{opt.transferNode.walkMeters} m)</span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      <div>1. Sube en: <strong>{opt.firstRoute.originStop.name}</strong> ({opt.firstRoute.stopsCount} paradas)</div>
                      <div>2. Baja en: <strong>{opt.secondRoute.destStop.name}</strong> ({opt.secondRoute.stopsCount} paradas)</div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          marginTop: '4px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '10px',
                          color: '#94a3b8',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        {opt.instructions.map((inst, idx) => (
                          <div key={idx}>&bull; {inst}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {directOptions.length === 0 && transferOptions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
              <AlertCircle size={24} color="#f59e0b" style={{ margin: '0 auto 8px auto' }} />
              <div>No se encontraron rutas directas ni trasbordos en esa distancia.</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Intenta seleccionando puntos más cercanos a los corredores troncales (Av. Central, Libramiento Sur o Libramiento Norte).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
