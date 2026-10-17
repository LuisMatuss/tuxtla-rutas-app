// Componente Cartográfico: Marcadores para puntos clave personales (Casa, Escuela/UNACH, Trabajo)
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Generador de Icono personalizado con emoji y pin estilizado
function createPointIcon(emoji, bgGradient, borderColor) {
  return L.divIcon({
    className: 'custom-personal-pin',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        background: ${bgGradient};
        border: 2px solid ${borderColor};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justifyContent: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.45);
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 18px;
          display: block;
          line-height: 1;
        ">${emoji}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -36]
  });
}

const ICONS = {
  casa: createPointIcon('🏠', 'linear-gradient(135deg, #10b981 0%, #059669 100%)', '#ffffff'),
  escuela: createPointIcon('🎓', 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', '#ffffff'),
  trabajo: createPointIcon('💼', 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', '#ffffff')
};

export function PersonalPointsMarkers({
  personalPoints = {},
  onSelectPointAsOrigin,
  onSelectPointAsDest
}) {
  const points = [
    { key: 'casa', name: '🏠 Mi Casa', point: personalPoints.casa, desc: 'Zona Sur / Terán' },
    { key: 'escuela', name: '🎓 Escuela / UNACH', point: personalPoints.escuela, desc: 'Campus I / Blvd. Belisario Domínguez' },
    { key: 'trabajo', name: '💼 Mi Trabajo', point: personalPoints.trabajo, desc: 'Parque Central / Centro Tuxtla' }
  ];

  return (
    <>
      {points.map(({ key, name, point, desc }) => {
        if (!point || !point.lat || !point.lng) return null;

        const icon = ICONS[key] || ICONS.casa;

        return (
          <Marker
            key={key}
            position={[point.lat, point.lng]}
            icon={icon}
          >
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a', minWidth: '170px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{name}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                  {point.label || desc}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {onSelectPointAsOrigin && (
                    <button
                      type="button"
                      onClick={() => onSelectPointAsOrigin(point)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Salir de aquí
                    </button>
                  )}
                  {onSelectPointAsDest && (
                    <button
                      type="button"
                      onClick={() => onSelectPointAsDest(point)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Ir hacia aquí
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
