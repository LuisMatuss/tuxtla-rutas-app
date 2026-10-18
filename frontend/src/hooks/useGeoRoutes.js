// Hook Personalizado: Gestión del estado geoespacial, rutas activas, paradas, proximidad y telemetría en vivo
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  // Referencia mutable a las rutas para que el motor cinemático de 250ms siempre acceda a las coordenadas viales más recientes sin reiniciar intervalos
  const routesRef = useRef(routes);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  // Carga inicial de rutas (solo se ejecuta al montar o recargar explícitamente)
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchRoutes();
      const loaded = response.data && response.data.length > 0 ? response.data : BACKUP_ROUTES;
      setRoutes(loaded);
      routesRef.current = loaded;
      if (response.isDemoMode !== undefined) {
        setIsDemoMode(response.isDemoMode);
      }
    } catch (err) {
      console.error('[useGeoRoutes] Error al cargar rutas:', err);
      setError(err.message || 'Error al conectar con el servicio de rutas');
      setRoutes(BACKUP_ROUTES);
      routesRef.current = BACKUP_ROUTES;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sondeo de telemetría en tiempo real desde el backend (cada 2.5s)
  const pollTelemetry = useCallback(async () => {
    try {
      const res = await apiClient.fetchTelemetry();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTelemetryUnits((prevUnits) => {
          if (!prevUnits || prevUnits.length === 0) {
            return res.data.map((u) => ({
              ...u,
              lat: Number(u.lat),
              lng: Number(u.lng),
              animLat: Number(u.lat),
              animLng: Number(u.lng)
            }));
          }

          const prevMap = new Map(prevUnits.map((u) => [u.unitId, u]));
          return res.data.map((fresh) => {
            const prev = prevMap.get(fresh.unitId);
            const freshLat = Number(fresh.lat);
            const freshLng = Number(fresh.lng);

            // Sincronizar coordenadas autoritativas asegurando que sean números válidos
            const validLat = Number.isFinite(freshLat) ? freshLat : prev?.lat;
            const validLng = Number.isFinite(freshLng) ? freshLng : prev?.lng;

            return {
              ...fresh,
              lat: validLat,
              lng: validLng,
              animLat: validLat,
              animLng: validLng,
              currentVertexIndex: fresh.currentVertexIndex !== undefined ? fresh.currentVertexIndex : prev?.currentVertexIndex,
              segmentProgress: fresh.segmentProgress !== undefined ? fresh.segmentProgress : prev?.segmentProgress,
              targetStopIndex: fresh.targetStopIndex !== undefined ? fresh.targetStopIndex : prev?.targetStopIndex
            };
          });
        });
      }
    } catch (err) {
      console.warn('[useGeoRoutes] Error al consultar telemetría:', err);
    }
  }, []);

  // 1. Efecto de carga inicial de rutas
  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // 2. Efecto de sondeo continuo del servidor
  useEffect(() => {
    pollTelemetry();
    const pollTimer = setInterval(() => {
      pollTelemetry();
    }, 2500);

    return () => {
      clearInterval(pollTimer);
    };
  }, [pollTelemetry]);

  // 3. Motor cinemático local fluido (250ms): avanza vértice por vértice a ~30 km/h y gestiona paradas de 15s
  useEffect(() => {
    let lastTick = Date.now();

    const animTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.5, Math.max(0.1, (now - lastTick) / 1000));
      lastTick = now;

      setTelemetryUnits((prevUnits) => {
        if (!prevUnits || prevUnits.length === 0) return prevUnits;

        const currentRoutes = routesRef.current && routesRef.current.length > 0 ? routesRef.current : BACKUP_ROUTES;
        const routesMap = new Map(currentRoutes.map((r) => [r.id, r]));

        let hasChanged = false;

        const updatedUnits = prevUnits.map((unit) => {
          const route = routesMap.get(unit.routeId);
          if (!route) return unit;

          const coords = route.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return unit;

          const stops = Array.isArray(route.stops) ? route.stops : [];

          // ESTADO 1: Combi detenida subiendo pasaje en parada oficial (15 segundos)
          if (unit.status === 'BOARDING') {
            const remaining = Math.max(0, (unit.dwellRemainingSec || 15) - dt);

            if (remaining <= 0) {
              // Fin de la parada: reanuda marcha hacia la siguiente parada
              hasChanged = true;
              let proposed = (unit.targetStopIndex ?? 1) + (unit.direction || 1);
              let dir = unit.direction || 1;
              if (proposed >= stops.length) {
                dir = -1;
                proposed = Math.max(0, stops.length - 2);
              } else if (proposed < 0) {
                dir = 1;
                proposed = Math.min(stops.length - 1, 1);
              }

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
                segmentProgress: 0.0,
                locationName: `En ruta hacia ${nextStop?.name || 'siguiente parada'}`
              };
            }

            hasChanged = true;
            return {
              ...unit,
              dwellRemainingSec: remaining,
              speedKmh: 0,
              status: 'BOARDING',
              locationName: '⏸️ Subiendo pasaje'
            };
          }

          // ESTADO 2: En tránsito fluido vértice a vértice a ~30 km/h
          const speedKmh = unit.speedKmh && unit.speedKmh > 0 ? unit.speedKmh : 30;
          const speedMps = (speedKmh * 1000) / 3600; // ~8.33 m/s
          let distRemaining = speedMps * dt;

          let vIdx = Math.max(0, Math.min(coords.length - 1, unit.currentVertexIndex ?? 0));
          let segProg = unit.segmentProgress || 0.0;
          let dir = unit.direction || 1;
          let currentLat = Number.isFinite(unit.lat) ? unit.lat : coords[vIdx][1];
          let currentLng = Number.isFinite(unit.lng) ? unit.lng : coords[vIdx][0];
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

            const A = coords[vIdx];
            const B = coords[nextIdx];
            if (!A || !B || !Array.isArray(A) || !Array.isArray(B)) break;

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

              const targetStop = stops[newTargetStopIdx];
              if (targetStop) {
                const nearStop = calculateHaversineDistance(B[1], B[0], targetStop.lat, targetStop.lng) <= 20;
                if (nearStop) {
                  isBoardingNow = true;
                  dwellSec = 15;
                  currentLat = targetStop.lat;
                  currentLng = targetStop.lng;
                  break;
                }
              }
            }
          }

          hasChanged = true;
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

        return hasChanged ? updatedUnits : prevUnits;
      });
    }, 250);

    return () => {
      clearInterval(animTimer);
    };
  }, []);

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
    setSelectedRoute: selectRoute
  };
}
