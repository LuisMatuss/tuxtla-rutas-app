// Componente Cartográfico: Capa de visualización de viaje planificado (Directo o Trasbordo)
import React, { useEffect } from 'react';
import { Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

function createTripStopIcon(emoji, bg, border) {
  return L.divIcon({
    className: 'custom-trip-stop-pin',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${bg};
        border: 2px solid ${border};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-size: 15px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

const ICONS = {
  board: createTripStopIcon('🟢', '#10b981', '#ffffff'),
  transfer: createTripStopIcon('🔄', '#f59e0b', '#ffffff'),
  alight: createTripStopIcon('🏁', '#ef4444', '#ffffff')
};

export function PlannedTripLayer({ selectedTrip }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedTrip) return;

    let pointsToFit = [];

    if (selectedTrip.type === 'DIRECT') {
      const coords = selectedTrip.routeCoordinates || [];
      pointsToFit = coords.map(([lng, lat]) => [lat, lng]);
    } else if (selectedTrip.type === 'TRANSFER') {
      const c1 = selectedTrip.firstRoute?.coordinates || [];
      const c2 = selectedTrip.secondRoute?.coordinates || [];
      pointsToFit = [
        ...c1.map(([lng, lat]) => [lat, lng]),
        ...c2.map(([lng, lat]) => [lat, lng])
      ];
    }

    if (pointsToFit.length > 0) {
      try {
        const bounds = L.latLngBounds(pointsToFit);
        map.fitBounds(bounds, { padding: [60, 60], duration: 1.2 });
      } catch (e) {
        console.warn('Error al ajustar límites de viaje planificado:', e);
      }
    }
  }, [selectedTrip, map]);

  if (!selectedTrip) return null;

  if (selectedTrip.type === 'DIRECT') {
    const rawCoords = selectedTrip.routeCoordinates || [];
    const positions = rawCoords.map(([lng, lat]) => [lat, lng]);
    const routeColor = selectedTrip.routeColor || '#10b981';

    return (
      <>
        {/* Halo resplandeciente */}
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#ffffff',
            weight: 9,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
        {/* Línea principal */}
        <Polyline
          positions={positions}
          pathOptions={{
            color: routeColor,
            weight: 6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />

        {/* Parada de abordaje */}
        {selectedTrip.originStop?.lat && (
          <Marker
            position={[selectedTrip.originStop.lat, selectedTrip.originStop.lng]}
            icon={ICONS.board}
          >
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a' }}>
                <strong style={{ color: '#059669' }}>🟢 Subir a la combi aquí</strong>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{selectedTrip.originStop.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Ruta: {selectedTrip.routeName}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Parada de descenso */}
        {selectedTrip.destStop?.lat && (
          <Marker
            position={[selectedTrip.destStop.lat, selectedTrip.destStop.lng]}
            icon={ICONS.alight}
          >
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a' }}>
                <strong style={{ color: '#dc2626' }}>🏁 Bajar de la combi aquí</strong>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{selectedTrip.destStop.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Destino final alcanzado
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </>
    );
  }

  if (selectedTrip.type === 'TRANSFER') {
    const coords1 = (selectedTrip.firstRoute?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    const coords2 = (selectedTrip.secondRoute?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    const color1 = selectedTrip.firstRoute?.color || '#3b82f6';
    const color2 = selectedTrip.secondRoute?.color || '#10b981';

    const originStop = selectedTrip.firstRoute?.originStop;
    const transferStop1 = selectedTrip.firstRoute?.transferStop;
    const destStop = selectedTrip.secondRoute?.destStop;

    return (
      <>
        {/* Tramo 1 */}
        <Polyline
          positions={coords1}
          pathOptions={{
            color: '#ffffff',
            weight: 8,
            opacity: 0.5,
            lineCap: 'round'
          }}
        />
        <Polyline
          positions={coords1}
          pathOptions={{
            color: color1,
            weight: 5,
            opacity: 1,
            lineCap: 'round'
          }}
        />

        {/* Tramo 2 */}
        <Polyline
          positions={coords2}
          pathOptions={{
            color: '#ffffff',
            weight: 8,
            opacity: 0.5,
            lineCap: 'round'
          }}
        />
        <Polyline
          positions={coords2}
          pathOptions={{
            color: color2,
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            dashArray: '10, 6'
          }}
        />

        {/* Marcador 1: Abordar primer colectivo */}
        {originStop?.lat && (
          <Marker position={[originStop.lat, originStop.lng]} icon={ICONS.board}>
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a' }}>
                <strong style={{ color: '#2563eb' }}>🟢 1. Abordar primera combi</strong>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{originStop.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {selectedTrip.firstRoute.name}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador 2: Transbordo */}
        {transferStop1?.lat && (
          <Marker position={[transferStop1.lat, transferStop1.lng]} icon={ICONS.transfer}>
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a' }}>
                <strong style={{ color: '#d97706' }}>🔄 2. Nodo de Transbordo</strong>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{selectedTrip.transferNode?.nodeName || transferStop1.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Caminar ~{selectedTrip.transferNode?.walkMeters || 100} m para abordar {selectedTrip.secondRoute.name}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador 3: Bajar en destino */}
        {destStop?.lat && (
          <Marker position={[destStop.lat, destStop.lng]} icon={ICONS.alight}>
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a' }}>
                <strong style={{ color: '#dc2626' }}>🏁 3. Bajar en destino final</strong>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{destStop.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {selectedTrip.secondRoute.name}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </>
    );
  }

  return null;
}
