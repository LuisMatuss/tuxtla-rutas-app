// Hook Personalizado: Gestión del estado geoespacial, rutas activas, paradas, proximidad y telemetría en vivo
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client.js';

export function useGeoRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeStop, setActiveStop] = useState(null);
  const [userLocation, setUserLocationState] = useState(null);
  const [nearestStops, setNearestStops] = useState([]);
  const [telemetryUnits, setTelemetryUnits] = useState([]);
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
      if (response.isDemoMode !== undefined) {
        setIsDemoMode(response.isDemoMode);
      }
    } catch (err) {
      console.error('[useGeoRoutes] Error al cargar rutas:', err);
      setError(err.message || 'Error al conectar con el servicio de rutas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sondeo de telemetría en tiempo real (cada 2 segundos) y motor de animación fluida LERP (cada 250ms)
  const pollTelemetry = useCallback(async () => {
    try {
      const res = await apiClient.fetchTelemetry();
      if (res.data && Array.isArray(res.data)) {
        setTelemetryUnits((prevUnits) => {
          // Si ya existen unidades previas, fusionamos para evitar parpadeos
          if (!prevUnits || prevUnits.length === 0) return res.data;
          const prevMap = new Map(prevUnits.map((u) => [u.unitId, u]));
          return res.data.map((fresh) => {
            const prev = prevMap.get(fresh.unitId);
            return {
              ...fresh,
              // Mantener referencias suaves
              animLat: prev?.animLat || fresh.lat,
              animLng: prev?.animLng || fresh.lng
            };
          });
        });
      }
    } catch (err) {
      console.warn('[useGeoRoutes] Error al consultar telemetría en vivo:', err);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
    pollTelemetry();

    // Sondeo de servidor cada 2 segundos
    const pollTimer = setInterval(() => {
      pollTelemetry();
    }, 2000);

    // Bucle cinemático suave LERP en el cliente (cada 250ms - 4 veces por segundo)
    let lastTick = Date.now();
    const animTimer = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      setTelemetryUnits((prevUnits) => {
        if (!prevUnits || prevUnits.length === 0) return prevUnits;

        return prevUnits.map((unit) => {
          // Si está subiendo pasaje (BOARDING), decrementar cuenta regresiva de 15 segundos
          if (unit.status === 'BOARDING') {
            const remaining = Math.max(0, (unit.dwellRemainingSec || 15) - dt);
            return {
              ...unit,
              dwellRemainingSec: remaining,
              speedKmh: 0,
              animLat: unit.lat,
              animLng: unit.lng,
              status: remaining <= 0 ? 'IN_TRANSIT' : 'BOARDING'
            };
          }

          // En tránsito: Interpolación lineal hacia las coordenadas objetivo
          const targetLat = unit.lat;
          const targetLng = unit.lng;
          const currentLat = unit.animLat !== undefined ? unit.animLat : targetLat;
          const currentLng = unit.animLng !== undefined ? unit.animLng : targetLng;

          // LERP suave hacia el objetivo
          const lerpFactor = 0.25; // avance progresivo suave cada 250ms
          const nextLat = currentLat + (targetLat - currentLat) * lerpFactor;
          const nextLng = currentLng + (targetLng - currentLng) * lerpFactor;

          return {
            ...unit,
            animLat: nextLat,
            animLng: nextLng
          };
        });
      });
    }, 250);

    return () => {
      clearInterval(pollTimer);
      clearInterval(animTimer);
    };
  }, [loadRoutes, pollTelemetry]);


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
    telemetryUnits,
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
    refreshTelemetry: pollTelemetry,
    // Compatibilidad
    setSelectedRoute: selectRoute
  };
}
