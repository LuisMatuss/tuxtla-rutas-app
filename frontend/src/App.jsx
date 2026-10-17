// Componente Raíz: Ensambla la barra lateral de selección de rutas y la vista interactiva del mapa Leaflet
import React from 'react';
import { RouteSelector } from './components/Sidebar/RouteSelector.jsx';
import { ScheduleInfo } from './components/Sidebar/ScheduleInfo.jsx';
import { MapView } from './components/Map/MapView.jsx';
import { useGeoRoutes } from './hooks/useGeoRoutes.js';

export default function App() {
  const { routes, selectedRoute, setSelectedRoute } = useGeoRoutes();

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <RouteSelector
          routes={routes}
          selectedRoute={selectedRoute}
          onSelectRoute={setSelectedRoute}
        />
        <ScheduleInfo route={selectedRoute} />
      </div>
      <main style={{ flex: 1, height: '100%' }}>
        <MapView selectedRoute={selectedRoute} />
      </main>
    </div>
  );
}
