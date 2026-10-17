// Componente Cartográfico: Renderizado de unidades colectivas en tiempo real con motor cinemático LERP
// Muestra estado en tránsito (28-34 km/h) y estado de parada (15 segundos subiendo pasaje con cuenta regresiva en vivo)

import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

/**
 * Crea un icono HTML personalizado según el estado (BOARDING vs IN_TRANSIT)
 */
function createBusIcon(unit) {
  const isBoarding = unit.status === 'BOARDING';
  const routeColor = unit.routeColor || '#2563EB';
  const mainColor = isBoarding ? '#f59e0b' : routeColor;
  const dwellSec = Math.ceil(unit.dwellRemainingSec || 15);

  const html = `
    <div style="position: relative; width: 42px; height: 42px;">
      <!-- Aura de pulso (Ámbar si sube pasaje, color de ruta si está en tránsito) -->
      <div style="
        position: absolute;
        top: -4px;
        left: -4px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: ${mainColor}40;
        animation: ${isBoarding ? 'pulse-boarding 1.2s infinite ease-in-out' : 'pulse 2s infinite ease-out'};
      "></div>

      <!-- Icono central del colectivo -->
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${isBoarding ? 'linear-gradient(135deg, #f59e0b, #d97706)' : `linear-gradient(135deg, ${mainColor}, #1d4ed8)`};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px ${mainColor}90, 0 2px 4px rgba(0,0,0,0.5);
        border: 2.5px solid #ffffff;
        font-size: ${isBoarding ? '18px' : '16px'};
        position: relative;
        z-index: 2;
        transition: all 0.3s ease;
      ">
        ${isBoarding ? '⏸️' : '🚐'}
      </div>

      <!-- Placa e Indicador inferior -->
      <div style="
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isBoarding ? 'rgba(180, 83, 9, 0.95)' : 'rgba(15, 23, 42, 0.95)'};
        color: #ffffff;
        border: 1px solid ${isBoarding ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'};
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 3px;
      ">
        <span>${unit.unitId}</span>
        ${isBoarding ? `<span style="color: #fef08a;">(${dwellSec}s)</span>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: `live-unit-icon ${isBoarding ? 'is-boarding' : 'is-transit'}`,
    html,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -24]
  });
}

export function LiveUnitsLayer({ units = [] }) {
  if (!Array.isArray(units) || units.length === 0) {
    return null;
  }

  return (
    <>
      {units.map((unit) => {
        const displayLat = unit.animLat !== undefined ? unit.animLat : unit.lat;
        const displayLng = unit.animLng !== undefined ? unit.animLng : unit.lng;

        if (!displayLat || !displayLng || !Number.isFinite(displayLat) || !Number.isFinite(displayLng)) {
          return null;
        }

        const icon = createBusIcon(unit);
        const color = unit.routeColor || '#2563EB';
        const isBoarding = unit.status === 'BOARDING';
        const dwellSec = Math.ceil(unit.dwellRemainingSec || 15);

        return (
          <Marker
            key={unit.unitId}
            position={[displayLat, displayLng]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -22]}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '11px' }}>
                <div style={{ fontWeight: 800 }}>{unit.unitId} &bull; {unit.routeName}</div>
                {isBoarding ? (
                  <div style={{ color: '#d97706', fontWeight: 700 }}>
                    ⏸️ Subiendo pasaje ({dwellSec}s)
                  </div>
                ) : (
                  <div style={{ color: '#2563eb' }}>
                    ⚡ {unit.speedKmh || 30} km/h &bull; {unit.locationName || 'En tránsito'}
                  </div>
                )}
              </div>
            </Tooltip>

            <Popup>
              <div style={{ color: '#0f172a', minWidth: '220px', padding: '2px' }}>
                {/* Cabecera con Ruta */}
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: color,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '6px'
                  }}
                >
                  {unit.routeName || 'Transporte Colectivo'}
                </div>

                {/* Banner de Estado Cinemático */}
                {isBoarding ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#92400e'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>⏸️</span>
                    <div>
                      <div>Subiendo pasaje ({dwellSec}s...)</div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: '#b45309' }}>
                        Parada: {unit.currentStopName || 'Terminal / Parada'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      border: '1px solid #22c55e',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#166534'
                    }}
                  >
                    <span>🚀</span>
                    <span>En tránsito fluido ({unit.speedKmh || 30} km/h)</span>
                  </div>
                )}

                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Unidad: {unit.unitId}
                </h4>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0, color: '#475569' }}>
                    ⚡ <strong>Velocidad:</strong> {isBoarding ? '0 km/h (Detenido)' : `${unit.speedKmh || 30} km/h`}
                  </p>

                  {unit.currentStopName && (
                    <p style={{ margin: 0, color: '#475569' }}>
                      📍 <strong>Parada {isBoarding ? 'actual' : 'previa'}:</strong> {unit.currentStopName}
                    </p>
                  )}

                  {unit.nextStopName && (
                    <p style={{ margin: 0, color: '#475569' }}>
                      🏁 <strong>Próximo destino:</strong> {unit.nextStopName}
                    </p>
                  )}

                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '10px' }}>
                    🌐 GPS: {displayLat.toFixed(5)}, {displayLng.toFixed(5)}
                  </p>

                  <div
                    style={{
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: isBoarding ? '#d97706' : '#059669',
                      fontWeight: 700
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isBoarding ? '#f59e0b' : '#10b981'
                      }}
                    ></span>
                    {isBoarding ? 'Pausa reglamentaria de ascenso de pasaje' : 'Motor cinemático LERP activo'}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
