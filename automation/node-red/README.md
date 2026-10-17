# Simulador de Telemetría GPS con Node-RED (Tuxtla-Rutas)

Este módulo provee un generador de telemetría IoT periódico en **Node-RED** que simula el movimiento en tiempo real de unidades de transporte público ("combis") sobre los ejes viales principales de Tuxtla Gutiérrez, Chiapas.

---

## 🚌 Unidades y Recorridos Simulados

1. **Unidad TX-101 (Ruta 1 - Eje Poniente / Oriente):**
   - Recorre: Delegación Terán $\rightarrow$ UNACH Campus I $\rightarrow$ Plaza Cristal / Caña Hueca $\rightarrow$ Rectoría UNICACH $\rightarrow$ Parque de la Marimba $\rightarrow$ Parque Central $\rightarrow$ Parque 5 de Mayo $\rightarrow$ Polyforum $\rightarrow$ Fuente de la Diana Cazadora.
   - Emite latitud, longitud, velocidad aleatoria (25-40 km/h) y timestamp ISO.

2. **Unidad TX-204 (Ruta 2 - Eje Sur / Norte):**
   - Recorre: Libramiento Sur Pte $\rightarrow$ Paso a Desnivel San José $\rightarrow$ Mercado de los Ancianos $\rightarrow$ Calle Central Sur $\rightarrow$ Parque Central $\rightarrow$ Teatro de la Ciudad $\rightarrow$ Distribuidor Sumidero $\rightarrow$ Albania Alta / Mirador.
   - Emite latitud, longitud, velocidad aleatoria (20-32 km/h) y timestamp ISO.

---

## 🚀 Guía de Uso e Importación

1. **Acceder a la Consola de Node-RED:**
   Abre tu navegador en [http://localhost:1880](http://localhost:1880) (desplegado vía `docker-compose.yml`).

2. **Importar el Flujo:**
   - Haz clic en el menú hamburguesa (arriba a la derecha) > **Import**.
   - Arrastra o pega el contenido del archivo [`flows-simulator.json`](./flows-simulator.json).
   - Selecciona **Import to current flow** o **new flow**.

3. **Verificar Configuración del Endpoint:**
   - El nodo **HTTP Request** está preconfigurado para enviar:
     ```text
     POST http://host.docker.internal:3000/api/automation/telemetry
     ```
   - Si Node-RED y el backend corren en la misma red de contenedores Docker en producción, puedes utilizar `http://backend:3000/api/automation/telemetry`.

4. **Desplegar (Deploy):**
   - Haz clic en el botón rojo **Deploy** en la esquina superior derecha.
   - El nodo **Inject** comenzará a emitir automáticamente cada 10 segundos las posiciones actualizadas de ambas unidades.

5. **Monitoreo en la Consola:**
   - Abre la pestaña **Debug** de Node-RED para confirmar que las respuestas del backend retornen con `status 201 Created` y los datos de la unidad registrada.
