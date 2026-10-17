# Automatización con n8n y Bot de Telegram (Tuxtla-Rutas)

Este módulo implementa el flujo de integración entre **Telegram** y la API Hexagonal de **Tuxtla-Rutas** a través de **n8n**. Permite a los usuarios enviar su ubicación GPS en tiempo real o un comando, y recibir de inmediato las paradas más cercanas, distancia en metros, minutos a pie y horarios de las próximas combis en Tuxtla Gutiérrez.

---

## 🔒 Política Zero-Trust de Credenciales

En cumplimiento con las directivas de seguridad DevSecOps:
- **PROHIBIDO** ingresar el token de Telegram directamente en el código o en el archivo JSON del flujo.
- El token debe configurarse exclusivamente mediante variables de entorno protegidas en `.env` (el cual está estrictamente ignorado por Git).

```env
# En tu archivo .env local
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
```

---

## 🚀 Guía de Importación en n8n

1. **Acceder a la Consola de n8n:**
   Abre tu navegador en [http://localhost:5678](http://localhost:5678) (desplegado vía `docker-compose.yml`).

2. **Configurar Credencial de Telegram:**
   - Ve a **Credentials** > **New Credential** > Selecciona **Telegram API**.
   - Asigna el nombre: `Telegram Bot Token (Env Var)`.
   - En el campo **Access Token**, utiliza la variable de entorno:
     ```text
     ={{$env.TELEGRAM_BOT_TOKEN}}
     ```
   - Guarda la credencial.

3. **Importar el Flujo de Trabajo:**
   - Ve a **Workflows** > Menú de tres puntos (arriba a la derecha) > **Import from File...**
   - Selecciona el archivo [`workflows-example.json`](./workflows-example.json).

4. **Verificación de Conectividad con el Backend:**
   - El nodo **HTTP Request** está preconfigurado para apuntar a:
     ```text
     POST http://host.docker.internal:3000/api/automation/telegram-webhook
     ```
   - Si n8n y el backend corren en la misma red Docker de producción, puedes sustituir `host.docker.internal` por `http://backend:3000`.

5. **Activar el Workflow:**
   - Haz clic en **Save** y cambia el interruptor superior a **Active**.
   - Envía tu ubicación actual desde la aplicación de Telegram a tu bot para recibir las paradas y combis más cercanas en Tuxtla Gutiérrez.
