// Componente Cartográfico: Renderizado de unidades de transporte colectivo en tiempo real
import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

/**
 * Crea un icono HTML personalizado para la unidad colectiva
 */
function createBusIcon(unit) {
  const color = unit.routeColor || '#2563EB';

  const html = `
    <div style="position: relative; width: 36px; height: 36px;">
      <!-- Aura de pulso de movimiento -->
      <div style="
        position: absolute;
        top: -4px;
        left: -4px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: ${color}35;
        animation: pulse 2s infinite ease-out;
      "></div>

      <!-- Icono central del colectivo -->
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px ${color}80, 0 2px 4px rgba(0,0,0,0.4);
        border: 2.5px solid #ffffff;
        font-size: 16px;
        position: relative;
        z-index: 2;
      ">
        🚐
      </div>

      <!-- Placa / Identificador inferior -->
      <div style="
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        z-index: 3;
      ">
        ${unit.unitId}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'live-unit-custom-icon',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22]
  });
}

export function LiveUnitsLayer({ units = [] }) {
  if (!Array.isArray(units) || units.length === 0) {
    return null;
  }

  return (
    <>
      {units.map((unit) => {
        if (!unit.lat || !unit.lng || !Number.isFinite(unit.lat) || !Number.isFinite(unit.lng)) {
          return null;
        }

        const icon = createBusIcon(unit);
        const color = unit.routeColor || '#2563EB';

        return (
          <Marker
            key={unit.unitId}
            position={[unit.lat, unit.lng]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <span style={{ fontWeight: 700 }}>
                {unit.unitId} &bull; {unit.speedKmh ? `${unit.speedKmh} km/h` : 'En ruta'}
              </span>
            </Tooltip>

            <Popup>
              <div style={{ color: '#0f172a', minWidth: '190px', padding: '2px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: color,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '6px'
                  }}
                >
                  {unit.routeName || 'Colectivo en Ruta'}
                </div>

                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  Unidad: {unit.unitId}
                </h4>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <p style={{ margin: 0, color: '#2563eb', fontWeight: 600 }}>
                    ⚡ Velocidad: {unit.speedKmh || 28} km/h
                  </p>

                  {unit.locationName && (
                    <p style={{ margin: 0, color: '#64748b' }}>
                      📍 Cerca de: <strong>{unit.locationName}</strong>
                    </p>
                  )}

                  <p style={{ margin: 0, color: '#64748b', fontSize: '11px' }}>
                    🌐 GPS: {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
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
                      color: '#059669',
                      fontWeight: 600
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    Telemetría en tiempo real activa
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
