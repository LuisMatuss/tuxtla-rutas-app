// Componente de Panel Lateral: Planificador Inteligente de Viajes "¿Qué combi tomo?" (Zero-Slop, Apple Maps style)
import React, { useState, useEffect } from 'react';
import { Navigation, Clock, Footprints, ArrowRight, Compass, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    handlePlanTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originType, destType, personalPoints.casa, personalPoints.escuela, personalPoints.trabajo]);

  const originCoord = getCoordinates(originType);
  const destCoord = getCoordinates(destType);

  const directOptions = planResult?.directOptions || [];
  const transferOptions = planResult?.transferOptions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Configuración de Trayecto */}
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
            <Compass size={15} color="#38bdf8" />
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Planificador de Rutas
            </h3>
          </div>
          {pickingTarget && (
            <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 600 }}>
              📍 Clic en mapa...
            </span>
          )}
        </div>

        {/* Origen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>SALIDA:</span>
            <button
              type="button"
              onClick={() => onPickPointOnMap(originType)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px' }}
            >
              Fijar en mapa
            </button>
          </div>
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

        {/* Destino */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>LLEGADA:</span>
            <button
              type="button"
              onClick={() => onPickPointOnMap(destType)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px' }}
            >
              Fijar en mapa
            </button>
          </div>
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

        {/* Botón de Cálculo */}
        <button
          type="button"
          onClick={handlePlanTrip}
          disabled={loading}
          style={{
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Navigation size={14} />
          <span>{loading ? 'Calculando...' : 'Calcular Trayecto'}</span>
        </button>
      </div>

      {/* Resultados de Planificación */}
      {planResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Pestañas de Filtro (Chips) */}
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

          {/* Opciones Directas: 1 Sola Línea con Chips Estilo Apple Maps */}
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

          {/* Opciones con Trasbordo: 1 Sola Línea con Chips Estilo Apple Maps */}
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
