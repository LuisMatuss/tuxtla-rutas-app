// Adaptador Primario (HTTP Controller): Integraciones de Automatización, Webhooks y Telemetría IoT
// Conecta casos de uso de la capa de aplicación con n8n, Telegram Bot y Node-RED

const RUTA_1_WAYPOINTS = [
  { lat: 16.7450, lng: -93.1685, name: 'Terán (Terminal Poniente)' },
  { lat: 16.7535, lng: -93.1602, name: 'UNACH Campus I' },
  { lat: 16.7589, lng: -93.1534, name: 'Plaza Cristal / Caña Hueca' },
  { lat: 16.7565, lng: -93.1410, name: 'Rectoría UNICACH' },
  { lat: 16.7547, lng: -93.1235, name: 'Parque de la Marimba' },
  { lat: 16.7538, lng: -93.1215, name: 'Parque Bicentenario' },
  { lat: 16.7516, lng: -93.1161, name: 'Parque Central Tuxtla' },
  { lat: 16.7495, lng: -93.1065, name: 'Parque 5 de Mayo' },
  { lat: 16.7470, lng: -93.0880, name: 'Polyforum Chiapas' },
  { lat: 16.7455, lng: -93.0833, name: 'Fuente Diana Cazadora' }
];

const RUTA_2_WAYPOINTS = [
  { lat: 16.7320, lng: -93.1450, name: 'Terminal Libramiento Sur Pte' },
  { lat: 16.7350, lng: -93.1280, name: 'Paso a Desnivel San José' },
  { lat: 16.7410, lng: -93.1125, name: 'Mercado de los Ancianos' },
  { lat: 16.7475, lng: -93.1145, name: 'Calle Central Sur y 4a Sur' },
  { lat: 16.7516, lng: -93.1161, name: 'Parque Central' },
  { lat: 16.7600, lng: -93.1120, name: 'Teatro de la Ciudad' },
  { lat: 16.7720, lng: -93.1050, name: 'Distribuidor Vial Sumidero' },
  { lat: 16.7840, lng: -93.0980, name: 'Albania Alta / Cañón del Sumidero' }
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

    // Semilla inicial de telemetría: 2 unidades activas por defecto
    this.initDefaultTelemetry();

    // Iniciar ciclo de simulación interna para actualizar coordenadas en tiempo real
    if (process.env.NODE_ENV !== 'test') {
      this.startInternalSimulation();
    }
  }

  /**
   * Inicializa la semilla con dos unidades activas en Tuxtla Gutiérrez
   */
  initDefaultTelemetry() {
    this.telemetryStore.set('TX-101', {
      unitId: 'TX-101',
      routeId: 'a0000001-0000-0000-0000-000000000001',
      routeName: 'Ruta 1 - Centro / Terán',
      routeColor: '#2563EB',
      lat: 16.7547,
      lng: -93.1235,
      locationName: 'Parque de la Marimba',
      speedKmh: 32,
      timestamp: new Date().toISOString()
    });

    this.telemetryStore.set('TX-204', {
      unitId: 'TX-204',
      routeId: 'a0000002-0000-0000-0000-000000000002',
      routeName: 'Ruta 2 - Sur / Poniente',
      routeColor: '#10B981',
      lat: 16.7516,
      lng: -93.1161,
      locationName: 'Parque Central Tuxtla',
      speedKmh: 28,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Simulador interno que itera sobre los waypoints de Tuxtla cada 5 segundos
   */
  startInternalSimulation() {
    if (this.simulationInterval) return;
    let idx1 = 4; // Parque de la Marimba
    let idx2 = 4; // Parque Central

    this.simulationInterval = setInterval(() => {
      idx1 = (idx1 + 1) % RUTA_1_WAYPOINTS.length;
      idx2 = (idx2 + 1) % RUTA_2_WAYPOINTS.length;

      const p1 = RUTA_1_WAYPOINTS[idx1];
      const p2 = RUTA_2_WAYPOINTS[idx2];

      this.telemetryStore.set('TX-101', {
        unitId: 'TX-101',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        routeName: 'Ruta 1 - Centro / Terán',
        routeColor: '#2563EB',
        lat: p1.lat,
        lng: p1.lng,
        locationName: p1.name,
        speedKmh: Math.floor(Math.random() * 12) + 26,
        timestamp: new Date().toISOString()
      });

      this.telemetryStore.set('TX-204', {
        unitId: 'TX-204',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        routeName: 'Ruta 2 - Sur / Poniente',
        routeColor: '#10B981',
        lat: p2.lat,
        lng: p2.lng,
        locationName: p2.name,
        speedKmh: Math.floor(Math.random() * 10) + 22,
        timestamp: new Date().toISOString()
      });
    }, 5000);

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
          '💡 También puedes consultar el mapa interactivo de Tuxtla Gutiérrez en tiempo real.'
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
          `💡 *Sugerencia:* Las rutas troncales circulan sobre el Blvd. Belisario Domínguez, Av. Central, Libramiento Sur y Calzada al Sumidero.`
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

        lines.push(`ℹ️ _Horario de servicio: 05:30 a 22:00 hrs. Frecuencia habitual: cada 8 a 10 min._`);
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
   * Receptor de telemetría IoT desde Node-RED u otros dispositivos
   */
  recordTelemetry = async (req, res, next) => {
    try {
      const { unitId, routeId, routeName, routeColor, lat, lng, latitude, longitude, speedKmh, speed, timestamp } = req.body || {};

      const finalUnitId = unitId || 'COLECTIVO-042';
      const finalLat = lat !== undefined ? Number(lat) : Number(latitude);
      const finalLng = lng !== undefined ? Number(lng) : Number(longitude);
      const finalSpeed =
        speedKmh !== undefined
          ? Number(speedKmh)
          : speed !== undefined
          ? Number(speed)
          : 25;
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

      const telemetryRecord = {
        unitId: finalUnitId,
        routeId: routeId || 'a0000001-0000-0000-0000-000000000001',
        routeName: routeName || (finalUnitId.includes('101') ? 'Ruta 1 - Centro / Terán' : 'Ruta 2 - Sur / Poniente'),
        routeColor: routeColor || (finalUnitId.includes('101') ? '#2563EB' : '#10B981'),
        lat: finalLat,
        lng: finalLng,
        speedKmh: finalSpeed,
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
   * Consulta el estado de telemetría en tiempo real de todas las unidades
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
}
