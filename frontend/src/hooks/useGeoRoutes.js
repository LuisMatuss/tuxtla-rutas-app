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

  // Sondeo de telemetría en tiempo real desde el backend (cada 4s)
  // El bucle cinemático local de 250ms es la única autoridad de posición para evitar saltos hacia atrás (rubber-banding)
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
              animLng: Number(u.lng),
              currentVertexIndex: u.currentVertexIndex ?? 0,
              segmentProgress: u.segmentProgress ?? 0
            }));
          }

          const prevMap = new Map(prevUnits.map((u) => [u.unitId, u]));
          const incomingIds = new Set(res.data.map((u) => u.unitId));

          // 1. Conservar unidades existentes: la cinemática local de 250ms es la única autoridad sobre la posición y progreso
          const updatedExisting = prevUnits
            .filter((u) => incomingIds.has(u.unitId))
            .map((prev) => {
              const fresh = res.data.find((f) => f.unitId === prev.unitId);
              if (!fresh) return prev;
              return {
                ...fresh,
                // Preservar estrictamente el estado cinemático local autoritativo (cero rubber-banding)
                lat: prev.lat,
                lng: prev.lng,
                animLat: prev.animLat ?? prev.lat,
                animLng: prev.animLng ?? prev.lng,
                currentVertexIndex: prev.currentVertexIndex,
                segmentProgress: prev.segmentProgress,
                status: prev.status,
                dwellRemainingSec: prev.dwellRemainingSec,
                direction: prev.direction,
                directionType: prev.directionType ?? fresh.directionType,
                currentStopIndex: prev.currentStopIndex,
                targetStopIndex: prev.targetStopIndex,
                nextStopIndex: prev.nextStopIndex,
                speedKmh: prev.speedKmh,
                currentStopName: prev.currentStopName,
                nextStopName: prev.nextStopName,
                locationName: prev.locationName
              };
            });

          // 2. Agregar únicamente unidades nuevas si el Admin despachó una combi extra
          const newUnits = res.data
            .filter((fresh) => !prevMap.has(fresh.unitId))
            .map((fresh) => ({
              ...fresh,
              lat: Number(fresh.lat),
              lng: Number(fresh.lng),
              animLat: Number(fresh.lat),
              animLng: Number(fresh.lng),
              currentVertexIndex: fresh.currentVertexIndex ?? 0,
              segmentProgress: fresh.segmentProgress ?? 0
            }));

          return [...updatedExisting, ...newUnits];
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

  // 2. Efecto de sondeo continuo del servidor cada 4s
  useEffect(() => {
    pollTelemetry();
    const pollTimer = setInterval(() => {
      pollTelemetry();
    }, 4000);

    return () => {
      clearInterval(pollTimer);
    };
  }, [pollTelemetry]);

  // 2 rutas por defecto activas en el mapa al abrir para una vista limpia (Ruta 1 y Ruta 43)
  const [visibleRouteIds, setVisibleRouteIds] = useState([
    'a0000001-0000-0000-0000-000000000001',
    'a0000003-0000-0000-0000-000000000003'
  ]);

  // Filtro de sentido de circulación: 'ALL' (Ida y Vuelta), 'IDA' (Solo Ida), 'VUELTA' (Solo Vuelta)
  const [directionFilter, setDirectionFilter] = useState('ALL');

  // Alternar visibilidad de una ruta específica
  const toggleRouteVisibility = useCallback((routeId) => {
    setVisibleRouteIds((prev) => {
      if (prev.includes(routeId)) {
        return prev.filter((id) => id !== routeId);
      }
      return [...prev, routeId];
    });
  }, []);

  // Mostrar todas las rutas
  const showAllRoutes = useCallback(() => {
    const allIds = (routesRef.current && routesRef.current.length > 0 ? routesRef.current : BACKUP_ROUTES).map((r) => r.id);
    setVisibleRouteIds(allIds);
  }, []);

  // Limpiar mapa (ninguna ruta visible ni seleccionada)
  const clearAllRoutes = useCallback(() => {
    setVisibleRouteIds([]);
    setSelectedRouteId(null);
  }, []);

  // Mostrar rutas favoritas (por defecto Ruta 1 y Ruta 43)
  const showFavoriteRoutes = useCallback((favoriteIds = []) => {
    if (Array.isArray(favoriteIds) && favoriteIds.length > 0) {
      setVisibleRouteIds(favoriteIds);
    } else {
      setVisibleRouteIds([
        'a0000001-0000-0000-0000-000000000001',
        'a0000003-0000-0000-0000-000000000003'
      ]);
    }
  }, []);

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

          const isVuelta = unit.directionType === 'VUELTA';
          const coords = isVuelta
            ? (route.inboundGeometry?.coordinates || route.geometry?.coordinates)
            : (route.outboundGeometry?.coordinates || route.geometry?.coordinates);

          if (!Array.isArray(coords) || coords.length < 2) return unit;

          const stops = isVuelta
            ? (route.returnStops || [...(route.stops || [])].reverse())
            : (Array.isArray(route.stops) ? route.stops : []);

          const stopIndices = isVuelta
            ? (route.inboundStopIndices || [])
            : (route.outboundStopIndices || route.stopVertexIndices || []);

          if (stops.length < 2) return unit;

          // ESTADO 1: Combi detenida subiendo pasaje en parada oficial (15 segundos)
          if (unit.status === 'BOARDING') {
            const remaining = Math.max(0, (unit.dwellRemainingSec || 15) - dt);

            if (remaining <= 0) {
              hasChanged = true;
              let proposed = (unit.targetStopIndex ?? 1) + 1;
              let nextVIdx = unit.currentVertexIndex ?? 0;
              let currentS = unit.targetStopIndex ?? 1;

              if (proposed >= stops.length) {
                // Fin del circuito: reiniciar desde el inicio del trazado
                currentS = 0;
                proposed = 1;
                nextVIdx = 0;
              } else {
                // Avance estrictamente monótono: no retroceder el índice de vértice
                const stopVIdx = stopIndices[currentS];
                if (typeof stopVIdx === 'number' && stopVIdx >= nextVIdx) {
                  nextVIdx = stopVIdx;
                }
              }

              const nextStop = stops[proposed];

              return {
                ...unit,
                status: 'IN_TRANSIT',
                dwellRemainingSec: 0,
                speedKmh: Math.floor(Math.random() * 5) + 28, // ~30 km/h
                currentStopIndex: currentS,
                targetStopIndex: proposed,
                nextStopIndex: proposed,
                currentVertexIndex: nextVIdx,
                segmentProgress: 0.0,
                currentStopName: stops[currentS]?.name || unit.currentStopName,
                nextStopName: nextStop?.name || 'Siguiente parada',
                locationName: `${unit.directionLabel || (isVuelta ? 'Vuelta' : 'Ida')} hacia ${unit.destinationTerminal || nextStop?.name}`
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
          let currentLat = Number.isFinite(unit.lat) ? unit.lat : coords[vIdx][1];
          let currentLng = Number.isFinite(unit.lng) ? unit.lng : coords[vIdx][0];
          let isBoardingNow = false;
          let dwellSec = 0;
          let newTargetStopIdx = unit.targetStopIndex ?? 1;

          while (distRemaining > 0) {
            const nextIdx = vIdx + 1;

            if (nextIdx >= coords.length) {
              isBoardingNow = true;
              dwellSec = 15;
              vIdx = 0;
              segProg = 0.0;
              newTargetStopIdx = 1;
              currentLat = coords[0][1];
              currentLng = coords[0][0];
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
            speedKmh: isBoardingNow ? 0 : speedKmh,
            status: isBoardingNow ? 'BOARDING' : 'IN_TRANSIT',
            dwellRemainingSec: isBoardingNow ? dwellSec : 0,
            lat: currentLat,
            lng: currentLng,
            animLat: currentLat,
            animLng: currentLng,
            targetStopIndex: newTargetStopIdx,
            nextStopName,
            locationName: isBoardingNow ? '⏸️ Subiendo pasaje' : `${unit.directionLabel || (isVuelta ? 'Vuelta' : 'Ida')} hacia ${unit.destinationTerminal || nextStopName}`
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
    visibleRouteIds,
    directionFilter,
    loading,
    loadingNearest,
    error,
    isDemoMode,
    selectRoute,
    selectStop,
    setUserLocation,
    simulateTuxtlaLocation,
    clearUserLocation,
    setVisibleRouteIds,
    toggleRouteVisibility,
    showAllRoutes,
    clearAllRoutes,
    showFavoriteRoutes,
    setDirectionFilter,
    reloadRoutes: loadRoutes,
    refreshTelemetry: pollTelemetry,
    setSelectedRoute: selectRoute
  };
}
