// Hook Personalizado: Gestión del estado reactivo de rutas geográficas, selección activa y carga
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client.js';

export function useGeoRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Esqueleto: Cargar rutas al montar el componente
    setLoading(false);
  }, []);

  return {
    routes,
    selectedRoute,
    setSelectedRoute,
    loading,
    error
  };
}
