// Componente Cartográfico: Marcadores interactivos para alertas viales activas en Tuxtla Gutiérrez
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function getAlertIcon(type) {
  let emoji = '⚠️';
  let gradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

  switch (type) {
    case 'ROAD_BLOCK':
      emoji = '🚧';
      gradient = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
      break;
    case 'HEAVY_TRAFFIC':
      emoji = '🚗';
      gradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      break;
    case 'FLOODING':
      emoji = '🌧️';
      gradient = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      break;
    case 'CROWDED_UNIT':
      emoji = '🚐';
      gradient = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
      break;
    case 'ROAD_WORK':
      emoji = '🔧';
      gradient = 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)';
      break;
    default:
      emoji = '⚠️';
      gradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  }

  return L.divIcon({
    className: 'custom-alert-pin',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${gradient};
          opacity: 0.4;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${gradient};
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          font-size: 14px;
        ">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
}

export function RoadAlertMarkers({ incidents = [], routes = [] }) {
  const activeAlerts = incidents.filter((i) => i.status === 'ACTIVE_ALERT');

  return (
    <>
      {activeAlerts.map((alert) => {
        if (!alert.lat || !alert.lng) return null;

        const affectedRoute = routes.find((r) => r.id === alert.routeId);
        const icon = getAlertIcon(alert.type);

        return (
          <Marker
            key={alert.id}
            position={[alert.lat, alert.lng]}
            icon={icon}
          >
            <Popup>
              <div style={{ fontFamily: 'inherit', color: '#0f172a', minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>
                    {alert.type === 'ROAD_BLOCK' ? '🚧' : alert.type === 'HEAVY_TRAFFIC' ? '🚗' : '⚠️'}
                  </span>
                  <strong style={{ fontSize: '13px', color: '#991b1b' }}>
                    {alert.title}
                  </strong>
                </div>

                <div style={{ fontSize: '11px', color: '#334155', marginBottom: '6px', lineHeight: '1.4' }}>
                  {alert.description}
                </div>

                {affectedRoute && (
                  <div style={{ marginBottom: '6px' }}>
                    <span
                      style={{
                        background: affectedRoute.color || '#2563EB',
                        color: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700
                      }}
                    >
                      Afecta: {affectedRoute.name}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    fontSize: '10px',
                    color: '#b91c1c',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>⏱️ Retraso estimado:</span>
                  <span>+{alert.delayMinutes || 15} minutos</span>
                </div>

                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '6px' }}>
                  Reportado: {new Date(alert.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
