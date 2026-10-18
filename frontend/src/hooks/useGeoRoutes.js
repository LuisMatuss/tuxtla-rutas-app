// Hook Personalizado: Gestión del estado geoespacial, rutas activas, paradas, proximidad y telemetría en vivo
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, calculateHaversineDistance, BACKUP_ROUTES } from '../api/client.js';

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

  // Sondeo de telemetría en tiempo real (cada 2 segundos)
  const pollTelemetry = useCallback(async () => {
    try {
      const res = await apiClient.fetchTelemetry();
      if (res.data && Array.isArray(res.data)) {
        setTelemetryUnits((prevUnits) => {
          if (!prevUnits || prevUnits.length === 0) return res.data;
          const prevMap = new Map(prevUnits.map((u) => [u.unitId, u]));
          return res.data.map((fresh) => {
            const prev = prevMap.get(fresh.unitId);
            return {
              ...fresh,
              currentVertexIndex: prev?.currentVertexIndex !== undefined ? prev.currentVertexIndex : fresh.currentVertexIndex,
              segmentProgress: prev?.segmentProgress !== undefined ? prev.segmentProgress : fresh.segmentProgress,
              targetStopIndex: prev?.targetStopIndex !== undefined ? prev.targetStopIndex : fresh.targetStopIndex,
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

    // Motor cinemático en el cliente: avanza vértice por vértice sobre las calles de Tuxtla cada 250ms (~30 km/h)
    let lastTick = Date.now();
    const animTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(1.0, Math.max(0.1, (now - lastTick) / 1000));
      lastTick = now;

      setTelemetryUnits((prevUnits) => {
        if (!prevUnits || prevUnits.length === 0) return prevUnits;

        return prevUnits.map((unit) => {
          const route =
            routes.find((r) => r.id === unit.routeId) ||
            BACKUP_ROUTES.find((r) => r.id === unit.routeId);

          if (!route || !route.stops || route.stops.length < 2) return unit;

          const coords = route.geometry?.coordinates || [];
          if (coords.length < 2) return unit;

          const stopIndices = route.stopVertexIndices || [];
          const stops = route.stops;

          // ESTADO 1: Combi detenida subiendo pasaje en parada oficial (15 segundos)
          if (unit.status === 'BOARDING') {
            const remaining = Math.max(0, (unit.dwellRemainingSec || 15) - dt);

            if (remaining <= 0) {
              // Fin de la cuenta regresiva: Reanuda marcha sobre los vértices
              let proposed = (unit.targetStopIndex ?? 1) + (unit.direction || 1);
              let dir = unit.direction || 1;
              if (proposed >= stops.length) {
                dir = -1;
                proposed = stops.length - 2;
              } else if (proposed < 0) {
                dir = 1;
                proposed = 1;
              }

              const nextVertex = stopIndices[unit.targetStopIndex] ?? unit.currentVertexIndex;
              const nextStop = stops[proposed];

              return {
                ...unit,
                status: 'IN_TRANSIT',
                dwellRemainingSec: 0,
                speedKmh: Math.floor(Math.random() * 5) + 28, // ~30 km/h
                currentStopIndex: unit.targetStopIndex,
                targetStopIndex: proposed,
                nextStopIndex: proposed,
                direction: dir,
                currentVertexIndex: nextVertex,
                segmentProgress: 0.0,
                locationName: `En ruta hacia ${nextStop?.name || 'siguiente parada'}`
              };
            }

            const currentStop = stops[unit.currentStopIndex] || stops[0];
            return {
              ...unit,
              dwellRemainingSec: remaining,
              speedKmh: 0,
              animLat: unit.lat || currentStop.lat,
              animLng: unit.lng || currentStop.lng,
              status: 'BOARDING',
              locationName: '⏸️ Subiendo pasaje'
            };
          }

          // ESTADO 2: En tránsito sobre los vértices de las calles a ~30 km/h
          const speedKmh = unit.speedKmh || (Math.floor(Math.random() * 5) + 28);
          const speedMps = (speedKmh * 1000) / 3600;
          let distRemaining = speedMps * dt;

          let vIdx = unit.currentVertexIndex ?? 0;
          let segProg = unit.segmentProgress || 0.0;
          let dir = unit.direction || 1;
          let currentLat = unit.lat || coords[vIdx][1];
          let currentLng = unit.lng || coords[vIdx][0];
          let isBoardingNow = false;
          let dwellSec = 0;
          let newTargetStopIdx = unit.targetStopIndex ?? 1;

          while (distRemaining > 0) {
            const nextIdx = vIdx + dir;

            if (nextIdx < 0 || nextIdx >= coords.length) {
              dir = -dir;
              isBoardingNow = true;
              dwellSec = 15;
              break;
            }

            const A = coords[vIdx]; // [lng, lat]
            const B = coords[nextIdx]; // [lng, lat]
            const segLen = calculateHaversineDistance(A[1], A[0], B[1], B[0]);

            if (segLen < 0.1) {
              vIdx = nextIdx;
              segProg = 0.0;
              continue;
            }

            const remOnSeg = (1.0 - segProg) * segLen;

            if (distRemaining < remOnSeg) {
              segProg += distRemaining / segLen;
              distRemaining = 0;
              currentLat = A[1] + (B[1] - A[1]) * segProg;
              currentLng = A[0] + (B[0] - A[0]) * segProg;

              // Comprobar cercanía a parada objetivo (<20m)
              const targetStop = stops[newTargetStopIdx];
              if (targetStop) {
                const d = calculateHaversineDistance(currentLat, currentLng, targetStop.lat, targetStop.lng);
                if (d <= 20) {
                  isBoardingNow = true;
                  dwellSec = 15;
                  currentLat = targetStop.lat;
                  currentLng = targetStop.lng;
                }
              }
            } else {
              distRemaining -= remOnSeg;
              segProg = 0.0;
              vIdx = nextIdx;
              currentLat = B[1];
              currentLng = B[0];

              // Comprobar si alcanzó el vértice o está a <20m de parada
              const targetStopVertex = stopIndices[newTargetStopIdx] ?? -1;
              const targetStop = stops[newTargetStopIdx];
              const reachedVertex = vIdx === targetStopVertex;
              const nearStop = targetStop && calculateHaversineDistance(B[1], B[0], targetStop.lat, targetStop.lng) <= 20;

              if (reachedVertex || nearStop) {
                isBoardingNow = true;
                dwellSec = 15;
                if (targetStop) {
                  currentLat = targetStop.lat;
                  currentLng = targetStop.lng;
                }
                break;
              }
            }
          }

          const targetStop = stops[newTargetStopIdx];
          const nextStopName = targetStop?.name || 'Siguiente parada';

          return {
            ...unit,
            currentVertexIndex: vIdx,
            segmentProgress: segProg,
            direction: dir,
            speedKmh: isBoardingNow ? 0 : speedKmh,
            status: isBoardingNow ? 'BOARDING' : 'IN_TRANSIT',
            dwellRemainingSec: isBoardingNow ? dwellSec : 0,
            lat: currentLat,
            lng: currentLng,
            animLat: currentLat,
            animLng: currentLng,
            targetStopIndex: newTargetStopIdx,
            nextStopName,
            locationName: isBoardingNow ? '⏸️ Subiendo pasaje' : `En ruta hacia ${nextStopName}`
          };
        });
      });
    }, 250);

    return () => {
      clearInterval(pollTimer);
      clearInterval(animTimer);
    };
  }, [loadRoutes, pollTelemetry, routes]);


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
