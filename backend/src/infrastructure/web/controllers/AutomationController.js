// Adaptador Primario (HTTP Controller): Integraciones de Automatización, Webhooks y Telemetría IoT
// Conecta casos de uso de la capa de aplicación con n8n, Telegram Bot y Node-RED
// Incluye motor cinemático de movimiento continuo realista (LERP + 15s parada subiendo pasaje)

import { TUXTLA_ROUTES_SEED, calculateHaversineDistance } from '../../db/tuxtlaRoutesSeed.js';

export function getRouteShortCode(route) {
  if (!route) return 'Ruta';
  const name = route.name || '';
  if (name.includes('Ruta 108')) return 'R-108';
  if (name.includes('Ruta 115')) return 'R-115';
  if (name.includes('Ruta 1 -') || name.includes('Ruta 1 ')) return 'R-01';
  if (name.includes('Ruta A')) return 'R-A';
  if (name.includes('Ruta 43')) return 'R-43';
  if (name.includes('Ruta 90')) return 'R-90';
  if (name.includes('Ruta 58')) return 'R-58';
  if (name.includes('Ruta 52')) return 'R-52';
  if (name.includes('Ruta 30')) return 'R-30';
  if (name.includes('Ruta 73')) return 'R-73';
  if (name.includes('Ruta 51')) return 'R-51';
  if (name.includes('Ruta 22')) return 'R-22';
  const match = name.match(/Ruta\s+([A-Za-z0-9]+)/i);
  return match ? `R-${match[1]}` : 'Ruta';
}

export class AutomationController {
  /**
   * @param {Object} params
   * @param {import('../../../application/ports/in/CalculateNearestStopUseCase.interface.js').CalculateNearestStopUseCaseInterface} params.calculateNearestStopUseCase
   * @param {import('../../../application/ports/in/FindRoutesUseCase.interface.js').FindRoutesUseCaseInterface} params.findRoutesUseCase
   */
  constructor({ calculateNearestStopUseCase, findRoutesUseCase }) {
    if (!calculateNearestStopUseCase || !findRoutesUseCase) {
      throw new Error('AutomationController requiere calculateNearestStopUseCase y findRoutesUseCase');
    }
    this.calculateNearestStopUseCase = calculateNearestStopUseCase;
    this.findRoutesUseCase = findRoutesUseCase;

    // Almacén en memoria para telemetría GPS en tiempo real de unidades colectivas
    this.telemetryStore = new Map();

    // Rutas indexadas por ID para resolución ultra-rápida de paradas
    this.routesMap = new Map(TUXTLA_ROUTES_SEED.map((r) => [r.id, r]));

    // Inicializar estado cinemático de las 24 unidades activas (Ida y Vuelta para cada una de las 12 rutas)
    this.initKinematicUnits();

    // Iniciar bucle de simulación cinemática (actualización cada 1 segundo)
    if (process.env.NODE_ENV !== 'test') {
      this.startKinematicSimulation();
    }
  }

  /**
   * Inicializa 24 unidades (1 de IDA y 1 de VUELTA por cada ruta) sobre geometrías viales reales
   */
  initKinematicUnits() {
    for (const route of this.routesMap.values()) {
      const stops = route.stops || [];
      if (stops.length < 2) continue;

      const shortCode = getRouteShortCode(route);
      const cleanCode = shortCode.replace(/[^A-Za-z0-9]/g, '');
      const origin = stops[0]?.name || 'Terminal Inicial';
      const destination = stops[stops.length - 1]?.name || 'Terminal Final';

      // 1. Unidad de IDA (circula exclusivamente en outboundGeometry)
      const idaUnitId = `${cleanCode}-IDA`;
      const outboundCoords = route.outboundGeometry?.coordinates || route.geometry?.coordinates || [];
      const outboundIndices = route.outboundStopIndices || route.stopVertexIndices || [];
      const vFromIda = outboundIndices[1] ?? 0;
      const vToIda = outboundIndices[2] ?? Math.min(outboundCoords.length - 1, 20);
      const startIdxIda = Math.max(0, Math.min(outboundCoords.length - 1, Math.round((vFromIda + vToIda) / 2)));
      const startCoordIda = outboundCoords[startIdxIda] || [stops[0].lng, stops[0].lat];

      this.telemetryStore.set(idaUnitId, {
        unitId: idaUnitId,
        routeId: route.id,
        routeName: route.name,
        routeColor: route.color,
        shortName: shortCode,
        directionType: 'IDA',
        directionLabel: 'Ida',
        directionArrow: '➔',
        displayLabel: `${shortCode} • Ida`,
        destinationTerminal: destination,
        originTerminal: origin,
        lat: startCoordIda[1],
        lng: startCoordIda[0],
        speedKmh: 31,
        status: 'IN_TRANSIT',
        dwellRemainingSec: 0,
        currentVertexIndex: startIdxIda,
        segmentProgress: 0.0,
        currentStopIndex: 1,
        nextStopIndex: 2,
        targetStopIndex: 2,
        currentStopName: stops[1]?.name || origin,
        nextStopName: stops[2]?.name || destination,
        locationName: `Ida hacia ${destination}`,
        timestamp: new Date().toISOString()
      });

      // 2. Unidad de VUELTA (circula exclusivamente en inboundGeometry)
      const vtaUnitId = `${cleanCode}-VTA`;
      const inboundCoords = route.inboundGeometry?.coordinates || outboundCoords;
      const returnStops = route.returnStops || [...stops].reverse();
      const inboundIndices = route.inboundStopIndices || [];
      const vFromVta = inboundIndices[1] ?? 0;
      const vToVta = inboundIndices[2] ?? Math.min(inboundCoords.length - 1, 20);
      const startIdxVta = Math.max(0, Math.min(inboundCoords.length - 1, Math.round((vFromVta + vToVta) / 2)));
      const startCoordVta = inboundCoords[startIdxVta] || [returnStops[0].lng, returnStops[0].lat];

      this.telemetryStore.set(vtaUnitId, {
        unitId: vtaUnitId,
        routeId: route.id,
        routeName: route.name,
        routeColor: route.color,
        shortName: shortCode,
        directionType: 'VUELTA',
        directionLabel: 'Vuelta',
        directionArrow: '↩',
        displayLabel: `${shortCode} • Vuelta`,
        destinationTerminal: origin,
        originTerminal: destination,
        lat: startCoordVta[1],
        lng: startCoordVta[0],
        speedKmh: 29,
        status: 'IN_TRANSIT',
        dwellRemainingSec: 0,
        currentVertexIndex: startIdxVta,
        segmentProgress: 0.0,
        currentStopIndex: 1,
        nextStopIndex: 2,
        targetStopIndex: 2,
        currentStopName: returnStops[1]?.name || destination,
        nextStopName: returnStops[2]?.name || origin,
        locationName: `Vuelta hacia ${origin}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Motor cinemático de movimiento vial vértice por vértice (velocidad continua ~30 km/h)
   * - Desplazamiento estricto sobre outboundGeometry para IDA e inboundGeometry para VUELTA
   * - Al alcanzar el vértice de una parada oficial (o <= 20m), se detiene exactamente 15s:
   *   status: 'BOARDING', speedKmh: 0, dwellRemainingSec: 15, "⏸️ Subiendo pasaje"
   * - Al terminar el circuito terminal, reinicia de forma continua en sentido del circuito
   */
  startKinematicSimulation() {
    if (this.simulationInterval) return;

    const TICK_SECONDS = 1.0;

    this.simulationInterval = setInterval(() => {
      const nowIso = new Date().toISOString();

      for (const [unitId, unit] of this.telemetryStore.entries()) {
        const route = this.routesMap.get(unit.routeId);
        if (!route || !route.stops || route.stops.length < 2) continue;

        const isVuelta = unit.directionType === 'VUELTA';
        const coords = isVuelta
          ? (route.inboundGeometry?.coordinates || route.geometry?.coordinates || [])
          : (route.outboundGeometry?.coordinates || route.geometry?.coordinates || []);

        const stops = isVuelta
          ? (route.returnStops || [...route.stops].reverse())
          : route.stops;

        const stopIndices = isVuelta
          ? (route.inboundStopIndices || [])
          : (route.outboundStopIndices || route.stopVertexIndices || []);

        if (!coords || coords.length < 2 || !stops || stops.length < 2) continue;

        // ESTADO 1: La combi está detenida subiendo pasaje (15 segundos)
        if (unit.status === 'BOARDING') {
          unit.dwellRemainingSec = Math.max(0, (unit.dwellRemainingSec || 15) - TICK_SECONDS);
          unit.speedKmh = 0;
          unit.locationName = '⏸️ Subiendo pasaje';
          unit.timestamp = nowIso;

          if (unit.dwellRemainingSec <= 0) {
            // Fin del tiempo de ascenso: Reanuda marcha sobre los vértices viales
            unit.status = 'IN_TRANSIT';
            unit.dwellRemainingSec = 0;
            unit.speedKmh = Math.floor(Math.random() * 5) + 28; // ~30 km/h (28 a 32 km/h)
            unit.currentStopIndex = unit.targetStopIndex;

            let proposedNext = unit.targetStopIndex + 1;
            if (proposedNext >= stops.length) {
              // Terminal alcanzada: reiniciar circuito continuo desde la primera parada
              unit.currentStopIndex = 0;
              unit.targetStopIndex = 1;
              unit.nextStopIndex = 1;
              unit.currentVertexIndex = 0;
              unit.segmentProgress = 0.0;
            } else {
              unit.targetStopIndex = proposedNext;
              unit.nextStopIndex = proposedNext;
              unit.currentVertexIndex = stopIndices[unit.currentStopIndex] ?? unit.currentVertexIndex;
              unit.segmentProgress = 0.0;
            }

            const currentStop = stops[unit.currentStopIndex];
            const nextStop = stops[unit.targetStopIndex];
            unit.currentStopName = currentStop?.name || unit.currentStopName;
            unit.nextStopName = nextStop?.name || 'Siguiente parada';
            unit.locationName = `${unit.directionLabel} hacia ${unit.destinationTerminal}`;
          }
          continue;
        }

        // ESTADO 2: En tránsito siguiendo estrictamente los vértices viales a ~30 km/h
        const speedKmh = unit.speedKmh || (Math.floor(Math.random() * 5) + 28);
        unit.speedKmh = speedKmh;
        const speedMps = (speedKmh * 1000) / 3600; // ~8.33 m/s
        let distRemaining = speedMps * TICK_SECONDS;

        while (distRemaining > 0) {
          let vIdx = Math.max(0, Math.min(coords.length - 1, unit.currentVertexIndex ?? 0));
          let nextIdx = vIdx + 1;

          // Si alcanza el final de su trazado vial, detenerse en terminal y reiniciar
          if (nextIdx >= coords.length) {
            unit.status = 'BOARDING';
            unit.dwellRemainingSec = 15;
            unit.speedKmh = 0;
            unit.currentVertexIndex = 0;
            unit.targetStopIndex = 1;
            unit.currentStopIndex = 0;
            unit.locationName = '⏸️ Subiendo pasaje en terminal';
            break;
          }

          const A = coords[vIdx]; // [lng, lat]
          const B = coords[nextIdx]; // [lng, lat]
          if (!A || !B || !Array.isArray(A) || !Array.isArray(B)) break;
          const segLen = calculateHaversineDistance(A[1], A[0], B[1], B[0]);

          if (segLen < 0.1) {
            unit.currentVertexIndex = nextIdx;
            unit.segmentProgress = 0.0;
            continue;
          }

          const remOnSeg = (1.0 - (unit.segmentProgress || 0.0)) * segLen;

          if (distRemaining < remOnSeg) {
            unit.segmentProgress = (unit.segmentProgress || 0.0) + distRemaining / segLen;
            distRemaining = 0;
            unit.lat = A[1] + (B[1] - A[1]) * unit.segmentProgress;
            unit.lng = A[0] + (B[0] - A[0]) * unit.segmentProgress;

            // Comprobar proximidad a la parada objetivo (a menos de 20 metros)
            const targetStop = stops[unit.targetStopIndex];
            if (targetStop) {
              const dToStop = calculateHaversineDistance(unit.lat, unit.lng, targetStop.lat, targetStop.lng);
              if (dToStop <= 20) {
                unit.status = 'BOARDING';
                unit.dwellRemainingSec = 15;
                unit.speedKmh = 0;
                unit.lat = targetStop.lat;
                unit.lng = targetStop.lng;
                unit.locationName = '⏸️ Subiendo pasaje';
                unit.currentStopName = targetStop.name;

                let nextS = unit.targetStopIndex + 1;
                if (nextS >= stops.length) nextS = 0;
                unit.nextStopName = stops[nextS]?.name || targetStop.name;
              }
            }
          } else {
            distRemaining -= remOnSeg;
            unit.segmentProgress = 0.0;
            unit.currentVertexIndex = nextIdx;
            unit.lat = B[1];
            unit.lng = B[0];

            // Comprobar si alcanzó el vértice de la parada oficial o <= 20 metros
            const targetStopVertex = stopIndices[unit.targetStopIndex] ?? -1;
            const targetStop = stops[unit.targetStopIndex];
            const reachedStopVertex = unit.currentVertexIndex === targetStopVertex;
            const nearStop = targetStop && calculateHaversineDistance(B[1], B[0], targetStop.lat, targetStop.lng) <= 20;

            if (reachedStopVertex || nearStop) {
              unit.status = 'BOARDING';
              unit.dwellRemainingSec = 15;
              unit.speedKmh = 0;
              unit.lat = targetStop ? targetStop.lat : B[1];
              unit.lng = targetStop ? targetStop.lng : B[0];
              unit.locationName = '⏸️ Subiendo pasaje';
              unit.currentStopName = targetStop ? targetStop.name : unit.currentStopName;

              let nextS = unit.targetStopIndex + 1;
              if (nextS >= stops.length) nextS = 0;
              unit.nextStopName = stops[nextS]?.name || unit.currentStopName;
              break;
            }
          }
        }

        if (unit.status !== 'BOARDING') {
          unit.locationName = `${unit.directionLabel} hacia ${unit.destinationTerminal}`;
        }

        unit.timestamp = nowIso;
      }
    }, 1000);

    if (this.simulationInterval.unref) {
      this.simulationInterval.unref();
    }
  }

  /**
   * POST /api/automation/telegram-webhook
   * Manejador de webhook para n8n y Telegram Bot
   */
  handleTelegramWebhook = async (req, res, next) => {
    try {
      const payload = req.body || {};

      const message = payload.message || payload;
      const location = message.location || payload.location || payload;

      const rawLat = location.latitude !== undefined ? location.latitude : payload.lat;
      const rawLng = location.longitude !== undefined ? location.longitude : payload.lng;
      const chatId = message.chat?.id || payload.chatId || 'chat_unknown';
      const userName =
        message.from?.first_name ||
        message.chat?.first_name ||
        payload.userName ||
        'Usuario';

      if (rawLat === undefined || rawLng === undefined || rawLat === null || rawLng === null) {
        const guidanceMessage = [
          `👋 *¡Hola, ${userName}!* Bienvenido al asistente oficial de *Tuxtla-Rutas*.`,
          '',
          '📍 Para indicarte las paradas y colectivos más cercanos, por favor comparte tu ubicación mediante el clip de adjuntos en Telegram (*Ubicación en tiempo real* o *Ubicación actual*).',
          '',
          '💡 También puedes consultar el mapa interactivo con las 8 rutas de Tuxtla Gutiérrez en tiempo real.'
        ].join('\n');

        return res.status(200).json({
          success: false,
          data: {
            chatId,
            userName,
            stops: [],
            telegramMessageMarkdown: guidanceMessage
          }
        });
      }

      const lat = Number(rawLat);
      const lng = Number(rawLng);

      const stops = await this.calculateNearestStopUseCase.execute({
        lat,
        lng,
        radiusMeters: 1500,
        limit: 3
      });

      let markdown = '';
      if (!stops || stops.length === 0) {
        markdown = [
          `🚍 *Tuxtla-Rutas Informa*`,
          '',
          `Hola ${userName}, no encontramos paradas registradas en un radio de 1.5 km de tus coordenadas (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
          '',
          `💡 *Sugerencia:* Las 8 rutas troncales cubren el Blvd. Belisario Domínguez, Av. Central, Libramiento Sur, Libramiento Norte y Calle Central.`
        ].join('\n');
      } else {
        const lines = [
          `🚍 *¡Hola, ${userName}!* Aquí tienes las paradas más cercanas a tu ubicación en Tuxtla Gutiérrez:`,
          ''
        ];

        stops.forEach((stop, idx) => {
          const orderNum = idx + 1;
          const routeName = stop.routeName || 'Transporte Colectivo';
          const dist = stop.distanceMeters ? `${stop.distanceMeters} m` : 'Muy cerca';
          const walk = stop.walkingTimeMinutes ? `~${stop.walkingTimeMinutes} min caminando` : '';
          const nextBus = stop.nextBusMinutes ? `~${stop.nextBusMinutes} min` : '4-8 min';

          lines.push(`📍 *${orderNum}. ${stop.name}*`);
          lines.push(`   🏷️ *Ruta:* ${routeName}`);
          lines.push(`   🚶 *Distancia:* ${dist} (${walk})`);
          lines.push(`   ⏱️ *Próxima combi:* ${nextBus}`);
          lines.push('');
        });

        lines.push(`ℹ️ _Servicio activo: 05:30 a 22:30 hrs. Frecuencia estimada: cada 6 a 10 min._`);
        markdown = lines.join('\n');
      }

      return res.status(200).json({
        success: true,
        data: {
          chatId,
          userName,
          stops,
          telegramMessageMarkdown: markdown
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/automation/telemetry
   * Receptor de telemetría IoT desde Node-RED u otros dispositivos GPS
   */
  recordTelemetry = async (req, res, next) => {
    try {
      const {
        unitId,
        routeId,
        routeName,
        routeColor,
        lat,
        lng,
        latitude,
        longitude,
        speedKmh,
        speed,
        status,
        dwellRemainingSec,
        timestamp
      } = req.body || {};

      const finalUnitId = unitId || 'R-CUSTOM';
      const finalLat = lat !== undefined ? Number(lat) : Number(latitude);
      const finalLng = lng !== undefined ? Number(lng) : Number(longitude);
      const finalSpeed =
        speedKmh !== undefined
          ? Number(speedKmh)
          : speed !== undefined
          ? Number(speed)
          : 30;
      const finalTimestamp = timestamp || new Date().toISOString();

      if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Se requieren coordenadas válidas (lat, lng) para registrar telemetría.',
            status: 400
          }
        });
      }

      const existing = this.telemetryStore.get(finalUnitId) || {};

      const telemetryRecord = {
        unitId: finalUnitId,
        routeId: routeId || existing.routeId || 'a0000001-0000-0000-0000-000000000001',
        routeName: routeName || existing.routeName || 'Ruta 1 - Av. Central / UNACH / Terán',
        routeColor: routeColor || existing.routeColor || '#2563EB',
        lat: finalLat,
        lng: finalLng,
        speedKmh: finalSpeed,
        status: status || existing.status || (finalSpeed === 0 ? 'BOARDING' : 'IN_TRANSIT'),
        dwellRemainingSec: dwellRemainingSec !== undefined ? Number(dwellRemainingSec) : (existing.dwellRemainingSec || 0),
        timestamp: finalTimestamp,
        receivedAt: new Date().toISOString()
      };

      this.telemetryStore.set(finalUnitId, telemetryRecord);

      return res.status(201).json({
        success: true,
        message: 'Telemetría GPS de unidad registrada exitosamente',
        data: telemetryRecord
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/automation/telemetry
   * Consulta el estado de telemetría cinemática en tiempo real de todas las unidades
   */
  getTelemetry = async (req, res, next) => {
    try {
      const { unitId, routeId } = req.query;
      let records = Array.from(this.telemetryStore.values());

      if (unitId) {
        records = records.filter((r) => r.unitId === unitId);
      }
      if (routeId) {
        records = records.filter((r) => r.routeId === routeId);
      }

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/automation/fleet
   * Permite al rol Admin despachar una nueva combi en vivo a cualquier ruta o modificar estado
   */
  dispatchFleet = async (req, res, next) => {
    try {
      const { unitId, routeId, speedKmh = 30, status = 'IN_TRANSIT' } = req.body || {};

      if (!unitId) {
        return res.status(400).json({
          success: false,
          error: { message: 'El identificador de unidad (unitId) es obligatorio.' }
        });
      }

      const route = this.routesMap.get(routeId) || Array.from(this.routesMap.values())[0];
      const fromStop = route.stops[0];
      const toStop = route.stops[1] || route.stops[0];

      const existing = this.telemetryStore.get(unitId);
      const isNew = !existing;

      const updatedUnit = {
        unitId,
        routeId: route.id,
        routeName: route.name,
        routeColor: route.color,
        lat: existing?.lat || fromStop.lat,
        lng: existing?.lng || fromStop.lng,
        speedKmh: status === 'BOARDING' ? 0 : Number(speedKmh) || 30,
        status: status || existing?.status || 'IN_TRANSIT',
        dwellRemainingSec: status === 'BOARDING' ? 15 : 0,
        currentStopIndex: existing?.currentStopIndex || 0,
        nextStopIndex: existing?.nextStopIndex || 1,
        currentStopName: existing?.currentStopName || fromStop.name,
        nextStopName: existing?.nextStopName || toStop.name,
        direction: existing?.direction || 1,
        progress: existing?.progress || 0.1,
        locationName: existing?.locationName || `Hacia ${toStop.name}`,
        timestamp: new Date().toISOString()
      };

      this.telemetryStore.set(unitId, updatedUnit);

      return res.status(isNew ? 201 : 200).json({
        success: true,
        message: isNew
          ? `Nueva unidad ${unitId} despachada exitosamente a la ${route.name}.`
          : `Unidad ${unitId} actualizada en vivo.`,
        data: updatedUnit
      });
    } catch (error) {
      next(error);
    }
  };
}

