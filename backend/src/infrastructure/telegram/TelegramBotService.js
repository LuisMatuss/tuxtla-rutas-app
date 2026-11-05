// Adaptador de Infraestructura: Servicio Real de Bot de Telegram con Long Polling Nativo
// Conecta Telegram API (fetch nativo) con las 12 rutas de Tuxtla (Ida y Vuelta),
// buscador espacial GPS, planificador multimodal PlanTrip y alertas viales en vivo.
// Cumple estricta política Zero-Trust: jamás expone ni imprime el token en logs ni respuestas.

import { TUXTLA_ROUTES_SEED, calculateHaversineDistance } from '../db/tuxtlaRoutesSeed.js';
import { getRouteShortCode } from '../web/controllers/AutomationController.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const MAX_MONITOR_LOGS = 30;

const TUXTLA_MAIN_KEYBOARD = {
  keyboard: [
    [{ text: '📍 Enviar mi ubicación GPS', request_location: true }],
    [{ text: '🚌 Ver las 12 Rutas' }, { text: '⚠️ Alertas Viales Activas' }],
    [{ text: '🧭 ¿Cómo llegar? (Ejemplos)' }]
  ],
  resize_keyboard: true
};

// Catálogo enriquecido de alias y lugares emblemáticos de Tuxtla Gutiérrez para resolución instantánea
const TUXTLA_LANDMARK_ALIASES = [
  { keywords: ['teran', 'parque teran', 'terminal teran'], label: 'Terán (Parque Terán)', lat: 16.744768, lng: -93.168485 },
  { keywords: ['crucero teran'], label: 'Crucero Terán', lat: 16.74852, lng: -93.16438 },
  { keywords: ['san jose teran'], label: 'San José Terán', lat: 16.7342, lng: -93.1618 },
  { keywords: ['unach', 'unach campus i', 'campus i', 'universidad autonoma'], label: 'UNACH Campus I (Blvd. Belisario Domínguez)', lat: 16.754727, lng: -93.158257 },
  { keywords: ['ingenieria unach', 'facultad de ingenieria'], label: 'Facultad de Ingeniería UNACH', lat: 16.7568, lng: -93.1621 },
  { keywords: ['cobach', 'cobach 13', 'la mision', 'col la mision', 'colonia la mision'], label: 'COBACH 13 / Col. La Misión', lat: 16.7438, lng: -93.0819 },
  { keywords: ['cana hueca', 'parque cana hueca'], label: 'Parque Caña Hueca', lat: 16.7565, lng: -93.1445 },
  { keywords: ['plaza cristal', 'galerias', 'galerias boulevard'], label: 'Plaza Cristal / Caña Hueca', lat: 16.755624, lng: -93.153471 },
  { keywords: ['plaza sol'], label: 'Plaza Sol / 5a Norte', lat: 16.7598, lng: -93.1482 },
  { keywords: ['plaza ambar', 'diana cazadora'], label: 'Diana Cazadora / Plaza Ámbar', lat: 16.7488, lng: -93.0825 },
  { keywords: ['marimba', 'parque de la marimba', 'parque marimba'], label: 'Parque de la Marimba', lat: 16.7546, lng: -93.1243 },
  { keywords: ['parque central', 'centro', 'catedral', 'zocalo', 'centro de tuxtla'], label: 'Parque Central / Catedral', lat: 16.7536, lng: -93.1155 },
  { keywords: ['parque 5 de mayo', '5 de mayo', 'cinco de mayo'], label: 'Parque 5 de Mayo', lat: 16.7528, lng: -93.1062 },
  { keywords: ['bicentenario', 'parque bicentenario'], label: 'Parque Bicentenario', lat: 16.7541, lng: -93.1205 },
  { keywords: ['central de abastos', 'abastos'], label: 'Central de Abastos', lat: 16.7412, lng: -93.0725 },
  { keywords: ['torre chiapas', 'polyforum', 'poliforum'], label: 'Polyforum / Torre Chiapas', lat: 16.7505, lng: -93.0902 },
  { keywords: ['gomez maza', 'hospital gomez maza'], label: 'Hospital Gómez Maza', lat: 16.7485, lng: -93.0798 },
  { keywords: ['issste', 'hospital issste'], label: 'Hospital ISSSTE Belisario', lat: 16.7552, lng: -93.1512 },
  { keywords: ['ittg', 'tecnologico', 'tec de tuxtla'], label: 'Tecnológico de Tuxtla (ITTG)', lat: 16.7568, lng: -93.1725 },
  { keywords: ['unicach', 'ciudad universitaria unicach', 'rectoria unicach'], label: 'UNICACH', lat: 16.7554, lng: -93.1368 },
  { keywords: ['juan crispin', 'crucero juan crispin'], label: 'Juan Crispín', lat: 16.7595, lng: -93.1815 },
  { keywords: ['patria nueva'], label: 'Terminal Patria Nueva', lat: 16.7662, lng: -93.0785 },
  { keywords: ['real del bosque', 'casas geo'], label: 'Real del Bosque', lat: 16.7215, lng: -93.1825 },
  { keywords: ['las granjas', 'albania', 'albania alta', 'calzada al sumidero'], label: 'Las Granjas / Calzada al Sumidero', lat: 16.7845, lng: -93.1085 },
  { keywords: ['chapultepec', 'col chapultepec'], label: 'Col. Chapultepec', lat: 16.7648, lng: -93.1642 },
  { keywords: ['laguitos', 'reloj floral'], label: 'Reloj Floral / Laguitos', lat: 16.7642, lng: -93.1518 },
  { keywords: ['san roque', 'barrio san roque'], label: 'Barrio San Roque', lat: 16.7495, lng: -93.1118 },
  { keywords: ['mercado de los ancianos', 'los ancianos', 'mercado ancianos'], label: 'Mercado de los Ancianos', lat: 16.7438, lng: -93.1105 },
  { keywords: ['juan sabines', 'mercado juan sabines', 'diaz ordaz', 'mercado diaz ordaz'], label: 'Mercado Centro (Juan Sabines / Díaz Ordaz)', lat: 16.7518, lng: -93.1152 },
  { keywords: ['crucero villaflores', 'villaflores'], label: 'Crucero Villaflores (Libramiento Sur)', lat: 16.7375, lng: -93.118 },
  { keywords: ['chedraui sur', 'mactumatza'], label: 'Chedraui Sur / Mactumatzá', lat: 16.7368, lng: -93.1395 },
  { keywords: ['fidel velazquez', 'parque del oriente', 'parque oriente'], label: 'Parque del Oriente / Fidel Velázquez', lat: 16.7595, lng: -93.0925 }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTokenFromText(text, currentToken = '') {
  let clean = String(text ?? '');
  if (currentToken && clean.includes(currentToken)) {
    clean = clean.split(currentToken).join('[PROTECTED_TOKEN]');
  }
  return clean.replace(/\d{6,14}:[A-Za-z0-9_-]{20,}/g, '[PROTECTED_TOKEN]');
}

function isPlaceholderToken(token) {
  if (!token || typeof token !== 'string') return true;
  const trimmed = token.trim();
  if (!trimmed) return true;
  if (
    trimmed === 'YOUR_TELEGRAM_BOT_TOKEN_HERE' ||
    trimmed === 'CHANGE_ME_CRYPTO_HEX' ||
    trimmed.startsWith('YOUR_')
  ) {
    return true;
  }
  return !/^\d{6,14}:[A-Za-z0-9_-]{20,}$/.test(trimmed);
}

function formatStatusLabel(status) {
  if (status === 'SUSPENDED') return '🔴 Suspendida';
  if (status === 'DELAYED') return '🟡 Con retrasos';
  return '🟢 Operativa';
}

export class TelegramBotService {
  #token = '';
  #offset = 0;
  #pollingGeneration = 0;
  #abortController = null;
  #seq = 0;

  /**
   * @param {Object} params
   * @param {import('../../application/use-cases/CalculateNearestStop.js').CalculateNearestStop} params.calculateNearestStopUseCase
   * @param {import('../../application/use-cases/FindRoutes.js').FindRoutes} params.findRoutesUseCase
   * @param {import('../../application/use-cases/PlanTrip.js').PlanTrip} params.planTripUseCase
   * @param {import('../web/controllers/IncidentController.js').IncidentController} params.incidentController
   */
  constructor({
    calculateNearestStopUseCase,
    findRoutesUseCase,
    planTripUseCase,
    incidentController
  }) {
    this.calculateNearestStopUseCase = calculateNearestStopUseCase;
    this.findRoutesUseCase = findRoutesUseCase;
    this.planTripUseCase = planTripUseCase;
    this.incidentController = incidentController;

    this.connected = false;
    this.polling = false;
    this.botName = null;
    this.botUsername = null;
    this.totalProcessed = 0;
    this.lastError = null;
    this.logs = [];
  }

  /**
   * Estado seguro en tiempo real para AdminPanel y SupportPanel (sin exponer jamás el token)
   */
  getStatus() {
    return {
      connected: this.connected,
      polling: this.polling,
      botName: this.botName,
      botUsername: this.botUsername,
      totalProcessed: this.totalProcessed,
      lastError: this.lastError,
      logs: [...this.logs]
    };
  }

  /**
   * Arranque inicial automático leyendo process.env.TELEGRAM_BOT_TOKEN
   */
  async start() {
    const envToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (isPlaceholderToken(envToken)) {
      this.connected = false;
      this.polling = false;
      this.lastError = 'Token de Telegram no configurado o en modo plantilla.';
      console.log('[TelegramBotService] Sin token activo en entorno; esperando conexión desde consola.');
      return this.getStatus();
    }

    return this.configureToken(envToken);
  }

  /**
   * Configura o reconecta el bot en caliente con validación /getMe y limpieza /deleteWebhook
   * @param {string} [newToken]
   */
  async configureToken(newToken) {
    const candidate =
      typeof newToken === 'string' && newToken.trim().length > 0
        ? newToken.trim()
        : this.#token || (process.env.TELEGRAM_BOT_TOKEN || '').trim();

    if (isPlaceholderToken(candidate)) {
      const err = new Error('El formato del token de Telegram no es válido.');
      err.statusCode = 400;
      throw err;
    }

    // Detener cualquier bucle previo de Long Polling antes de reconectar
    this.#stopLoopInternal();

    try {
      // 1. Validar identidad real del bot con /getMe
      const meResponse = await this.#callTelegramApi(candidate, 'getMe', { method: 'GET' }, 10000);
      if (!meResponse?.ok || !meResponse?.result) {
        const err = new Error('Telegram rechazó la validación del bot (/getMe).');
        err.statusCode = 401;
        throw err;
      }

      const botInfo = meResponse.result;
      this.#token = candidate;
      this.botName = botInfo.first_name || 'Tuxtla-Rutas Bot';
      this.botUsername = botInfo.username ? `@${String(botInfo.username).replace(/^@/, '')}` : null;

      // 2. Limpiar webhook activo para evitar 409 Conflict en getUpdates
      await this.#callTelegramApi(
        this.#token,
        'deleteWebhook?drop_pending_updates=false',
        { method: 'POST' },
        10000
      );

      this.connected = true;
      this.polling = true;
      this.lastError = null;

      const genId = ++this.#pollingGeneration;
      console.log(
        `[TelegramBotService] Bot en vivo conectado: ${this.botName} (${this.botUsername || 'sin @username'})`
      );

      // 3. Iniciar bucle continuo asíncrono de Long Polling
      this.#runPollingLoop(genId);

      return this.getStatus();
    } catch (error) {
      const safeMsg = stripTokenFromText(error?.message || 'Error al conectar con Telegram API', candidate);
      this.connected = false;
      this.polling = false;
      this.lastError = safeMsg;
      const cleanErr = new Error(safeMsg);
      cleanErr.statusCode = error?.statusCode || 502;
      throw cleanErr;
    }
  }

  /**
   * Pausa el bucle de Long Polling de forma limpia
   */
  async disconnect() {
    this.#stopLoopInternal();
    this.connected = false;
    this.polling = false;
    this.lastError = null;
    console.log('[TelegramBotService] Long Polling pausado manualmente.');
    return this.getStatus();
  }

  #stopLoopInternal() {
    this.#pollingGeneration++;
    this.polling = false;
    if (this.#abortController) {
      try {
        this.#abortController.abort();
      } catch {
        // Ignorar errores de abort
      }
      this.#abortController = null;
    }
  }

  async #callTelegramApi(token, endpoint, options = {}, timeoutMs = 28000, externalSignal = null) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timer);
        throw new Error('Polling aborted');
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const url = `${TELEGRAM_API_BASE}/bot${token}/${endpoint}`;
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const desc = stripTokenFromText(data?.description || `HTTP ${res.status}`, token);
        const err = new Error(desc);
        err.httpStatus = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      const sanitized = new Error(stripTokenFromText(err?.message || 'Error de red Telegram', token));
      sanitized.httpStatus = err?.httpStatus;
      sanitized.name = err?.name;
      throw sanitized;
    } finally {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  async #runPollingLoop(genId) {
    let consecutiveErrors = 0;

    while (this.polling && genId === this.#pollingGeneration && this.#token) {
      const loopAbort = new AbortController();
      this.#abortController = loopAbort;

      try {
        const params = new URLSearchParams({
          timeout: '20',
          offset: String(this.#offset),
          allowed_updates: JSON.stringify(['message'])
        });

        const response = await this.#callTelegramApi(
          this.#token,
          `getUpdates?${params.toString()}`,
          { method: 'GET' },
          28000,
          loopAbort.signal
        );

        if (genId !== this.#pollingGeneration || !this.polling) break;

        consecutiveErrors = 0;
        this.connected = true;
        this.lastError = null;

        const updates = Array.isArray(response?.result) ? response.result : [];
        for (const update of updates) {
          if (typeof update.update_id === 'number') {
            this.#offset = Math.max(this.#offset, update.update_id + 1);
          }
          if (update.message) {
            await this.#handleIncomingMessage(update.message);
          }
        }
      } catch (err) {
        if (genId !== this.#pollingGeneration || !this.polling) break;
        if (loopAbort.signal.aborted) continue;

        consecutiveErrors++;
        const safeMessage = stripTokenFromText(err?.message || 'Error en Long Polling', this.#token);
        this.lastError = safeMessage;

        // Si el token fue revocado (401/404), detener bucle para no ciclar credenciales inválidas
        if (err?.httpStatus === 401 || err?.httpStatus === 404) {
          this.connected = false;
          this.polling = false;
          console.warn(`[TelegramBotService] Polling detenido por autenticación: ${safeMessage}`);
          break;
        }

        // Si ocurre 409 Conflict, limpiar webhook y reintentar
        if (err?.httpStatus === 409) {
          try {
            await this.#callTelegramApi(
              this.#token,
              'deleteWebhook?drop_pending_updates=false',
              { method: 'POST' },
              8000
            );
          } catch {
            // Reintentar en siguiente ciclo
          }
        }

        const retryDelayMs = Math.min(10000, 2000 * consecutiveErrors);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  /**
   * Envía mensaje HTML seguro a Telegram con respaldo en texto plano y partición si supera 4000 caracteres
   */
  async #sendTelegramReply(chatId, htmlText, includeKeyboard = true) {
    if (!this.#token || !chatId) return;

    const chunks = this.#splitLongMessage(htmlText, 3950);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const payload = {
        chat_id: chatId,
        text: chunks[i],
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(includeKeyboard && isLast ? { reply_markup: TUXTLA_MAIN_KEYBOARD } : {})
      };

      try {
        await this.#callTelegramApi(
          this.#token,
          'sendMessage',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          },
          12000
        );
      } catch {
        // Fallback sin parse_mode en caso de etiqueta HTML inesperada
        const plainPayload = {
          chat_id: chatId,
          text: chunks[i].replace(/<[^>]+>/g, ''),
          disable_web_page_preview: true,
          ...(includeKeyboard && isLast ? { reply_markup: TUXTLA_MAIN_KEYBOARD } : {})
        };
        await this.#callTelegramApi(
          this.#token,
          'sendMessage',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plainPayload)
          },
          12000
        ).catch(() => {});
      }
    }
  }

  #splitLongMessage(text, maxLen = 3950) {
    if (!text || text.length <= maxLen) return [text];
    const lines = text.split('\n');
    const chunks = [];
    let current = '';

    for (const line of lines) {
      if ((current + '\n' + line).length > maxLen && current.length > 0) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  #recordActivityLog({ userName, queryType, userText, botReplyHtml }) {
    const cleanReplyPlain = stripTokenFromText(
      String(botReplyHtml || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      this.#token
    );

    const isNotFound =
      cleanReplyPlain.includes('Registro No Encontrado') ||
      cleanReplyPlain.includes('No encontré una ruta') ||
      cleanReplyPlain.includes('No logré ubicar') ||
      cleanReplyPlain.includes('no encontramos paradas');

    const validationStatus = isNotFound ? 'NOT_FOUND' : 'VALIDATED';
    const validationLabel = isNotFound
      ? 'Registro No Encontrado'
      : 'Registro Validado en PostgreSQL';

    const entry = {
      id: `tg-${Date.now()}-${++this.#seq}`,
      timestamp: new Date().toISOString(),
      userName: stripTokenFromText(userName || 'Pasajero', this.#token),
      queryType,
      validationStatus,
      validationLabel,
      userText: stripTokenFromText(userText || '', this.#token).slice(0, 140),
      botReplyPreview:
        cleanReplyPlain.length > 160 ? `${cleanReplyPlain.slice(0, 157)}...` : cleanReplyPlain
    };

    this.totalProcessed += 1;
    this.logs.unshift(entry);
    if (this.logs.length > MAX_MONITOR_LOGS) {
      this.logs.length = MAX_MONITOR_LOGS;
    }

    return entry;
  }

  /**
   * Permite simular/ejecutar una consulta directa contra el motor real del Bot y PostgreSQL
   * registrando la validación en los logs en vivo sin requerir envío saliente por chat_id
   */
  async simulateIncomingQuery({ userName = 'Pasajero Telegram', text = '' }) {
    const rawText = String(text || '').trim();
    if (!rawText) {
      const err = new Error('El texto de consulta es obligatorio.');
      err.statusCode = 400;
      throw err;
    }

    await this.#handleIncomingMessage(
      {
        chat: { id: 'sim_local', first_name: userName },
        from: { first_name: userName },
        text: rawText
      },
      { skipTelegramDelivery: true }
    );

    return {
      latestLog: this.logs[0] || null,
      status: this.getStatus()
    };
  }

  /**
   * Enrutador principal de mensajes entrantes desde el celular del pasajero
   */
  async #handleIncomingMessage(message, options = {}) {
    const chatId = message?.chat?.id;
    if (!chatId) return;

    const firstName = message?.from?.first_name || message?.chat?.first_name || 'Pasajero';
    const usernameTag = message?.from?.username ? ` (@${message.from.username})` : '';
    const displayUser = `${firstName}${usernameTag}`;

    let queryType = 'TEXT_QUERY';
    let userTextSummary = '';
    let replyHtml = '';

    try {
      // 1. UBICACIÓN GPS EN VIVO DESDE EL CELULAR
      if (message.location && typeof message.location.latitude === 'number') {
        const { latitude: lat, longitude: lng } = message.location;
        queryType = 'GPS_LOCATION';
        userTextSummary = `📍 GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        replyHtml = await this.#buildNearestStopsReply(firstName, lat, lng);
      } else {
        const rawText = String(message.text || '').trim();
        if (!rawText) return;

        userTextSummary = rawText;
        const norm = normalizeText(rawText);

        // 2. BIENVENIDA / AYUDA / SALUDOS
        if (this.#isGreetingOrHelp(rawText, norm)) {
          queryType = 'START_HELP';
          replyHtml = this.#buildWelcomeReply(firstName);
        }
        // 3. BOTÓN O COMANDO: VER LAS 12 RUTAS
        else if (this.#isListAllRoutesIntent(rawText, norm)) {
          queryType = 'LIST_ROUTES';
          replyHtml = await this.#buildAllRoutesReply();
        }
        // 4. BOTÓN O COMANDO: ALERTAS VIALES ACTIVAS
        else if (this.#isAlertsIntent(rawText, norm)) {
          queryType = 'ROAD_ALERTS';
          replyHtml = this.#buildActiveAlertsReply();
        }
        // 5. BOTÓN DE EJEMPLOS "¿CÓMO LLEGAR?"
        else if (this.#isTripExamplesIntent(rawText, norm)) {
          queryType = 'TRIP_EXAMPLES';
          replyHtml = this.#buildTripExamplesReply();
        }
        // 6. PLANIFICADOR DE VIAJES ("De X a Y", "Ir de La Misión a UNACH", etc.)
        else {
          const tripEndpoints = this.#extractTripOriginDestination(rawText);
          if (tripEndpoints) {
            queryType = 'PLAN_TRIP';
            replyHtml = await this.#buildPlanTripReply(tripEndpoints.origin, tripEndpoints.destination);
          } else {
            // 7. BÚSQUEDA DE RUTA O LUGAR ("43", "Ruta 43", "108", "UNACH", "COBACH", "Marimba", "Terán", "Central de Abastos")
            queryType = 'ROUTE_SEARCH';
            replyHtml = await this.#buildRouteOrPlaceSearchReply(rawText);
          }
        }
      }

      this.#recordActivityLog({
        userName: displayUser,
        queryType,
        userText: userTextSummary,
        botReplyHtml: replyHtml
      });

      if (!options.skipTelegramDelivery) {
        await this.#sendTelegramReply(chatId, replyHtml, true);
      }
    } catch (err) {
      const safeErr = stripTokenFromText(err?.message || 'Error procesando consulta', this.#token);
      console.warn(`[TelegramBotService] Error procesando mensaje: ${safeErr}`);
      const fallbackMsg = [
        '⚠️ <b>Tuxtla-Rutas</b>',
        'Ocurrió un inconveniente temporal al procesar tu consulta. Intenta nuevamente o usa los botones del menú inferior.'
      ].join('\n');
      if (!options.skipTelegramDelivery) {
        await this.#sendTelegramReply(chatId, fallbackMsg, true);
      }
    }
  }

  #isGreetingOrHelp(rawText, norm) {
    const cmd = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
    if (cmd === '/start' || cmd === '/ayuda' || cmd === '/help' || cmd === '/menu') {
      return true;
    }
    const greetings = new Set([
      'hola',
      'hola buenas',
      'buenas',
      'buenos dias',
      'buenas tardes',
      'buenas noches',
      'que tal',
      'hey',
      'ayuda',
      'menu',
      'inicio'
    ]);
    return greetings.has(norm);
  }

  #isListAllRoutesIntent(rawText, norm) {
    const cmd = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
    if (cmd === '/rutas') return true;
    if (rawText.includes('Ver las 12 Rutas')) return true;
    return (
      norm === 'rutas' ||
      norm === 'ver rutas' ||
      norm === 'ver las 12 rutas' ||
      norm === '12 rutas' ||
      norm === 'todas las rutas' ||
      norm === 'lista de rutas'
    );
  }

  #isAlertsIntent(rawText, norm) {
    const cmd = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
    if (cmd === '/alertas' || cmd === '/incidentes') return true;
    if (rawText.includes('Alertas Viales Activas')) return true;
    return (
      norm === 'alertas' ||
      norm === 'alertas viales' ||
      norm === 'alertas viales activas' ||
      norm === 'bloqueos' ||
      norm === 'incidentes' ||
      norm === 'trafico'
    );
  }

  #isTripExamplesIntent(rawText, norm) {
    const cmd = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];
    if (cmd === '/comollegar' || cmd === '/viaje') return true;
    if (rawText.includes('¿Cómo llegar? (Ejemplos)')) return true;
    return (
      norm === 'como llegar' ||
      norm === 'como llegar ejemplos' ||
      norm === 'como llego' ||
      norm === 'que combi tomo' ||
      norm === 'ejemplos'
    );
  }

  /**
   * Detecta expresiones naturales de origen y destino en español
   * Ej: "De Terán a UNACH", "De Caña Hueca a Parque Central", "Ir de La Misión a UNACH"
   */
  #extractTripOriginDestination(rawText) {
    const clean = rawText
      .replace(/^[¿¡\s]+|[?!.\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Evitar confundir nombres de rutas como "Ruta 1 - Av. Central"
    if (/^(?:ruta|r-?)\s*[0-9a-z]+\b/i.test(clean)) {
      return null;
    }

    const patterns = [
      /^(?:quiero\s+ir\s+|como\s+(?:ir|llegar|llego|me\s+voy)\s+|que\s+(?:combi|ruta|colectivo)\s+(?:tomo|me\s+lleva|agarro)\s+|ir\s+|viajar\s+)?(?:desde|de)\s+(.+?)\s+(?:hasta|hacia|para|al|a\s+la|a\s+los|a\s+las|a)\s+(.+)$/i,
      /^(.+?)\s*(?:->|➔|=>|hacia|hasta)\s*(.+)$/i
    ];

    for (const regex of patterns) {
      const match = clean.match(regex);
      if (match) {
        const origin = match[1]?.trim();
        const destination = match[2]?.trim();
        if (origin && destination && origin.length >= 2 && destination.length >= 2) {
          return { origin, destination };
        }
      }
    }

    return null;
  }

  #buildWelcomeReply(firstName) {
    return [
      `👋 <b>¡Hola, ${escapeHtml(firstName)}! Bienvenido a Tuxtla-Rutas</b> 🚍`,
      '',
      'Soy el asistente oficial en tiempo real del transporte colectivo de <b>Tuxtla Gutiérrez, Chiapas</b> (12 rutas troncales con circuitos de Ida y Vuelta).',
      '',
      '👇 <b>¿Qué deseas consultar hoy?</b>',
      '• 📍 <b>Paradas cercanas por GPS:</b> Pulsa <i>"Enviar mi ubicación GPS"</i> para ver las paradas más próximas, qué combis pasan y en cuánto tiempo llegan.',
      '• 🚌 <b>Las 12 Rutas (Ida y Vuelta):</b> Pulsa <i>"Ver las 12 Rutas"</i> o escribe cualquier ruta o destino (ej. <code>Ruta 43</code>, <code>108</code>, <code>UNACH</code>, <code>Marimba</code>).',
      '• 🧭 <b>¿Qué combi tomo?:</b> Escribe tu origen y destino, por ejemplo: <code>De Terán a UNACH</code> o <code>De Caña Hueca a Parque Central</code>.',
      '• ⚠️ <b>Alertas Viales:</b> Consulta bloqueos, obras o tráfico activo en Tuxtla.'
    ].join('\n');
  }

  #buildTripExamplesReply() {
    return [
      '🧭 <b>Planificador Inteligente de Viajes — Tuxtla-Rutas</b>',
      '',
      'Escríbeme de dónde sales y a dónde vas en Tuxtla Gutiérrez y calcularé las mejores combis <b>directas o con trasbordo</b>:',
      '',
      '✍️ <b>Ejemplos que puedes escribir ahora mismo:</b>',
      '• <code>De Terán a UNACH</code>',
      '• <code>De Caña Hueca a Parque Central</code>',
      '• <code>Ir de La Misión a UNACH</code>',
      '• <code>De Las Granjas a Torre Chiapas</code>',
      '• <code>De Real del Bosque a Parque de la Marimba</code>',
      '• <code>De Juan Crispín a Patria Nueva</code>',
      '',
      '💡 <i>También puedes pulsar el botón <b>"📍 Enviar mi ubicación GPS"</b> para ubicar la parada exacta más cercana a ti.</i>'
    ].join('\n');
  }

  /**
   * Ejecuta CalculateNearestStop (radio 1500m, límite 4) y enriquece con rutas co-localizadas y sentido Ida/Vuelta
   */
  async #buildNearestStopsReply(firstName, lat, lng) {
    // 1. Ejecución estricta del caso de uso CalculateNearestStop (radio 1500m, límite 4)
    const primaryStops = await this.calculateNearestStopUseCase.execute({
      lat,
      lng,
      radiusMeters: 1500,
      limit: 4
    });

    if (!primaryStops || primaryStops.length === 0) {
      // Buscar referencia más cercana en toda la ciudad por si el usuario prueba fuera de cobertura
      let closestRef = null;
      let minRefDist = Infinity;
      for (const route of TUXTLA_ROUTES_SEED) {
        for (const stop of route.stops || []) {
          const d = calculateHaversineDistance(lat, lng, stop.lat, stop.lng);
          if (d < minRefDist) {
            minRefDist = d;
            closestRef = { stop, route, distanceKm: (d / 1000).toFixed(1) };
          }
        }
      }

      const lines = [
        `📍 <b>Ubicación recibida (${lat.toFixed(4)}, ${lng.toFixed(4)})</b>`,
        '',
        `Hola ${escapeHtml(firstName)}, no encontramos paradas oficiales en un radio de <b>1,500 metros</b> de tu ubicación actual.`
      ];
      if (closestRef) {
        lines.push(
          '',
          `ℹ️ Parada más próxima registrada en Tuxtla: <b>${escapeHtml(closestRef.stop.name)}</b> (${escapeHtml(getRouteShortCode(closestRef.route))}) a ${closestRef.distanceKm} km.`
        );
      }
      lines.push('', '💡 Escribe <code>/rutas</code> o pregunta <code>De Terán a UNACH</code> para explorar la red.');
      return lines.join('\n');
    }

    // Si varias rutas comparten exactamente la misma parada física, obtenemos candidatos adicionales dentro de 1500m
    // para garantizar hasta 4 puntos físicos distintos manteniendo las paradas principales al frente.
    const extraStops = await this.calculateNearestStopUseCase.execute({
      lat,
      lng,
      radiusMeters: 1500,
      limit: 20
    });

    const mergedCandidates = [...primaryStops, ...(extraStops || [])];
    const distinctClusters = [];

    for (const candidate of mergedCandidates) {
      const existing = distinctClusters.find(
        (c) =>
          normalizeText(c.name) === normalizeText(candidate.name) ||
          calculateHaversineDistance(c.lat, c.lng, candidate.lat, candidate.lng) <= 45
      );
      if (!existing) {
        distinctClusters.push(candidate);
      }
      if (distinctClusters.length >= 4) break;
    }

    const lines = [
      `📍 <b>Paradas más cercanas a tu GPS en Tuxtla</b>`,
      `<i>Coordenadas: ${lat.toFixed(4)}, ${lng.toFixed(4)} • Radio: 1.5 km</i>`,
      ''
    ];

    distinctClusters.forEach((stop, index) => {
      const distMeters = Math.round(Number(stop.distanceMeters) || 0);
      const walkMin = stop.walkingTimeMinutes || Math.max(1, Math.ceil(distMeters / 80));
      const serviceDetails = this.#inspectRoutesAndDirectionsAtStop(stop);
      const minWait = serviceDetails.nextBusMinutes ?? stop.nextBusMinutes ?? Math.max(3, 4 + index * 2);

      lines.push(`<b>${index + 1}. 🚏 ${escapeHtml(stop.name)}</b>`);
      lines.push(`   📏 <b>Distancia:</b> ${distMeters} m (~${walkMin} min caminando)`);
      lines.push(`   🚌 <b>Rutas que pasan:</b> ${escapeHtml(serviceDetails.routesLabel)}`);
      lines.push(`   🧭 <b>Sentido:</b> ${escapeHtml(serviceDetails.directionsLabel)}`);
      lines.push(`   ⏱️ <b>Próximo colectivo:</b> ~${minWait} min`);
      lines.push('');
    });

    lines.push('💡 <i>Escribe el número de una ruta (ej. <code>Ruta 1</code> o <code>Ruta 43</code>) para ver todas sus paradas.</i>');
    return lines.join('\n');
  }

  /**
   * Determina todas las rutas de las 12 troncales que pasan por una parada (<= 75m) y su sentido (Ida / Vuelta)
   */
  #inspectRoutesAndDirectionsAtStop(targetStop) {
    const routeBadges = [];
    const seenRoutes = new Set();
    let hasIda = false;
    let hasVuelta = false;
    let sampleIdaDest = '';
    let sampleVueltaDest = '';
    let bestWait = null;

    for (const route of TUXTLA_ROUTES_SEED) {
      const shortCode = getRouteShortCode(route);
      const idaStops = route.stops || [];
      const vueltaStops = route.returnStops || [...idaStops].reverse();

      const matchesIda = idaStops.some(
        (s) =>
          s.id === targetStop.id ||
          calculateHaversineDistance(targetStop.lat, targetStop.lng, s.lat, s.lng) <= 75
      );

      const matchesVuelta = vueltaStops.some(
        (s) => calculateHaversineDistance(targetStop.lat, targetStop.lng, s.lat, s.lng) <= 75
      );

      if (matchesIda || matchesVuelta) {
        if (!seenRoutes.has(route.id)) {
          seenRoutes.add(route.id);
          routeBadges.push(shortCode);
        }
        const wait = route.scheduleInfo?.estimatedWaitMinutes || 4;
        if (bestWait === null || wait < bestWait) {
          bestWait = wait;
        }
      }

      if (matchesIda) {
        hasIda = true;
        if (!sampleIdaDest && idaStops.length > 0) {
          sampleIdaDest = idaStops[idaStops.length - 1].name;
        }
      }
      if (matchesVuelta) {
        hasVuelta = true;
        if (!sampleVueltaDest && vueltaStops.length > 0) {
          sampleVueltaDest = vueltaStops[vueltaStops.length - 1].name;
        }
      }
    }

    if (routeBadges.length === 0 && targetStop.routeName) {
      routeBadges.push(targetStop.routeName);
    }

    let directionsLabel = 'Ida ➔ y Vuelta ↩';
    if (hasIda && hasVuelta) {
      directionsLabel = `Ambos sentidos (Ida ➔ ${sampleIdaDest} / Vuelta ↩ ${sampleVueltaDest})`;
    } else if (hasIda) {
      directionsLabel = `Ida ➔ hacia ${sampleIdaDest || 'Terminal Destino'}`;
    } else if (hasVuelta) {
      directionsLabel = `Vuelta ↩ hacia ${sampleVueltaDest || 'Terminal Origen'}`;
    }

    return {
      routesLabel: routeBadges.join(', '),
      directionsLabel,
      nextBusMinutes: bestWait
    };
  }

  /**
   * Lista las 12 rutas de Tuxtla Gutiérrez con frecuencia, estado operativo y terminales principales
   */
  async #buildAllRoutesReply() {
    const domainRoutes = await this.findRoutesUseCase.execute();
    const seedById = new Map(TUXTLA_ROUTES_SEED.map((r) => [r.id, r]));

    // Mantener el orden canónico del catálogo maestro de 12 rutas
    const orderedRoutes =
      TUXTLA_ROUTES_SEED.length >= domainRoutes.length
        ? TUXTLA_ROUTES_SEED
        : domainRoutes.map((dr) => seedById.get(dr.id) || dr);

    const lines = [
      `🚌 <b>Red Oficial de Transporte Colectivo — Tuxtla Gutiérrez (${orderedRoutes.length} Rutas)</b>`,
      ''
    ];

    orderedRoutes.forEach((route, idx) => {
      const seed = seedById.get(route.id) || route;
      const schedule = seed.scheduleInfo || route.scheduleInfo || {};
      const freq = schedule.frequencyMinutes || 8;
      const statusText = formatStatusLabel(schedule.status);
      const stops = seed.stops || route.stops || [];
      const originTerminal = stops[0]?.name || 'Inicio';
      const destTerminal = stops[stops.length - 1]?.name || 'Destino';

      lines.push(`<b>${idx + 1}. ${escapeHtml(route.name)}</b>`);
      lines.push(`   ⏱️ Cada ${freq} min • ${statusText}`);
      lines.push(`   🏁 ${escapeHtml(originTerminal)} ⇄ ${escapeHtml(destTerminal)}`);
      lines.push('');
    });

    lines.push(
      '🔎 <b>Ver paradas de Ida y Vuelta:</b> Escribe el número o nombre de cualquier ruta (ej. <code>Ruta 43</code>, <code>Ruta 108</code>, <code>Ruta 1</code>, <code>Ruta A</code>).'
    );
    return lines.join('\n');
  }

  /**
   * Consulta IncidentController para mostrar las alertas viales activas en Tuxtla
   */
  #buildActiveAlertsReply() {
    const activeAlerts = this.incidentController?.listActiveIncidents
      ? this.incidentController.listActiveIncidents()
      : [];

    if (!activeAlerts || activeAlerts.length === 0) {
      return [
        '🟢 <b>Vialidad sin Alertas Activas en Tuxtla Gutiérrez</b>',
        '',
        'En este momento las 12 rutas de transporte colectivo operan con normalidad y sin bloqueos reportados por Soporte Vial.'
      ].join('\n');
    }

    const lines = [
      `⚠️ <b>Alertas Viales Activas en Tuxtla (${activeAlerts.length})</b>`,
      ''
    ];

    activeAlerts.forEach((inc, idx) => {
      const icon = inc.icon || '⚠️';
      const delay = inc.delayMinutes ? `+${inc.delayMinutes} min de retraso` : 'Precaución vial';
      lines.push(`<b>${idx + 1}. ${icon} ${escapeHtml(inc.title)}</b>`);
      if (inc.locationName) {
        lines.push(`   📍 <b>Punto:</b> ${escapeHtml(inc.locationName)}`);
      }
      if (inc.routeName) {
        lines.push(`   🚌 <b>Afectación:</b> ${escapeHtml(inc.routeName)} (${escapeHtml(delay)})`);
      }
      if (inc.description) {
        lines.push(`   📝 ${escapeHtml(inc.description)}`);
      }
      lines.push('');
    });

    lines.push('ℹ️ <i>Información verificada en vivo por el Centro de Soporte Vial Tuxtla-Rutas.</i>');
    return lines.join('\n');
  }

  /**
   * Busca coincidencias por número de ruta o lugar/parada y devuelve el listado completo de Ida (➔) y Vuelta (↩)
   */
  async #buildRouteOrPlaceSearchReply(rawQuery) {
    const norm = normalizeText(rawQuery);

    // 1. Coincidencia exacta por código o número de ruta ("43", "Ruta 43", "108", "Ruta 1", "A", etc.)
    const directRoute = this.#findDirectRouteByCode(norm);
    if (directRoute) {
      return this.#formatSingleRouteDetail(directRoute);
    }

    // 2. Coincidencia por nombre de lugar, parada, universidad, colonia o mercado en las 12 rutas
    const matchingEntries = this.#findRoutesByPlaceKeyword(norm);

    if (matchingEntries.length === 1) {
      const { route, matchedStops } = matchingEntries[0];
      const highlightNote =
        matchedStops.length > 0
          ? `📍 <b>Parada coincidente:</b> ${escapeHtml(matchedStops.join(', '))}\n\n`
          : '';
      return `${highlightNote}${this.#formatSingleRouteDetail(route)}`;
    }

    if (matchingEntries.length > 1) {
      const lines = [
        `🔎 <b>Rutas que pasan por "${escapeHtml(rawQuery.trim())}" (${matchingEntries.length} encontradas):</b>`,
        ''
      ];

      matchingEntries.forEach(({ route, matchedStops }) => {
        const freq = route.scheduleInfo?.frequencyMinutes || 8;
        const stopHint = matchedStops.slice(0, 2).join(', ');
        lines.push(
          `• <b>${escapeHtml(route.name)}</b> (cada ${freq} min)${
            stopHint ? `\n   🚏 Parada: <i>${escapeHtml(stopHint)}</i>` : ''
          }`
        );
      });

      lines.push('');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push(this.#formatSingleRouteDetail(matchingEntries[0].route));

      if (matchingEntries.length > 1) {
        const otherCodes = matchingEntries
          .slice(1, 5)
          .map((m) => `<code>${escapeHtml(getRouteShortCode(m.route).replace('R-', 'Ruta '))}</code>`)
          .join(', ');
        lines.push(
          '',
          `💡 <i>Para ver el desglose completo de otra de las rutas listadas, escribe ${otherCodes}.</i>`
        );
      }

      return lines.join('\n');
    }

    return [
      `⚠️ <b>Registro No Encontrado en PostgreSQL:</b> No existe una ruta o parada registrada con <b>"${escapeHtml(rawQuery.trim())}"</b> en las 12 rutas de Tuxtla Gutiérrez.`,
      '',
      '💡 <b>Prueba con alguna de estas opciones:</b>',
      '• Escribe el número de una ruta: <code>Ruta 1</code>, <code>Ruta 43</code>, <code>Ruta 108</code>, <code>Ruta A</code>',
      '• Escribe un destino de Tuxtla: <code>UNACH</code>, <code>COBACH</code>, <code>Marimba</code>, <code>Terán</code>, <code>Central de Abastos</code>',
      '• Pregunta cómo llegar: <code>De Terán a UNACH</code>',
      '• O pulsa <b>"📍 Enviar mi ubicación GPS"</b>.'
    ].join('\n');
  }

  #findDirectRouteByCode(norm) {
    // Limpiar prefijos comunes: "ruta 43", "r-43", "r 43", "combi 43", "43"
    const match = norm.match(/^(?:la\s+)?(?:ruta|combi|colectivo|r)?[\s-]*([0-9]+|a)$/);
    if (!match) return null;

    let token = match[1].toUpperCase();
    if (token === '01') token = '1';

    for (const route of TUXTLA_ROUTES_SEED) {
      const nameNorm = normalizeText(route.name);
      // Extraer identificador después de "ruta "
      const routeCodeMatch = nameNorm.match(/^ruta\s+([0-9a-z]+)\b/);
      if (routeCodeMatch && routeCodeMatch[1].toUpperCase() === token) {
        return route;
      }
    }
    return null;
  }

  #findRoutesByPlaceKeyword(normQuery) {
    const stopWords = new Set([
      'de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'a', 'al', 'ir', 'por', 'para', 'hacia',
      'col', 'colonia', 'parada', 'ruta', 'rutas', 'combi', 'combis', 'colectivo', 'que', 'cual',
      'pasa', 'pasan', 'lleva', 'me', 'voy', 'como', 'llego', 'llegar'
    ]);
    const cleanPhrase = normQuery
      .split(' ')
      .filter((t) => t.length >= 2 && !stopWords.has(t))
      .join(' ');
    const tokens = cleanPhrase.split(' ').filter(Boolean);
    if (tokens.length === 0) return [];

    const results = [];

    for (const route of TUXTLA_ROUTES_SEED) {
      const routeNorm = `${normalizeText(route.name)} ${normalizeText(route.description)}`;
      const allStops = [...(route.stops || []), ...(route.returnStops || [])];

      const matchedStopNames = [];
      const seenStopName = new Set();

      for (const stop of allStops) {
        const sNorm = normalizeText(stop.name);
        const matchesAllTokens = tokens.every((tk) => sNorm.includes(tk));
        const matchesExactPhrase = sNorm.includes(normQuery);

        if (matchesExactPhrase || matchesAllTokens) {
          if (!seenStopName.has(stop.name)) {
            seenStopName.add(stop.name);
            matchedStopNames.push(stop.name);
          }
        }
      }

      const routeHeaderMatches = tokens.every((tk) => routeNorm.includes(tk));

      if (matchedStopNames.length > 0 || routeHeaderMatches) {
        const score = (matchedStopNames.length > 0 ? 10 : 0) + (routeHeaderMatches ? 5 : 0);
        results.push({
          route,
          matchedStops: matchedStopNames,
          score
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  #formatSingleRouteDetail(route) {
    const schedule = route.scheduleInfo || {};
    const firstRun = schedule.firstRun || '05:30';
    const lastRun = schedule.lastRun || '22:00';
    const freq = schedule.frequencyMinutes || 8;
    const statusLabel = formatStatusLabel(schedule.status);

    const idaStops = route.stops || [];
    const vueltaStops =
      Array.isArray(route.returnStops) && route.returnStops.length > 0
        ? route.returnStops
        : [...idaStops].reverse();

    const lines = [
      `🚌 <b>${escapeHtml(route.name)}</b>`,
      route.description ? `<i>${escapeHtml(route.description)}</i>` : null,
      '',
      `🕒 <b>Horario:</b> ${firstRun} a ${lastRun} hrs`,
      `⏱️ <b>Frecuencia:</b> cada ${freq} min • ${statusLabel}`,
      '',
      `➔ <b>Sentido IDA (${idaStops.length} paradas):</b>`
    ].filter((x) => x !== null);

    idaStops.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${escapeHtml(s.name)}`);
    });

    lines.push('');
    lines.push(`↩ <b>Sentido VUELTA (${vueltaStops.length} paradas):</b>`);

    vueltaStops.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${escapeHtml(s.name)}`);
    });

    return lines.join('\n');
  }

  /**
   * Resuelve nombre de lugar en Tuxtla a coordenadas (Catálogo de paradas/alias + fallback Nominatim acotado a Tuxtla)
   */
  async #resolveTuxtlaPlace(placeQuery) {
    const norm = normalizeText(placeQuery)
      .replace(/^(?:el|la|los|las)\s+/, '')
      .trim();

    if (!norm) return null;

    // 1. Buscar coincidencia exacta o fuerte en catálogo curado de lugares emblemáticos de Tuxtla
    for (const alias of TUXTLA_LANDMARK_ALIASES) {
      if (alias.keywords.some((kw) => kw === norm || norm.includes(kw) || kw.includes(norm))) {
        // Priorizar coincidencia exacta o de mayor longitud
        if (alias.keywords.some((kw) => kw === norm)) {
          return { lat: alias.lat, lng: alias.lng, label: alias.label };
        }
      }
    }

    // 2. Buscar en todas las paradas georreferenciadas de las 12 rutas de Tuxtla
    const stopWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'col', 'colonia', 'parque', 'terminal']);
    const queryTokens = norm.split(' ').filter((t) => t.length >= 2 && !stopWords.has(t));

    let bestStopMatch = null;
    let bestScore = 0;

    for (const route of TUXTLA_ROUTES_SEED) {
      for (const stop of route.stops || []) {
        const sNorm = normalizeText(stop.name);
        let score = 0;
        if (sNorm === norm) score = 100;
        else if (sNorm.includes(norm)) score = 80;
        else if (queryTokens.length > 0 && queryTokens.every((tk) => sNorm.includes(tk))) score = 65;
        else if (queryTokens.length > 0) {
          const hitCount = queryTokens.filter((tk) => sNorm.includes(tk)).length;
          if (hitCount > 0) {
            score = (hitCount / queryTokens.length) * 45;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestStopMatch = { lat: Number(stop.lat), lng: Number(stop.lng), label: stop.name };
        }
      }
    }

    if (bestStopMatch && bestScore >= 40) {
      return bestStopMatch;
    }

    // Revisar coincidencias parciales en alias si aún no hubo match
    for (const alias of TUXTLA_LANDMARK_ALIASES) {
      if (alias.keywords.some((kw) => norm.includes(kw) || kw.includes(norm))) {
        return { lat: alias.lat, lng: alias.lng, label: alias.label };
      }
    }

    // 3. Fallback a Nominatim OpenStreetMap estrictamente acotado al polígono urbano de Tuxtla Gutiérrez
    try {
      const q = `${placeQuery.trim()}, Tuxtla Gutiérrez, Chiapas`;
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=2&viewbox=-93.225,16.835,-93.020,16.685&bounded=1&countrycodes=mx`;

      const res = await fetch(nominatimUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'TuxtlaRutasBot/1.0 (Movilidad Urbana Tuxtla)'
        },
        signal: AbortSignal.timeout(4000)
      });

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0];
          const shortLabel = String(first.display_name || placeQuery).split(',')[0].trim();
          return {
            lat: Number(first.lat),
            lng: Number(first.lon),
            label: shortLabel
          };
        }
      }
    } catch {
      // Continuar silenciosamente si Nominatim no responde
    }

    return null;
  }

  /**
   * Ejecuta PlanTrip entre origen y destino y formatea rutas directas o con trasbordo
   */
  async #buildPlanTripReply(originText, destText) {
    const [originLoc, destLoc] = await Promise.all([
      this.#resolveTuxtlaPlace(originText),
      this.#resolveTuxtlaPlace(destText)
    ]);

    if (!originLoc || !destLoc) {
      const missing = !originLoc && !destLoc
        ? `"${originText}" ni "${destText}"`
        : !originLoc
        ? `"${originText}"`
        : `"${destText}"`;

      return [
        `🧭 <b>Planificador de Viajes</b>`,
        '',
        `No logré ubicar ${escapeHtml(missing)} dentro de la cobertura de Tuxtla Gutiérrez.`,
        '',
        '💡 <b>Intenta con referencias conocidas, por ejemplo:</b>',
        '• <code>De Terán a UNACH</code>',
        '• <code>De Caña Hueca a Parque Central</code>',
        '• <code>Ir de La Misión a UNACH</code>'
      ].join('\n');
    }

    const plan = await this.planTripUseCase.execute({
      originLat: originLoc.lat,
      originLng: originLoc.lng,
      destLat: destLoc.lat,
      destLng: destLoc.lng
    });

    const directOptions = plan?.directOptions || [];
    const transferOptions = plan?.transferOptions || [];

    const lines = [
      `🧭 <b>Ruta sugerida en Tuxtla Gutiérrez</b>`,
      `🟢 <b>Origen:</b> ${escapeHtml(originLoc.label)}`,
      `🏁 <b>Destino:</b> ${escapeHtml(destLoc.label)}`,
      ''
    ];

    if (directOptions.length === 0 && transferOptions.length === 0) {
      lines.push(
        'No se encontraron rutas directas ni con 1 trasbordo a distancia caminable entre ambos puntos.',
        '💡 Prueba pulsar <b>"🚌 Ver las 12 Rutas"</b> para explorar las terminales más cercanas.'
      );
      return lines.join('\n');
    }

    if (directOptions.length > 0) {
      lines.push(`✅ <b>Opciones Directas (${Math.min(3, directOptions.length)} mejores):</b>`);
      lines.push('');

      directOptions.slice(0, 3).forEach((opt, idx) => {
        const sense =
          (opt.destStop?.stopOrder ?? 1) >= (opt.originStop?.stopOrder ?? 0)
            ? 'Sentido Ida ➔'
            : 'Sentido Vuelta ↩';

        lines.push(`<b>${idx + 1}. 🚌 ${escapeHtml(opt.routeName)}</b> <i>(${sense})</i>`);
        lines.push(`   ⏱️ Tiempo estimado: <b>~${opt.estimatedMinutes} min</b> (${opt.stopsCount} paradas)`);
        lines.push(`   🚶 Subir en: <b>${escapeHtml(opt.originStop.name)}</b> (a ${opt.originWalkMeters} m)`);
        lines.push(`   🚏 Bajar en: <b>${escapeHtml(opt.destStop.name)}</b> (a ${opt.destWalkMeters} m del destino)`);
        lines.push('');
      });
    }

    // Mostrar opciones con trasbordo si no hay directas o como alternativa adicional
    const maxTransfersToShow = directOptions.length === 0 ? 3 : 1;
    if (transferOptions.length > 0 && maxTransfersToShow > 0) {
      lines.push(
        directOptions.length === 0
          ? `🔄 <b>Opciones con 1 Trasbordo (${Math.min(maxTransfersToShow, transferOptions.length)} mejores):</b>`
          : '🔄 <b>Alternativa con Trasbordo:</b>'
      );
      lines.push('');

      transferOptions.slice(0, maxTransfersToShow).forEach((tr, idx) => {
        lines.push(`<b>${idx + 1}. 🔄 ~${tr.estimatedMinutes} min en total</b>`);
        lines.push(
          `   1️⃣ Toma <b>${escapeHtml(tr.firstRoute.name)}</b> en <i>${escapeHtml(tr.firstRoute.originStop.name)}</i>`
        );
        lines.push(
          `   🔁 Transborda en <b>${escapeHtml(tr.transferNode.nodeName)}</b> (caminata ${tr.transferNode.walkMeters} m)`
        );
        lines.push(
          `   2️⃣ Toma <b>${escapeHtml(tr.secondRoute.name)}</b> hasta <i>${escapeHtml(tr.secondRoute.destStop.name)}</i>`
        );
        lines.push('');
      });
    }

    return lines.join('\n').trim();
  }
}
