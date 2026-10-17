// Hook Personalizado: Gestión del estado geoespacial, rutas activas, paradas y proximidad
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client.js';

export function useGeoRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeStop, setActiveStop] = useState(null);
  const [userLocation, setUserLocationState] = useState(null);
  const [nearestStops, setNearestStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingNearest, setLoadingNearest] = useState(false);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Carga inicial de rutas
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchRoutes();
      setRoutes(response.data || []);
      setIsDemoMode(response.isDemoMode || false);
    } catch (err) {
      console.error('[useGeoRoutes] Error al cargar rutas:', err);
      setError(err.message || 'Error al conectar con el servicio de rutas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // Ruta activa según selectedRouteId
  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  // Selección de ruta
  const selectRoute = useCallback((routeOrId) => {
    if (!routeOrId) {
      setSelectedRouteId(null);
      setActiveStop(null);
      return;
    }
    const id = typeof routeOrId === 'object' ? routeOrId.id : routeOrId;
    setSelectedRouteId((prevId) => (prevId === id ? null : id));
    setActiveStop(null);
  }, []);

  // Selección de parada para enfocar en mapa
  const selectStop = useCallback((stop) => {
    setActiveStop(stop || null);
  }, []);

  // Consulta de paradas cercanas al cambiar la ubicación del usuario
  const findNearest = useCallback(async (coords, radius = 1500) => {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return;
    setLoadingNearest(true);
    try {
      const res = await apiClient.fetchNearestStops({
        lat: coords.lat,
        lng: coords.lng,
        radius,
        limit: 5
      });
      setNearestStops(res.data || []);
      if (res.isDemoMode !== undefined) {
        setIsDemoMode(res.isDemoMode);
      }
    } catch (err) {
      console.warn('[useGeoRoutes] Error buscando paradas cercanas:', err);
    } finally {
      setLoadingNearest(false);
    }
  }, []);

  // Establecer ubicación del usuario (ej. clic en mapa o geolocalización)
  const setUserLocation = useCallback(
    (coords) => {
      if (!coords) {
        setUserLocationState(null);
        setNearestStops([]);
        return;
      }
      setUserLocationState(coords);
      findNearest(coords);
    },
    [findNearest]
  );

  // Simular ubicación en un punto emblemático de Tuxtla
  const simulateTuxtlaLocation = useCallback(
    (lat = 16.7516, lng = -93.1161) => {
      setUserLocation({ lat, lng });
    },
    [setUserLocation]
  );

  // Limpiar ubicación del usuario
  const clearUserLocation = useCallback(() => {
    setUserLocationState(null);
    setNearestStops([]);
  }, []);

  return {
    routes,
    selectedRouteId,
    selectedRoute,
    activeStop,
    userLocation,
    nearestStops,
    loading,
    loadingNearest,
    error,
    isDemoMode,
    selectRoute,
    selectStop,
    setUserLocation,
    simulateTuxtlaLocation,
    clearUserLocation,
    reloadRoutes: loadRoutes,
    // Compatibilidad
    setSelectedRoute: selectRoute
  };
}
