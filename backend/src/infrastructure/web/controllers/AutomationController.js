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
   * Inicializa las 12 unidades colectivas en sus posiciones geodésicas iniciales
   */
  initKinematicUnits() {
    for (const seed of SEED_ACTIVE_UNITS) {
      const route = this.routesMap.get(seed.routeId);
      if (!route || !route.stops || route.stops.length === 0) continue;

      const fromStop = route.stops[seed.currentStopIndex] || route.stops[0];
      const toStop = route.stops[seed.nextStopIndex] || route.stops[1] || route.stops[0];

      // Interpolación lineal LERP inicial
      const lat = fromStop.lat + (toStop.lat - fromStop.lat) * seed.progress;
      const lng = fromStop.lng + (toStop.lng - fromStop.lng) * seed.progress;

      this.telemetryStore.set(seed.unitId, {
        unitId: seed.unitId,
        routeId: route.id,
        routeName: route.name,
        routeColor: route.color,
        lat,
        lng,
        speedKmh: seed.speedKmh,
        status: seed.status,
        dwellRemainingSec: seed.dwellRemainingSec,
        currentStopIndex: seed.currentStopIndex,
        nextStopIndex: seed.nextStopIndex,
        currentStopName: fromStop.name,
        nextStopName: toStop.name,
        direction: seed.direction,
        progress: seed.progress,
        locationName: `Hacia ${toStop.name}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Motor cinemático de movimiento continuo realista
   * - Cada unidad avanza a una velocidad de 28 a 34 km/h (~8.5 m/s)
   * - Al llegar a una parada (progress >= 1.0), se detiene exactamente 15 segundos subiendo pasaje
   * - Al completar los 15s, reanuda el viaje hacia la siguiente parada invirtiendo sentido en los extremos
   */
  startKinematicSimulation() {
    if (this.simulationInterval) return;

    const TICK_SECONDS = 1.0;

    this.simulationInterval = setInterval(() => {
      const nowIso = new Date().toISOString();

      for (const [unitId, unit] of this.telemetryStore.entries()) {
        const route = this.routesMap.get(unit.routeId);
        if (!route || !route.stops || route.stops.length < 2) continue;

        const stops = route.stops;

        // ESTADO 1: La combi está detenida subiendo pasaje (15 segundos)
        if (unit.status === 'BOARDING') {
          unit.dwellRemainingSec = Math.max(0, (unit.dwellRemainingSec || 15) - TICK_SECONDS);
          unit.speedKmh = 0;
          unit.timestamp = nowIso;

          if (unit.dwellRemainingSec <= 0) {
            // Fin del tiempo de ascenso de pasaje: Reanuda marcha hacia siguiente parada
            unit.status = 'IN_TRANSIT';
            unit.dwellRemainingSec = 0;
            unit.speedKmh = Math.floor(Math.random() * 7) + 28; // 28 - 34 km/h
            unit.progress = 0;

            // Avanzar índices
            unit.currentStopIndex = unit.nextStopIndex;
            let proposedNext = unit.currentStopIndex + unit.direction;

            if (proposedNext >= stops.length) {
              unit.direction = -1;
              proposedNext = unit.currentStopIndex - 1;
            } else if (proposedNext < 0) {
              unit.direction = 1;
              proposedNext = unit.currentStopIndex + 1;
            }

            unit.nextStopIndex = proposedNext;
            const fromStop = stops[unit.currentStopIndex];
            const toStop = stops[unit.nextStopIndex];
            unit.currentStopName = fromStop.name;
            unit.nextStopName = toStop.name;
            unit.locationName = `Hacia ${toStop.name}`;
          }
          continue;
        }

        // ESTADO 2: La combi está en tránsito entre paradas con LERP continuo
        const fromStop = stops[unit.currentStopIndex] || stops[0];
        const toStop = stops[unit.nextStopIndex] || stops[stops.length - 1];

        const segmentDistanceMeters = Math.max(
          100,
          calculateHaversineDistance(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng)
        );

        // Velocidad realista entre 28 y 34 km/h (~7.8 a 9.4 m/s)
        const speedKmh = Math.floor(Math.random() * 7) + 28;
        unit.speedKmh = speedKmh;
        const speedMps = (speedKmh * 1000) / 3600;

        // Avance de progreso en este tick
        const progressIncrement = (speedMps * TICK_SECONDS) / segmentDistanceMeters;
        unit.progress = (unit.progress || 0) + progressIncrement;

        if (unit.progress >= 1.0) {
          // Ha arribado a la parada: Entra en parada de 15 segundos subiendo pasaje
          unit.progress = 1.0;
          unit.status = 'BOARDING';
          unit.dwellRemainingSec = 15;
          unit.speedKmh = 0;
          unit.lat = toStop.lat;
          unit.lng = toStop.lng;
          unit.currentStopName = toStop.name;
          unit.locationName = `Parada: ${toStop.name} (Subiendo pasaje)`;

          // Calcular la siguiente parada para cuando reanude marcha
          let nextAfter = unit.nextStopIndex + unit.direction;
          if (nextAfter >= stops.length) {
            unit.direction = -1;
            nextAfter = unit.nextStopIndex - 1;
          } else if (nextAfter < 0) {
            unit.direction = 1;
            nextAfter = unit.nextStopIndex + 1;
          }
          unit.nextStopName = stops[nextAfter]?.name || toStop.name;
        } else {
          // Interpolación lineal LERP suave entre fromStop y toStop
          unit.lat = fromStop.lat + (toStop.lat - fromStop.lat) * unit.progress;
          unit.lng = fromStop.lng + (toStop.lng - fromStop.lng) * unit.progress;
          unit.locationName = `En ruta hacia ${toStop.name}`;
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

