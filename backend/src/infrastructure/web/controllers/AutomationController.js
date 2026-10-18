// Adaptador Primario (HTTP Controller): Integraciones de Automatización, Webhooks y Telemetría IoT
// Conecta casos de uso de la capa de aplicación con n8n, Telegram Bot y Node-RED
// Incluye motor cinemático de movimiento continuo realista (LERP + 15s parada subiendo pasaje)

import { TUXTLA_ROUTES_SEED, calculateHaversineDistance } from '../../db/tuxtlaRoutesSeed.js';

// Semilla de las 12 Unidades Colectivas Activas distribuidas en las 8 rutas
const SEED_ACTIVE_UNITS = [
  { unitId: 'TX-01A', routeId: 'a0000001-0000-0000-0000-000000000001', currentStopIndex: 2, nextStopIndex: 3, direction: 1, progress: 0.35, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 31 },
  { unitId: 'TX-01B', routeId: 'a0000001-0000-0000-0000-000000000001', currentStopIndex: 9, nextStopIndex: 8, direction: -1, progress: 0.60, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 29 },
  { unitId: 'TX-A01', routeId: 'a0000002-0000-0000-0000-000000000002', currentStopIndex: 1, nextStopIndex: 2, direction: 1, progress: 0.20, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 32 },
  { unitId: 'TX-A02', routeId: 'a0000002-0000-0000-0000-000000000002', currentStopIndex: 7, nextStopIndex: 6, direction: -1, progress: 0.45, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 30 },
  { unitId: 'TX-43A', routeId: 'a0000003-0000-0000-0000-000000000003', currentStopIndex: 2, nextStopIndex: 3, direction: 1, progress: 0.50, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 34 },
  { unitId: 'TX-43B', routeId: 'a0000003-0000-0000-0000-000000000003', currentStopIndex: 6, nextStopIndex: 5, direction: -1, progress: 0.25, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 28 },
  { unitId: 'TX-90A', routeId: 'a0000004-0000-0000-0000-000000000004', currentStopIndex: 1, nextStopIndex: 2, direction: 1, progress: 0.40, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 33 },
  { unitId: 'TX-58A', routeId: 'a0000005-0000-0000-0000-000000000005', currentStopIndex: 3, nextStopIndex: 4, direction: 1, progress: 0.15, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 30 },
  { unitId: 'TX-58B', routeId: 'a0000005-0000-0000-0000-000000000005', currentStopIndex: 6, nextStopIndex: 5, direction: -1, progress: 0.70, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 31 },
  { unitId: 'TX-52A', routeId: 'a0000006-0000-0000-0000-000000000006', currentStopIndex: 2, nextStopIndex: 3, direction: 1, progress: 0.30, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 29 },
  { unitId: 'TX-30A', routeId: 'a0000007-0000-0000-0000-000000000007', currentStopIndex: 3, nextStopIndex: 4, direction: 1, progress: 0.55, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 32 },
  { unitId: 'TX-73A', routeId: 'a0000008-0000-0000-0000-000000000008', currentStopIndex: 2, nextStopIndex: 3, direction: 1, progress: 0.40, status: 'IN_TRANSIT', dwellRemainingSec: 0, speedKmh: 30 }
];

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

    // Inicializar estado cinemático de las 12 unidades activas
    this.initKinematicUnits();

    // Iniciar bucle de simulación cinemática (actualización cada 1 segundo)
    if (process.env.NODE_ENV !== 'test') {
      this.startKinematicSimulation();
    }
  }

  /**
   * Inicializa las 12 unidades colectivas sobre los vértices reales de las calles de Tuxtla
   */
  initKinematicUnits() {
    for (const seed of SEED_ACTIVE_UNITS) {
      const route = this.routesMap.get(seed.routeId);
      if (!route || !route.stops || route.stops.length === 0) continue;

      const coords = route.geometry?.coordinates || [];
      const stopIndices = route.stopVertexIndices || [];

      const vFrom = stopIndices[seed.currentStopIndex] ?? 0;
      const vTo = stopIndices[seed.nextStopIndex] ?? (coords.length > 0 ? coords.length - 1 : 0);

      // Calcular vértice inicial a lo largo del trazado vial
      const vIdx = Math.max(0, Math.min(coords.length - 1, Math.round(vFrom + (vTo - vFrom) * (seed.progress || 0))));
      const currentCoord = coords[vIdx] || [route.stops[0].lng, route.stops[0].lat];
      const lat = currentCoord[1];
      const lng = currentCoord[0];

      const fromStop = route.stops[seed.currentStopIndex] || route.stops[0];
      const toStop = route.stops[seed.nextStopIndex] || route.stops[1] || route.stops[0];

      this.telemetryStore.set(seed.unitId, {
        unitId: seed.unitId,
        routeId: route.id,
        routeName: route.name,
        routeColor: route.color,
        lat,
        lng,
        speedKmh: seed.status === 'BOARDING' ? 0 : (seed.speedKmh || 30),
        status: seed.status || 'IN_TRANSIT',
        dwellRemainingSec: seed.dwellRemainingSec || 0,
        currentVertexIndex: vIdx,
        segmentProgress: 0.0,
        currentStopIndex: seed.currentStopIndex,
        nextStopIndex: seed.nextStopIndex,
        targetStopIndex: seed.nextStopIndex,
        currentStopName: fromStop.name,
        nextStopName: toStop.name,
        direction: seed.direction || 1,
        progress: seed.progress,
        locationName: seed.status === 'BOARDING' ? '⏸️ Subiendo pasaje' : `Hacia ${toStop.name}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Motor cinemático de movimiento vial vértice por vértice (velocidad continua ~30 km/h)
   * - Desplazamiento estricto sobre la polilínea vial route.geometry.coordinates
   * - Al alcanzar el vértice de una parada oficial (o <= 20m), se detiene exactamente 15s:
   *   status: 'BOARDING', speedKmh: 0, dwellRemainingSec: 15, "⏸️ Subiendo pasaje"
   * - Al terminar los 15s reanuda sobre los vértices de la calle hacia la siguiente parada
   */
  startKinematicSimulation() {
    if (this.simulationInterval) return;

    const TICK_SECONDS = 1.0;

    this.simulationInterval = setInterval(() => {
      const nowIso = new Date().toISOString();

      for (const [unitId, unit] of this.telemetryStore.entries()) {
        const route = this.routesMap.get(unit.routeId);
        if (!route || !route.stops || route.stops.length < 2) continue;

        const coords = route.geometry?.coordinates || [];
        if (coords.length < 2) continue;

        const stopIndices = route.stopVertexIndices || [];

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

            let proposedNext = unit.targetStopIndex + unit.direction;
            if (proposedNext >= route.stops.length) {
              unit.direction = -1;
              proposedNext = unit.targetStopIndex - 1;
            } else if (proposedNext < 0) {
              unit.direction = 1;
              proposedNext = unit.targetStopIndex + 1;
            }

            unit.targetStopIndex = proposedNext;
            unit.nextStopIndex = proposedNext;
            unit.currentVertexIndex = stopIndices[unit.currentStopIndex] ?? unit.currentVertexIndex;
            unit.segmentProgress = 0.0;

            const currentStop = route.stops[unit.currentStopIndex];
            const nextStop = route.stops[unit.targetStopIndex];
            unit.currentStopName = currentStop?.name || unit.currentStopName;
            unit.nextStopName = nextStop?.name || 'Siguiente parada';
            unit.locationName = `En ruta hacia ${unit.nextStopName}`;
          }
          continue;
        }

        // ESTADO 2: En tránsito siguiendo estrictamente los vértices viales a ~30 km/h
        const speedKmh = unit.speedKmh || (Math.floor(Math.random() * 5) + 28);
        unit.speedKmh = speedKmh;
        const speedMps = (speedKmh * 1000) / 3600; // ~8.33 m/s
        let distRemaining = speedMps * TICK_SECONDS;

        while (distRemaining > 0) {
          let vIdx = unit.currentVertexIndex ?? 0;
          let nextIdx = vIdx + unit.direction;

          // Si alcanza el final o inicio de la ruta, invertir sentido y entrar en parada terminal
          if (nextIdx < 0 || nextIdx >= coords.length) {
            unit.status = 'BOARDING';
            unit.dwellRemainingSec = 15;
            unit.speedKmh = 0;
            unit.direction = -unit.direction;
            unit.locationName = '⏸️ Subiendo pasaje';
            break;
          }

          const A = coords[vIdx]; // [lng, lat]
          const B = coords[nextIdx]; // [lng, lat]
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
            const targetStop = route.stops[unit.targetStopIndex];
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

                let nextS = unit.targetStopIndex + unit.direction;
                if (nextS >= route.stops.length) nextS = unit.targetStopIndex - 1;
                else if (nextS < 0) nextS = unit.targetStopIndex + 1;
                unit.nextStopName = route.stops[nextS]?.name || targetStop.name;
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
            const targetStop = route.stops[unit.targetStopIndex];
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

              let nextS = unit.targetStopIndex + unit.direction;
              if (nextS >= route.stops.length) nextS = unit.targetStopIndex - 1;
              else if (nextS < 0) nextS = unit.targetStopIndex + 1;
              unit.nextStopName = route.stops[nextS]?.name || unit.currentStopName;
              break;
            }
          }
        }

        if (unit.status !== 'BOARDING') {
          const nextStop = route.stops[unit.targetStopIndex];
          unit.locationName = `En ruta hacia ${nextStop?.name || 'siguiente parada'}`;
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

      const finalUnitId = unitId || 'TX-CUSTOM';
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

