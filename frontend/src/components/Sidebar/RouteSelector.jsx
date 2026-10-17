// Componente de Panel Lateral: Selector interactivo y buscador de rutas
// Incluye soporte para marcar rutas favoritas (persistido en localStorage) y estados en caliente
import React, { useState, useMemo, useEffect } from 'react';
import { Bus, Layers, MapPin, Search, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';

const FAVORITES_STORAGE_KEY = 'tuxtla_favorite_routes';

export function RouteSelector({
  routes = [],
  selectedRouteId = null,
  onSelectRoute
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['r-001', 'r-002']; // Favoritas iniciales
    } catch {
      return ['r-001', 'r-002'];
    }
  });

  const toggleFavorite = (routeId, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Error al guardar favoritos:', err);
      }
      return next;
    });
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (filterFavorites && !favorites.includes(r.id)) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.name?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    });
  }, [routes, searchTerm, filterFavorites, favorites]);

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

      {/* Botones de Filtro Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Botón para ver Todas las Rutas */}
        <button
          type="button"
          onClick={() => {
            setFilterFavorites(false);
            onSelectRoute(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 10px',
            borderRadius: 'var(--radius-md)',
            border: !selectedRouteId && !filterFavorites ? '1.5px solid var(--color-primary-light)' : '1px solid var(--border-subtle)',
            background: !selectedRouteId && !filterFavorites ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            color: !selectedRouteId && !filterFavorites ? '#ffffff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={14} color={!selectedRouteId && !filterFavorites ? '#10b981' : '#94a3b8'} />
          <span>Todas ({routes.length})</span>
        </button>

        {/* Botón Filtro Favoritas */}
        <button
          type="button"
          onClick={() => setFilterFavorites(!filterFavorites)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '9px 10px',
            borderRadius: 'var(--radius-md)',
            border: filterFavorites ? '1.5px solid #fbbf24' : '1px solid var(--border-subtle)',
            background: filterFavorites ? 'rgba(251, 191, 36, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            color: filterFavorites ? '#fbbf24' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
        >
          <Star size={14} fill={filterFavorites ? '#fbbf24' : 'none'} color="#fbbf24" />
          <span>Favoritas ({favorites.length})</span>
        </button>
      </div>

      {/* Lista de Tarjetas de Rutas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredRoutes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const routeColor = route.color || '#2563EB';
          const stopsCount = Array.isArray(route.stops) ? route.stops.length : 0;
          const isFavorite = favorites.includes(route.id);
          const isSuspended = route.status === 'SUSPENDED';
          const isDelayed = route.status === 'DELAYED';

          return (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? `2px solid ${routeColor}`
                  : isSuspended
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : '1px solid var(--border-subtle)',
                background: isSelected
                  ? 'rgba(30, 41, 59, 0.95)'
                  : isSuspended
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(30, 41, 59, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                opacity: isSuspended ? 0.75 : 1
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
                  background: isSuspended ? '#ef4444' : routeColor
                }}
              />

              <div style={{ marginLeft: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bus size={15} color={isSuspended ? '#ef4444' : routeColor} />
                    <strong style={{ fontSize: '13px', color: '#ffffff' }}>
                      {route.name}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Badge de Estado Operativo */}
                    {isSuspended ? (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}
                      >
                        🔴 Suspendida
                      </span>
                    ) : isDelayed ? (
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.25)',
                          color: '#fbbf24',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}
                      >
                        🟡 Retrasos
                      </span>
                    ) : (
                      <span
                        style={{
                          background: `${routeColor}25`,
                          color: routeColor,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 700
                        }}
                      >
                        {route.scheduleInfo?.frequencyMinutes ? `${route.scheduleInfo.frequencyMinutes} min` : 'Activa'}
                      </span>
                    )}

                    {/* Botón Favorito Estrella */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(route.id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={isFavorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    >
                      <Star
                        size={15}
                        fill={isFavorite ? '#fbbf24' : 'none'}
                        color={isFavorite ? '#fbbf24' : '#64748b'}
                      />
                    </button>
                  </div>
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

        {filteredRoutes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '12px' }}>
            {filterFavorites
              ? 'No tienes rutas marcadas como favoritas. Haz clic en la estrella ⭐ de cualquier ruta para guardarla.'
              : 'No se encontraron rutas que coincidan con la búsqueda.'}
          </div>
        )}
      </div>
    </div>
  );
}
