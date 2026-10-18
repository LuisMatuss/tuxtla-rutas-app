// Componente Cartográfico: Renderizado de unidades colectivas en tiempo real con motor cinemático
// Muestra sentido de circulación realista (Ida ➔ y Vuelta ↩) y parada de 15 segundos subiendo pasaje
import React, { useMemo } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

/**
 * Crea un icono HTML personalizado con etiqueta clara de Ruta y Sentido (Ida ➔ / Vuelta ↩)
 */
function createBusIcon(unit) {
  const isBoarding = unit.status === 'BOARDING';
  const isVuelta = unit.directionType === 'VUELTA';
  const routeColor = unit.routeColor || '#2563EB';
  const mainColor = isBoarding ? '#f59e0b' : routeColor;
  const dwellSec = Math.ceil(unit.dwellRemainingSec || 15);
  const arrow = isVuelta ? '↩' : '➔';
  const labelText = unit.displayLabel || `${unit.shortName || 'Ruta'} • ${unit.directionLabel || (isVuelta ? 'Vuelta' : 'Ida')}`;

  const html = `
    <div style="position: relative; width: 44px; height: 44px; transition: transform 0.25s linear;">
      <!-- Aura de pulso (Ámbar si sube pasaje, sutil si está en tránsito) -->
      <div style="
        position: absolute;
        top: -4px;
        left: -4px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: ${isBoarding ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.15)'};
        animation: ${isBoarding ? 'pulse-boarding 1.2s infinite ease-in-out' : 'pulse 2s infinite ease-out'};
      "></div>

      <!-- Icono central del colectivo con elevación limpia neutra -->
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: ${isBoarding ? 'linear-gradient(135deg, #d97706, #b45309)' : `linear-gradient(135deg, ${mainColor}, #1e3a8a)`};
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3);
        border: 2.5px solid ${isVuelta ? '#e2e8f0' : '#ffffff'};
        font-size: ${isBoarding ? '18px' : '16px'};
        position: relative;
        z-index: 2;
        transition: transform 0.25s linear;
      ">
        ${isBoarding ? '⏸️' : '🚐'}
      </div>

      <!-- Placa de Identificación Realista: Ruta + Sentido (Ida ➔ / Vuelta ↩) -->
      <div style="
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isBoarding ? 'rgba(180, 83, 9, 0.96)' : 'rgba(15, 23, 42, 0.96)'};
        color: #ffffff;
        border: 1px solid ${isBoarding ? '#fbbf24' : isVuelta ? '#93c5fd' : routeColor};
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        padding: 1px 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span>${labelText}</span>
        <span style="font-weight: 900; color: ${isVuelta ? '#93c5fd' : '#fef08a'};">${arrow}</span>
        ${isBoarding ? `<span style="color: #fef08a;">(${dwellSec}s)</span>` : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    className: `live-unit-icon ${isBoarding ? 'is-boarding' : 'is-transit'}`,
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26]
  });
}

export function LiveUnitsLayer({
  units = [],
  visibleRouteIds = null,
  selectedRouteId = null,
  directionFilter = 'ALL'
}) {
  // Filtrar unidades según las rutas visibles en el mapa y sentido seleccionado
  const filteredUnits = useMemo(() => {
    if (!Array.isArray(units) || units.length === 0) return [];
    return units.filter((unit) => {
      // 1. Filtrar por visibilidad de ruta
      if (visibleRouteIds && Array.isArray(visibleRouteIds) && visibleRouteIds.length > 0) {
        const isVisible = visibleRouteIds.includes(unit.routeId);
        const isSelected = selectedRouteId === unit.routeId;
        if (!isVisible && !isSelected) return false;
      }
      // 2. Filtrar por sentido de circulación (Ida / Vuelta)
      if (directionFilter === 'IDA' && unit.directionType === 'VUELTA') {
        return false;
      }
      if (directionFilter === 'VUELTA' && unit.directionType === 'IDA') {
        return false;
      }
      return true;
    });
  }, [units, visibleRouteIds, selectedRouteId, directionFilter]);

  if (filteredUnits.length === 0) {
    return null;
  }

  return (
    <>
      {filteredUnits.map((unit) => {
        const displayLat = Number(unit.animLat !== undefined ? unit.animLat : unit.lat);
        const displayLng = Number(unit.animLng !== undefined ? unit.animLng : unit.lng);

        if (!Number.isFinite(displayLat) || !Number.isFinite(displayLng)) {
          return null;
        }

        const icon = createBusIcon(unit);
        const color = unit.routeColor || '#2563EB';
        const isBoarding = unit.status === 'BOARDING';
        const isVuelta = unit.directionType === 'VUELTA';
        const dwellSec = Math.ceil(unit.dwellRemainingSec || 15);
        const dirLabel = unit.directionLabel || (isVuelta ? 'Vuelta' : 'Ida');
        const arrow = isVuelta ? '↩' : '➔';
        const destTerminal = unit.destinationTerminal || unit.nextStopName || 'Terminal';

        return (
          <Marker
            key={unit.unitId}
            position={[displayLat, displayLng]}
            icon={icon}
          >
            <Tooltip direction="top" offset={[0, -22]}>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px' }}>
                <div style={{ fontWeight: 800 }}>
                  {unit.displayLabel || unit.unitId} {arrow} &bull; {unit.routeName}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
                  Sentido: {dirLabel} hacia {destTerminal}
                </div>
                {isBoarding ? (
                  <div style={{ color: '#d97706', fontWeight: 700 }}>
                    ⏸️ Subiendo pasaje ({dwellSec}s)
                  </div>
                ) : (
                  <div style={{ color: '#38bdf8' }}>
                    ⚡ {unit.speedKmh || 30} km/h &bull; En tránsito
                  </div>
                )}
              </div>
            </Tooltip>

            <Popup>
              <div style={{ color: '#0f172a', minWidth: '230px', padding: '2px' }}>
                {/* Cabecera con Ruta y Sentido */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}
                >
                  <div
                    style={{
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: color,
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    {unit.routeName || 'Transporte Colectivo'}
                  </div>
                  <div
                    style={{
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: isVuelta ? '#e0f2fe' : '#fef3c7',
                      color: isVuelta ? '#0369a1' : '#b45309',
                      fontSize: '12px',
                      fontWeight: 800
                    }}
                  >
                    {dirLabel} {arrow}
                  </div>
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
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#b45309' }}>
                        Parada: {unit.currentStopName || 'Parada Oficial'}
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
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#166534'
                    }}
                  >
                    <span>🚀</span>
                    <span>En tránsito fluido ({unit.speedKmh || 30} km/h)</span>
                  </div>
                )}

                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  {unit.displayLabel || unit.unitId} ({dirLabel} {arrow})
                </h4>

                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ margin: 0, color: '#0f172a' }}>
                    🚩 <strong>Sentido:</strong> {dirLabel} hacia <strong>{destTerminal}</strong>
                  </p>

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
                      🏁 <strong>Próxima parada:</strong> {unit.nextStopName}
                    </p>
                  )}

                  <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>
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
                      fontSize: '12px',
                      color: isBoarding ? '#d97706' : '#059669',
                      fontWeight: 700
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isBoarding ? '#f59e0b' : '#10b981'
                      }}
                    ></span>
                    {isBoarding ? 'Ascenso de pasaje activo' : 'Circuito continuo activo'}
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
