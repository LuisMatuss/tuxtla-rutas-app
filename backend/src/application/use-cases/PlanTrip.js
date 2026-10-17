// Caso de Uso: Planificador de Viajes Inteligente ("¿Qué combi tomo?")
// Resuelve rutas directas y rutas con 1 trasbordo entre las 8 rutas principales de Tuxtla Gutiérrez

import { GeoCoordinate } from '../../domain/value-objects/GeoCoordinate.js';

export class PlanTrip {
  /**
   * @param {import('../ports/out/RouteRepository.interface.js').RouteRepositoryInterface} routeRepository
   */
  constructor(routeRepository) {
    if (!routeRepository) {
      throw new Error('PlanTrip requiere una instancia válida de RouteRepositoryInterface');
    }
    this.routeRepository = routeRepository;
  }

  /**
   * Ejecuta el cálculo multimodal de viaje
   * @param {Object} params
   * @param {number|string} params.originLat
   * @param {number|string} params.originLng
   * @param {number|string} params.destLat
   * @param {number|string} params.destLng
   */
  async execute({ originLat, originLng, destLat, destLng }) {
    const origin = new GeoCoordinate(originLat, originLng);
    const destination = new GeoCoordinate(destLat, destLng);

    const routes = await this.routeRepository.findAll();
    const activeRoutes = routes.filter((r) => r.scheduleInfo?.status !== 'SUSPENDED');

    // Intentar primero con radios estrictos (900m caminata origen/destino, 400m trasbordo)
    let result = this.#findTripOptions(origin, destination, activeRoutes, 900, 450);

    // Si no hay opciones, aplicar radio adaptativo ampliado para asegurar cobertura total en Tuxtla
    if (result.directOptions.length === 0 && result.transferOptions.length === 0) {
      result = this.#findTripOptions(origin, destination, activeRoutes, 1400, 700);
    }

    return {
      success: true,
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      directCount: result.directOptions.length,
      transferCount: result.transferOptions.length,
      directOptions: result.directOptions.slice(0, 5),
      transferOptions: result.transferOptions.slice(0, 6)
    };
  }

  #findTripOptions(origin, destination, activeRoutes, maxWalkMeters, maxTransferWalkMeters) {
    const directOptions = [];
    const transferOptions = [];

    // 1. BÚSQUEDA DE RUTAS DIRECTAS
    for (const route of activeRoutes) {
      if (!route.stops || route.stops.length < 2) continue;

      let bestOriginStop = null;
      let minOriginDist = Infinity;
      let bestDestStop = null;
      let minDestDist = Infinity;

      for (const stop of route.stops) {
        const stopCoord = new GeoCoordinate(stop.lat, stop.lng);
        const distFromOrigin = origin.distanceTo(stopCoord);
        const distFromDest = destination.distanceTo(stopCoord);

        if (distFromOrigin <= maxWalkMeters && distFromOrigin < minOriginDist) {
          minOriginDist = distFromOrigin;
          bestOriginStop = stop;
        }

        if (distFromDest <= maxWalkMeters && distFromDest < minDestDist) {
          minDestDist = distFromDest;
          bestDestStop = stop;
        }
      }

      if (bestOriginStop && bestDestStop && bestOriginStop.id !== bestDestStop.id) {
        const stopsCount = Math.abs(bestDestStop.stopOrder - bestOriginStop.stopOrder);

        if (stopsCount >= 1) {
          const originWalkMin = Math.max(1, Math.round(minOriginDist / 80));
          const transitMin = Math.round(stopsCount * 2.2) + 3;
          const destWalkMin = Math.max(1, Math.round(minDestDist / 80));
          const totalEstimatedMinutes = originWalkMin + transitMin + destWalkMin;

          directOptions.push({
            id: `direct-${route.id}`,
            type: 'DIRECT',
            routeId: route.id,
            routeName: route.name,
            routeColor: route.color,
            originStop: {
              id: bestOriginStop.id,
              name: bestOriginStop.name,
              lat: bestOriginStop.lat,
              lng: bestOriginStop.lng,
              stopOrder: bestOriginStop.stopOrder
            },
            destStop: {
              id: bestDestStop.id,
              name: bestDestStop.name,
              lat: bestDestStop.lat,
              lng: bestDestStop.lng,
              stopOrder: bestDestStop.stopOrder
            },
            originWalkMeters: Math.round(minOriginDist),
            destWalkMeters: Math.round(minDestDist),
            totalWalkMeters: Math.round(minOriginDist + minDestDist),
            stopsCount,
            estimatedMinutes: totalEstimatedMinutes,
            instructions: [
              `Caminar ${Math.round(minOriginDist)} m hasta la parada "${bestOriginStop.name}" (~${originWalkMin} min).`,
              `Abordar "${route.name}" y avanzar ${stopsCount} paradas (~${transitMin} min).`,
              `Bajar en la parada "${bestDestStop.name}".`,
              `Caminar ${Math.round(minDestDist)} m hasta tu destino final (~${destWalkMin} min).`
            ]
          });
        }
      }
    }

    // 2. BÚSQUEDA DE RUTAS CON TRASBORDO (1 TRASBORDO)
    for (let i = 0; i < activeRoutes.length; i++) {
      const routeA = activeRoutes[i];
      if (!routeA.stops || routeA.stops.length < 2) continue;

      let bestOriginStopA = null;
      let minOriginDistA = Infinity;
      for (const stop of routeA.stops) {
        const stopCoord = new GeoCoordinate(stop.lat, stop.lng);
        const dist = origin.distanceTo(stopCoord);
        if (dist <= maxWalkMeters && dist < minOriginDistA) {
          minOriginDistA = dist;
          bestOriginStopA = stop;
        }
      }

      if (!bestOriginStopA) continue;

      for (let j = 0; j < activeRoutes.length; j++) {
        if (i === j) continue;
        const routeB = activeRoutes[j];
        if (!routeB.stops || routeB.stops.length < 2) continue;

        let bestDestStopB = null;
        let minDestDistB = Infinity;
        for (const stop of routeB.stops) {
          const stopCoord = new GeoCoordinate(stop.lat, stop.lng);
          const dist = destination.distanceTo(stopCoord);
          if (dist <= maxWalkMeters && dist < minDestDistB) {
            minDestDistB = dist;
            bestDestStopB = stop;
          }
        }

        if (!bestDestStopB) continue;

        let bestConnectionPair = null;
        let minTransferDist = Infinity;

        for (const stopA of routeA.stops) {
          if (stopA.id === bestOriginStopA.id) continue;

          const coordA = new GeoCoordinate(stopA.lat, stopA.lng);

          for (const stopB of routeB.stops) {
            if (stopB.id === bestDestStopB.id) continue;

            const coordB = new GeoCoordinate(stopB.lat, stopB.lng);
            const transferDist = coordA.distanceTo(coordB);

            if (transferDist <= maxTransferWalkMeters && transferDist < minTransferDist) {
              minTransferDist = transferDist;
              bestConnectionPair = { stopA, stopB, transferDist };
            }
          }
        }

        if (bestConnectionPair) {
          const { stopA, stopB, transferDist } = bestConnectionPair;
          const stopsCountA = Math.abs(stopA.stopOrder - bestOriginStopA.stopOrder);
          const stopsCountB = Math.abs(bestDestStopB.stopOrder - stopB.stopOrder);

          if (stopsCountA >= 1 && stopsCountB >= 1) {
            const originWalkMin = Math.max(1, Math.round(minOriginDistA / 80));
            const transitAMin = Math.round(stopsCountA * 2.2) + 3;
            const transferWalkMin = Math.max(1, Math.round(transferDist / 80));
            const waitBMin = 4;
            const transitBMin = Math.round(stopsCountB * 2.2);
            const destWalkMin = Math.max(1, Math.round(minDestDistB / 80));

            const totalEstimatedMinutes =
              originWalkMin + transitAMin + transferWalkMin + waitBMin + transitBMin + destWalkMin;

            transferOptions.push({
              id: `transfer-${routeA.id}-${routeB.id}`,
              type: 'TRANSFER',
              firstRoute: {
                id: routeA.id,
                name: routeA.name,
                color: routeA.color,
                originStop: {
                  id: bestOriginStopA.id,
                  name: bestOriginStopA.name,
                  lat: bestOriginStopA.lat,
                  lng: bestOriginStopA.lng
                },
                transferStop: {
                  id: stopA.id,
                  name: stopA.name,
                  lat: stopA.lat,
                  lng: stopA.lng
                },
                stopsCount: stopsCountA,
                transitMinutes: transitAMin
              },
              transferNode: {
                fromStopName: stopA.name,
                toStopName: stopB.name,
                walkMeters: Math.round(transferDist),
                walkMinutes: transferWalkMin,
                nodeName: stopA.name === stopB.name ? stopA.name : `${stopA.name} ↔ ${stopB.name}`
              },
              secondRoute: {
                id: routeB.id,
                name: routeB.name,
                color: routeB.color,
                transferStop: {
                  id: stopB.id,
                  name: stopB.name,
                  lat: stopB.lat,
                  lng: stopB.lng
                },
                destStop: {
                  id: bestDestStopB.id,
                  name: bestDestStopB.name,
                  lat: bestDestStopB.lat,
                  lng: bestDestStopB.lng
                },
                stopsCount: stopsCountB,
                transitMinutes: transitBMin
              },
              originWalkMeters: Math.round(minOriginDistA),
              transferWalkMeters: Math.round(transferDist),
              destWalkMeters: Math.round(minDestDistB),
              totalWalkMeters: Math.round(minOriginDistA + transferDist + minDestDistB),
              totalStopsCount: stopsCountA + stopsCountB,
              estimatedMinutes: totalEstimatedMinutes,
              instructions: [
                `Caminar ${Math.round(minOriginDistA)} m hacia la parada "${bestOriginStopA.name}" (~${originWalkMin} min).`,
                `Tomar "${routeA.name}" y avanzar ${stopsCountA} paradas (~${transitAMin} min).`,
                `Descender en "${stopA.name}" y transbordar caminando ${Math.round(transferDist)} m hacia "${stopB.name}".`,
                `Abordar "${routeB.name}" y avanzar ${stopsCountB} paradas (~${transitBMin} min).`,
                `Bajar en "${bestDestStopB.name}" y caminar ${Math.round(minDestDistB)} m a tu destino final (~${destWalkMin} min).`
              ]
            });
          }
        }
      }
    }

    directOptions.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    transferOptions.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);

    return { directOptions, transferOptions };
  }
}
