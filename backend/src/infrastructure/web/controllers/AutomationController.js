// Adaptador Primario (HTTP Controller): Integraciones de Automatización, Webhooks y Telemetría IoT
// Conecta casos de uso de la capa de aplicación con n8n, Telegram Bot y Node-RED

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
  }

  /**
   * POST /api/automation/telegram-webhook
   * Manejador de webhook para n8n y Telegram Bot
   */
  handleTelegramWebhook = async (req, res, next) => {
    try {
      const payload = req.body || {};

      // Normalizar payload plano o anidado de Telegram / n8n
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

      // Si no hay coordenadas, devolver mensaje instructivo para Telegram
      if (rawLat === undefined || rawLng === undefined || rawLat === null || rawLng === null) {
        const guidanceMessage = [
          `👋 *¡Hola, ${userName}!* Bienvenido al asistente oficial de *Tuxtla-Rutas*.`,
          '',
          '📍 Para indicarte las paradas y colectivos más cercanos, por favor comparte tu ubicación mediante el clip de adjuntos en Telegram (*Ubicación en tiempo real* o *Ubicación actual*).',
          '',
          '💡 También puedes usar nuestra plataforma web interactiva en Tuxtla Gutiérrez.'
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

      // Invocar caso de uso de aplicación
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
   * Receptor de telemetría IoT desde Node-RED
   */
  recordTelemetry = async (req, res, next) => {
    try {
      const { unitId, routeId, lat, lng, latitude, longitude, speedKmh, speed, timestamp } = req.body || {};

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
        lat: finalLat,
        lng: finalLng,
        speedKmh: finalSpeed,
        timestamp: finalTimestamp,
        receivedAt: new Date().toISOString()
      };

      // Guardar / actualizar en el almacén en memoria
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
   * Consulta el estado de telemetría en tiempo real
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
