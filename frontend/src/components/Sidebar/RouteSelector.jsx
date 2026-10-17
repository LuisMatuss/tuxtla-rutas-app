// Componente de Panel Lateral: Selector interactivo y buscador de rutas de transporte público
import React from 'react';

export function RouteSelector({ routes = [], selectedRoute, onSelectRoute }) {
  return (
    <aside style={{
      width: '320px',
      background: 'var(--bg-surface)',
      backdropFilter: 'var(--glass-blur)',
      borderRight: '1px solid var(--border-subtle)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 1000
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Rutas de Tuxtla</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {routes.map((route) => (
          <button
            key={route.id}
            onClick={() => onSelectRoute(route)}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedRoute?.id === route.id ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
              background: selectedRoute?.id === route.id ? 'var(--bg-surface-hover)' : 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <strong>{route.name}</strong>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{route.code}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}
