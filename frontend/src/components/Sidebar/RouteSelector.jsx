// Componente de Panel Lateral: Selector interactivo y buscador de rutas
import React, { useState, useMemo } from 'react';
import { Bus, Layers, MapPin, Search } from 'lucide-react';

export function RouteSelector({
  routes = [],
  selectedRouteId = null,
  onSelectRoute
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoutes = useMemo(() => {
    if (!searchTerm.trim()) return routes;
    const term = searchTerm.toLowerCase();
    return routes.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
    );
  }, [routes, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Barra de Búsqueda */}
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}
        />
        <input
          type="text"
          placeholder="Buscar ruta o colonia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px 9px 36px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
        />
      </div>

      {/* Botón para ver Todas las Rutas */}
      <button
        type="button"
        onClick={() => onSelectRoute(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: !selectedRouteId ? '1.5px solid var(--color-primary-light)' : '1px solid var(--border-subtle)',
          background: !selectedRouteId ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
          color: !selectedRouteId ? '#ffffff' : 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'left',
          transition: 'all 0.2s ease'
        }}
      >
        <Layers size={18} color={!selectedRouteId ? '#10b981' : '#94a3b8'} />
        <span>Ver toda la red de rutas</span>
        <span
          style={{
            marginLeft: 'auto',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '11px'
          }}
        >
          {routes.length}
        </span>
      </button>

      {/* Lista de Tarjetas de Rutas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const routeColor = route.color || '#2563EB';
          const stopsCount = Array.isArray(route.stops) ? route.stops.length : 0;

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? `2px solid ${routeColor}`
                  : '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'rgba(30, 41, 59, 0.95)'
                  : 'rgba(30, 41, 59, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Barra lateral de color de ruta */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: routeColor
                }}
              />

              <div style={{ marginLeft: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bus size={15} color={routeColor} />
                    <strong style={{ fontSize: '14px', color: '#ffffff' }}>
                      {route.name}
                    </strong>
                  </div>

                  <span
                    style={{
                      background: `${routeColor}25`,
                      color: routeColor,
                      padding: '2px 7px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {route.scheduleInfo?.frequencyMinutes ? `${route.scheduleInfo.frequencyMinutes} min` : 'Activa'}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4',
                    margin: '4px 0 8px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {route.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color={routeColor} />
                    {stopsCount} paradas
                  </span>

                  <span>
                    🕒 {route.scheduleInfo?.firstRun || '05:30'} - {route.scheduleInfo?.lastRun || '22:00'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
