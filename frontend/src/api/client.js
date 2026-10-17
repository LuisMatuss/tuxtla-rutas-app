// Cliente API HTTP con Resiliencia Offline / Demo para Tuxtla-Rutas
// Si el backend o contenedor de base de datos no está disponible, activa automáticamente
// el dataset de respaldo con las 8 rutas reales de Tuxtla Gutiérrez, cálculo Haversine y telemetría simulada LERP.

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Cálculo de distancia geodésica mediante la fórmula de Haversine (en metros)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio medio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

/**
 * Catálogo Maestro de Respaldo Georreferenciado Sincronizado con las 8 Rutas de Tuxtla Gutiérrez
 */
export const BACKUP_ROUTES = [
  // 1. Ruta 1 - Av. Central / UNACH / Terán
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    name: 'Ruta 1 - Av. Central / UNACH / Terán',
    description: 'Troncal Poniente-Oriente por Blvd. Belisario Domínguez, Parque de la Marimba, Parque Central y Hospital Gómez Maza.',
    color: '#2563EB',
    scheduleInfo: {
      firstRun: '05:30',
      lastRun: '22:30',
      frequencyMinutes: 6,
      estimatedWaitMinutes: 3,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1685, 16.7450],
        [-93.1640, 16.7505],
        [-93.1602, 16.7535],
        [-93.1568, 16.7565],
        [-93.1534, 16.7589],
        [-93.1410, 16.7565],
        [-93.1235, 16.7547],
        [-93.1215, 16.7538],
        [-93.1161, 16.7516],
        [-93.1065, 16.7495],
        [-93.0880, 16.7470],
        [-93.0815, 16.7450]
      ]
    },
    stops: [
      { id: 'b0000001-0000-0000-0000-000000000001', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Terminal Parque Terán', lat: 16.7450, lng: -93.1685, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1685, 16.7450] } },
      { id: 'b0000001-0000-0000-0000-000000000002', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Crucero Terán', lat: 16.7505, lng: -93.1640, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1640, 16.7505] } },
      { id: 'b0000001-0000-0000-0000-000000000003', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'UNACH Campus I', lat: 16.7535, lng: -93.1602, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1602, 16.7535] } },
      { id: 'b0000001-0000-0000-0000-000000000004', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Jardines de Tuxtla', lat: 16.7565, lng: -93.1568, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1568, 16.7565] } },
      { id: 'b0000001-0000-0000-0000-000000000005', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Plaza Cristal / Caña Hueca', lat: 16.7589, lng: -93.1534, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1534, 16.7589] } },
      { id: 'b0000001-0000-0000-0000-000000000006', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Rectoría UNICACH / 15a Pte', lat: 16.7565, lng: -93.1410, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1410, 16.7565] } },
      { id: 'b0000001-0000-0000-0000-000000000007', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1235, 16.7547] } },
      { id: 'b0000001-0000-0000-0000-000000000008', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque Bicentenario', lat: 16.7538, lng: -93.1215, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1215, 16.7538] } },
      { id: 'b0000001-0000-0000-0000-000000000009', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque Central / Catedral', lat: 16.7516, lng: -93.1161, stopOrder: 9, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000001-0000-0000-0000-000000000010', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 10, geometry: { type: 'Point', coordinates: [-93.1065, 16.7495] } },
      { id: 'b0000001-0000-0000-0000-000000000011', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Polyforum / Torre Chiapas', lat: 16.7470, lng: -93.0880, stopOrder: 11, geometry: { type: 'Point', coordinates: [-93.0880, 16.7470] } },
      { id: 'b0000001-0000-0000-0000-000000000012', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Hospital Gómez Maza / Diana Cazadora', lat: 16.7450, lng: -93.0815, stopOrder: 12, geometry: { type: 'Point', coordinates: [-93.0815, 16.7450] } }
    ]
  },

  // 2. Ruta A - Circuito Av. Central / Patria Nueva
  {
    id: 'a0000002-0000-0000-0000-000000000002',
    name: 'Ruta A - Circuito Av. Central / Patria Nueva',
    description: 'Enlaza Juan Crispín, Tec de Tuxtla, Av. Central, Centro y colonias del extremo oriente como Patria Nueva.',
    color: '#DC2626',
    scheduleInfo: {
      firstRun: '05:45',
      lastRun: '22:15',
      frequencyMinutes: 7,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1750, 16.7595],
        [-93.1655, 16.7575],
        [-93.1602, 16.7535],
        [-93.1534, 16.7589],
        [-93.1295, 16.7554],
        [-93.1235, 16.7547],
        [-93.1161, 16.7516],
        [-93.1110, 16.7505],
        [-93.1065, 16.7495],
        [-93.0950, 16.7380],
        [-93.0795, 16.7335]
      ]
    },
    stops: [
      { id: 'b0000002-0000-0000-0000-000000000001', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Crucero Juan Crispín', lat: 16.7595, lng: -93.1750, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1750, 16.7595] } },
      { id: 'b0000002-0000-0000-0000-000000000002', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Tecnológico de Tuxtla ITTG', lat: 16.7575, lng: -93.1655, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1655, 16.7575] } },
      { id: 'b0000002-0000-0000-0000-000000000003', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'UNACH Blvd. Belisario', lat: 16.7535, lng: -93.1602, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1602, 16.7535] } },
      { id: 'b0000002-0000-0000-0000-000000000004', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Plaza Cristal', lat: 16.7589, lng: -93.1534, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1534, 16.7589] } },
      { id: 'b0000002-0000-0000-0000-000000000005', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Av. Central y 11a Pte', lat: 16.7554, lng: -93.1295, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1295, 16.7554] } },
      { id: 'b0000002-0000-0000-0000-000000000006', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1235, 16.7547] } },
      { id: 'b0000002-0000-0000-0000-000000000007', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000002-0000-0000-0000-000000000008', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Mercado Díaz Ordaz', lat: 16.7505, lng: -93.1110, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1110, 16.7505] } },
      { id: 'b0000002-0000-0000-0000-000000000009', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 9, geometry: { type: 'Point', coordinates: [-93.1065, 16.7495] } },
      { id: 'b0000002-0000-0000-0000-000000000010', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Fuente Mactumatzá Ote', lat: 16.7380, lng: -93.0950, stopOrder: 10, geometry: { type: 'Point', coordinates: [-93.0950, 16.7380] } },
      { id: 'b0000002-0000-0000-0000-000000000011', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Terminal Patria Nueva', lat: 16.7335, lng: -93.0795, stopOrder: 11, geometry: { type: 'Point', coordinates: [-93.0795, 16.7335] } }
    ]
  },

  // 3. Ruta 43 - Libramiento Sur (Poniente - Oriente)
  {
    id: 'a0000003-0000-0000-0000-000000000003',
    name: 'Ruta 43 - Libramiento Sur (Poniente - Oriente)',
    description: 'Corredor perimetral de alta velocidad conectando Real del Bosque, Chedraui Sur, Villaflores y Central de Abastos.',
    color: '#D97706',
    scheduleInfo: {
      firstRun: '05:30',
      lastRun: '22:00',
      frequencyMinutes: 8,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1720, 16.7310],
        [-93.1550, 16.7315],
        [-93.1420, 16.7322],
        [-93.1280, 16.7350],
        [-93.1180, 16.7375],
        [-93.1118, 16.7368],
        [-93.1020, 16.7362],
        [-93.0890, 16.7385],
        [-93.0720, 16.7410]
      ]
    },
    stops: [
      { id: 'b0000003-0000-0000-0000-000000000001', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Entrada Real del Bosque / Terán Sur', lat: 16.7310, lng: -93.1720, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1720, 16.7310] } },
      { id: 'b0000003-0000-0000-0000-000000000002', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Crucero Terán Sur (Conexión Ruta 1)', lat: 16.7435, lng: -93.1665, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1665, 16.7435] } },
      { id: 'b0000003-0000-0000-0000-000000000003', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Libramiento Sur y Periférico Pte', lat: 16.7315, lng: -93.1550, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1550, 16.7315] } },
      { id: 'b0000003-0000-0000-0000-000000000004', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Chedraui Sur / Mactumatzá', lat: 16.7322, lng: -93.1420, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1420, 16.7322] } },
      { id: 'b0000003-0000-0000-0000-000000000005', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Paso a Desnivel San José', lat: 16.7350, lng: -93.1280, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1280, 16.7350] } },
      { id: 'b0000003-0000-0000-0000-000000000006', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Crucero Villaflores', lat: 16.7375, lng: -93.1180, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1180, 16.7375] } },
      { id: 'b0000003-0000-0000-0000-000000000007', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Calle Central y Libramiento Sur', lat: 16.7368, lng: -93.1118, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1118, 16.7368] } },
      { id: 'b0000003-0000-0000-0000-000000000008', routeId: 'a0000003-0000-0000-0000-000000000003', name: '11a Oriente y Lib. Sur', lat: 16.7362, lng: -93.1020, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1020, 16.7362] } },
      { id: 'b0000003-0000-0000-0000-000000000009', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Plaza Poliforum / Libramiento', lat: 16.7385, lng: -93.0890, stopOrder: 9, geometry: { type: 'Point', coordinates: [-93.0890, 16.7385] } },
      { id: 'b0000003-0000-0000-0000-000000000010', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Central de Abastos', lat: 16.7410, lng: -93.0720, stopOrder: 10, geometry: { type: 'Point', coordinates: [-93.0720, 16.7410] } }
    ]
  },


  // 4. Ruta 90 - Libramiento Norte (Laguitos - Torre Chiapas)
  {
    id: 'a0000004-0000-0000-0000-000000000004',
    name: 'Ruta 90 - Libramiento Norte (Laguitos - Torre Chiapas)',
    description: 'Eje perimetral norte interconectando UNICACH Campus Norte, Mirador Los Amorosos, Fiscalía y Torre Chiapas.',
    color: '#7C3AED',
    scheduleInfo: {
      firstRun: '06:00',
      lastRun: '21:45',
      frequencyMinutes: 9,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1590, 16.7685],
        [-93.1495, 16.7725],
        [-93.1330, 16.7695],
        [-93.1155, 16.7680],
        [-93.0980, 16.7655],
        [-93.0860, 16.7580],
        [-93.0880, 16.7470]
      ]
    },
    stops: [
      { id: 'b0000004-0000-0000-0000-000000000001', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Reloj Floral / Laguitos', lat: 16.7685, lng: -93.1590, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1590, 16.7685] } },
      { id: 'b0000004-0000-0000-0000-000000000002', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'UNICACH Ciudad Universitaria', lat: 16.7725, lng: -93.1495, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1495, 16.7725] } },
      { id: 'b0000004-0000-0000-0000-000000000003', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Mirador Los Amorosos', lat: 16.7695, lng: -93.1330, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1330, 16.7695] } },
      { id: 'b0000004-0000-0000-0000-000000000004', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Libramiento Norte y Calle Central', lat: 16.7680, lng: -93.1155, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1155, 16.7680] } },
      { id: 'b0000004-0000-0000-0000-000000000005', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Parque del Oriente / Fidel Velázquez', lat: 16.7655, lng: -93.0980, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.0980, 16.7655] } },
      { id: 'b0000004-0000-0000-0000-000000000006', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Fiscalía General', lat: 16.7580, lng: -93.0860, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.0860, 16.7580] } },
      { id: 'b0000004-0000-0000-0000-000000000007', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Torre Chiapas', lat: 16.7470, lng: -93.0880, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.0880, 16.7470] } }
    ]
  },

  // 5. Ruta 58 - UNACH / 5a Norte / San Roque
  {
    id: 'a0000005-0000-0000-0000-000000000005',
    name: 'Ruta 58 - UNACH / 5a Norte / San Roque',
    description: 'Conecta campus UNACH por la 5a Norte pasando por Parque de la Marimba, Parque Central, San Roque y Mercado de los Ancianos.',
    color: '#059669',
    scheduleInfo: {
      firstRun: '05:30',
      lastRun: '22:00',
      frequencyMinutes: 8,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1602, 16.7535],
        [-93.1485, 16.7630],
        [-93.1340, 16.7605],
        [-93.1235, 16.7547],
        [-93.1168, 16.7562],
        [-93.1161, 16.7516],
        [-93.1090, 16.7465],
        [-93.1125, 16.7410]
      ]
    },
    stops: [
      { id: 'b0000005-0000-0000-0000-000000000001', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'UNACH Campus I', lat: 16.7535, lng: -93.1602, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1602, 16.7535] } },
      { id: 'b0000005-0000-0000-0000-000000000002', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Plaza Sol / 5a Norte', lat: 16.7630, lng: -93.1485, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1485, 16.7630] } },
      { id: 'b0000005-0000-0000-0000-000000000003', routeId: 'a0000005-0000-0000-0000-000000000005', name: '5a Norte y 13a Pte', lat: 16.7605, lng: -93.1340, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1340, 16.7605] } },
      { id: 'b0000005-0000-0000-0000-000000000004', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1235, 16.7547] } },
      { id: 'b0000005-0000-0000-0000-000000000005', routeId: 'a0000005-0000-0000-0000-000000000005', name: '5a Norte y Calle Central', lat: 16.7562, lng: -93.1168, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1168, 16.7562] } },
      { id: 'b0000005-0000-0000-0000-000000000006', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000005-0000-0000-0000-000000000007', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Barrio San Roque', lat: 16.7465, lng: -93.1090, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1090, 16.7465] } },
      { id: 'b0000005-0000-0000-0000-000000000008', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Mercado de los Ancianos', lat: 16.7410, lng: -93.1125, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1125, 16.7410] } }
    ]
  },

  // 6. Ruta 52 - Chapultepec / Caña Hueca / Centro
  {
    id: 'a0000006-0000-0000-0000-000000000006',
    name: 'Ruta 52 - Chapultepec / Caña Hueca / Centro',
    description: 'Enlaza la Col. Chapultepec, Panteón Jardín y Parque Caña Hueca con el centro comercial y el Mercado Juan Sabines.',
    color: '#DB2777',
    scheduleInfo: {
      firstRun: '05:45',
      lastRun: '21:30',
      frequencyMinutes: 10,
      estimatedWaitMinutes: 5,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1690, 16.7655],
        [-93.1585, 16.7635],
        [-93.1534, 16.7589],
        [-93.1360, 16.7525],
        [-93.1215, 16.7538],
        [-93.1161, 16.7516],
        [-93.1145, 16.7495],
        [-93.1060, 16.7425]
      ]
    },
    stops: [
      { id: 'b0000006-0000-0000-0000-000000000001', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Col. Chapultepec', lat: 16.7655, lng: -93.1690, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1690, 16.7655] } },
      { id: 'b0000006-0000-0000-0000-000000000002', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Panteón Jardín / Laguitos', lat: 16.7635, lng: -93.1585, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1585, 16.7635] } },
      { id: 'b0000006-0000-0000-0000-000000000003', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Caña Hueca', lat: 16.7589, lng: -93.1534, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1534, 16.7589] } },
      { id: 'b0000006-0000-0000-0000-000000000004', routeId: 'a0000006-0000-0000-0000-000000000006', name: '1a Sur Poniente', lat: 16.7525, lng: -93.1360, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1360, 16.7525] } },
      { id: 'b0000006-0000-0000-0000-000000000005', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Bicentenario', lat: 16.7538, lng: -93.1215, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1215, 16.7538] } },
      { id: 'b0000006-0000-0000-0000-000000000006', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000006-0000-0000-0000-000000000007', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Mercado Juan Sabines', lat: 16.7495, lng: -93.1145, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1145, 16.7495] } },
      { id: 'b0000006-0000-0000-0000-000000000008', routeId: 'a0000006-0000-0000-0000-000000000006', name: '9a Sur Oriente', lat: 16.7425, lng: -93.1060, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1060, 16.7425] } }
    ]
  },

  // 7. Ruta 30 - Calle Central / Las Granjas / Sumidero
  {
    id: 'a0000007-0000-0000-0000-000000000007',
    name: 'Ruta 30 - Calle Central / Las Granjas / Sumidero',
    description: 'Eje vertical que conecta el Libramiento Sur, Mercado de los Ancianos, Centro, Teatro de la Ciudad y el Cañón del Sumidero.',
    color: '#0891B2',
    scheduleInfo: {
      firstRun: '05:30',
      lastRun: '22:00',
      frequencyMinutes: 8,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1118, 16.7368],
        [-93.1125, 16.7410],
        [-93.1145, 16.7475],
        [-93.1161, 16.7516],
        [-93.1168, 16.7562],
        [-93.1120, 16.7600],
        [-93.1050, 16.7720],
        [-93.0980, 16.7840]
      ]
    },
    stops: [
      { id: 'b0000007-0000-0000-0000-000000000001', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Calle Central y Libramiento Sur', lat: 16.7368, lng: -93.1118, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1118, 16.7368] } },
      { id: 'b0000007-0000-0000-0000-000000000002', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Mercado de los Ancianos', lat: 16.7410, lng: -93.1125, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1125, 16.7410] } },
      { id: 'b0000007-0000-0000-0000-000000000003', routeId: 'a0000007-0000-0000-0000-000000000007', name: '4a Sur y Calle Central', lat: 16.7475, lng: -93.1145, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1145, 16.7475] } },
      { id: 'b0000007-0000-0000-0000-000000000004', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000007-0000-0000-0000-000000000005', routeId: 'a0000007-0000-0000-0000-000000000007', name: '5a Norte y Calle Central', lat: 16.7562, lng: -93.1168, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1168, 16.7562] } },
      { id: 'b0000007-0000-0000-0000-000000000006', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Teatro de la Ciudad', lat: 16.7600, lng: -93.1120, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1120, 16.7600] } },
      { id: 'b0000007-0000-0000-0000-000000000007', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Distribuidor Vial Norte', lat: 16.7720, lng: -93.1050, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1050, 16.7720] } },
      { id: 'b0000007-0000-0000-0000-000000000008', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Terminal Albania Alta / Las Granjas', lat: 16.7840, lng: -93.0980, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.0980, 16.7840] } }
    ]
  },

  // 8. Ruta 73 - Ingeniería UNACH / ISSSTE / Centro
  {
    id: 'a0000008-0000-0000-0000-000000000008',
    name: 'Ruta 73 - Ingeniería UNACH / ISSSTE / Centro',
    description: 'Enlaza la Facultad de Ingeniería de la UNACH, Hospital ISSSTE Belisario Domínguez y Parque de la Marimba con el Mercado Díaz Ordaz.',
    color: '#4F46E5',
    scheduleInfo: {
      firstRun: '05:45',
      lastRun: '22:00',
      frequencyMinutes: 9,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1640, 16.7660],
        [-93.1560, 16.7555],
        [-93.1460, 16.7570],
        [-93.1235, 16.7547],
        [-93.1200, 16.7530],
        [-93.1161, 16.7516],
        [-93.1110, 16.7505],
        [-93.1065, 16.7495]
      ]
    },
    stops: [
      { id: 'b0000008-0000-0000-0000-000000000001', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Blvd. Laguitos Poniente', lat: 16.7660, lng: -93.1640, stopOrder: 1, geometry: { type: 'Point', coordinates: [-93.1640, 16.7660] } },
      { id: 'b0000008-0000-0000-0000-000000000002', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Facultad de Ingeniería UNACH', lat: 16.7555, lng: -93.1560, stopOrder: 2, geometry: { type: 'Point', coordinates: [-93.1560, 16.7555] } },
      { id: 'b0000008-0000-0000-0000-000000000003', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Hospital ISSSTE Belisario', lat: 16.7570, lng: -93.1460, stopOrder: 3, geometry: { type: 'Point', coordinates: [-93.1460, 16.7570] } },
      { id: 'b0000008-0000-0000-0000-000000000004', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 4, geometry: { type: 'Point', coordinates: [-93.1235, 16.7547] } },
      { id: 'b0000008-0000-0000-0000-000000000005', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Av. Central y 2a Pte', lat: 16.7530, lng: -93.1200, stopOrder: 5, geometry: { type: 'Point', coordinates: [-93.1200, 16.7530] } },
      { id: 'b0000008-0000-0000-0000-000000000006', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6, geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] } },
      { id: 'b0000008-0000-0000-0000-000000000007', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Mercado Díaz Ordaz', lat: 16.7505, lng: -93.1110, stopOrder: 7, geometry: { type: 'Point', coordinates: [-93.1110, 16.7505] } },
      { id: 'b0000008-0000-0000-0000-000000000008', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 8, geometry: { type: 'Point', coordinates: [-93.1065, 16.7495] } }
    ]
  }
];

// Estado cinemático en memoria para modo offline/demo (12 unidades)
const DEMO_UNITS_STATE = [
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

// Alertas e incidentes viales en memoria para modo demo/offline
let demoIncidents = [
  {
    id: 'inc-001',
    type: 'ROAD_BLOCK',
    icon: '🚧',
    title: 'Obras y Reducción de Carril en Av. Central',
    description: 'Trabajos de mantenimiento a la altura de 11a Poniente. Reducción a un carril con desvío sugerido.',
    lat: 16.7554,
    lng: -93.1295,
    locationName: 'Av. Central y 11a Poniente',
    routeId: 'a0000001-0000-0000-0000-000000000001',
    routeName: 'Ruta 1 - Av. Central / UNACH / Terán',
    routeColor: '#2563EB',
    delayMinutes: 15,
    status: 'ACTIVE_ALERT',
    reportedBy: 'Soporte Vial',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'inc-002',
    type: 'HEAVY_TRAFFIC',
    icon: '🚗',
    title: 'Tráfico Intenso en Crucero Villaflores',
    description: 'Circulación lenta en Libramiento Sur con avance intermitente por semáforo en sincronización.',
    lat: 16.7375,
    lng: -93.1180,
    locationName: 'Libramiento Sur y Crucero Villaflores',
    routeId: 'a0000003-0000-0000-0000-000000000003',
    routeName: 'Ruta 43 - Libramiento Sur (Poniente - Oriente)',
    routeColor: '#D97706',
    delayMinutes: 12,
    status: 'ACTIVE_ALERT',
    reportedBy: 'Pasajero Combi TX-43A',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }
];

let lastSimTime = Date.now();


function advanceDemoKinematics() {
  const now = Date.now();
  const dt = Math.min(3, Math.max(0.2, (now - lastSimTime) / 1000));
  lastSimTime = now;

  return DEMO_UNITS_STATE.map((u) => {
    const route = BACKUP_ROUTES.find((r) => r.id === u.routeId);
    if (!route || !route.stops || route.stops.length < 2) return u;

    const stops = route.stops;

    if (u.status === 'BOARDING') {
      u.dwellRemainingSec = Math.max(0, (u.dwellRemainingSec || 15) - dt);
      u.speedKmh = 0;
      if (u.dwellRemainingSec <= 0) {
        u.status = 'IN_TRANSIT';
        u.dwellRemainingSec = 0;
        u.speedKmh = Math.floor(Math.random() * 7) + 28;
        u.progress = 0;
        u.currentStopIndex = u.nextStopIndex;
        let proposed = u.currentStopIndex + u.direction;
        if (proposed >= stops.length) {
          u.direction = -1;
          proposed = u.currentStopIndex - 1;
        } else if (proposed < 0) {
          u.direction = 1;
          proposed = u.currentStopIndex + 1;
        }
        u.nextStopIndex = proposed;
      }
      const currentStop = stops[u.currentStopIndex] || stops[0];
      const nextStop = stops[u.nextStopIndex] || stops[1];
      return {
        ...u,
        lat: currentStop.lat,
        lng: currentStop.lng,
        routeName: route.name,
        routeColor: route.color,
        currentStopName: currentStop.name,
        nextStopName: nextStop.name,
        locationName: currentStop.name,
        timestamp: new Date().toISOString()
      };
    }

    const fromStop = stops[u.currentStopIndex] || stops[0];
    const toStop = stops[u.nextStopIndex] || stops[1];

    const dist = Math.max(100, calculateHaversineDistance(fromStop.lat, fromStop.lng, toStop.lat, toStop.lng));
    const speedKmh = u.speedKmh || (Math.floor(Math.random() * 7) + 28);
    const speedMps = (speedKmh * 1000) / 3600;
    u.progress = (u.progress || 0) + (speedMps * dt) / dist;

    if (u.progress >= 1.0) {
      u.progress = 1.0;
      u.status = 'BOARDING';
      u.dwellRemainingSec = 15;
      u.speedKmh = 0;
      u.lat = toStop.lat;
      u.lng = toStop.lng;
      let nextAfter = u.nextStopIndex + u.direction;
      if (nextAfter >= stops.length) {
        u.direction = -1;
        nextAfter = u.nextStopIndex - 1;
      } else if (nextAfter < 0) {
        u.direction = 1;
        nextAfter = u.nextStopIndex + 1;
      }
      return {
        ...u,
        lat: toStop.lat,
        lng: toStop.lng,
        routeName: route.name,
        routeColor: route.color,
        currentStopName: toStop.name,
        nextStopName: stops[nextAfter]?.name || toStop.name,
        locationName: toStop.name,
        timestamp: new Date().toISOString()
      };
    }

    const lat = fromStop.lat + (toStop.lat - fromStop.lat) * u.progress;
    const lng = fromStop.lng + (toStop.lng - fromStop.lng) * u.progress;

    return {
      ...u,
      lat,
      lng,
      routeName: route.name,
      routeColor: route.color,
      currentStopName: fromStop.name,
      nextStopName: toStop.name,
      locationName: `Hacia ${toStop.name}`,
      timestamp: new Date().toISOString()
    };
  });
}

export const apiClient = {
  /**
   * Obtiene la lista completa de las 8 rutas con su trazado y paradas
   */
  async fetchRoutes() {
    try {
      const response = await fetch(`${API_BASE_URL}/routes`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener rutas del servidor`);
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data || [],
        isDemoMode: false
      };
    } catch (err) {
      console.warn('[Tuxtla-Rutas API] Backend no disponible. Activando catálogo de respaldo en memoria:', err.message);
      return {
        success: true,
        data: BACKUP_ROUTES,
        isDemoMode: true
      };
    }
  },

  /**
   * Obtiene una ruta por su ID
   */
  async fetchRouteById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener detalle de la ruta`);
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data,
        isDemoMode: false
      };
    } catch (err) {
      const fallback = BACKUP_ROUTES.find((r) => r.id === id) || null;
      return {
        success: true,
        data: fallback,
        isDemoMode: true
      };
    }
  },

  /**
   * Encuentra las paradas más cercanas a unas coordenadas dadas
   * @param {Object} params
   * @param {number} params.lat
   * @param {number} params.lng
   * @param {number} [params.radius=1500]
   * @param {number} [params.limit=5]
   */
  async fetchNearestStops({ lat, lng, radius = 1500, limit = 5 }) {
    try {
      const url = `${API_BASE_URL}/stops/nearest?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al consultar paradas cercanas`);
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data || [],
        isDemoMode: false
      };
    } catch (err) {
      console.warn('[Tuxtla-Rutas API] Calculando paradas cercanas localmente (modo Demo / Haversine):', err.message);

      const allStops = [];
      for (const route of BACKUP_ROUTES) {
        for (const stop of route.stops) {
          const distanceMeters = calculateHaversineDistance(lat, lng, stop.lat, stop.lng);
          if (distanceMeters <= radius) {
            allStops.push({
              ...stop,
              distanceMeters,
              routeName: route.name,
              routeColor: route.color
            });
          }
        }
      }

      allStops.sort((a, b) => a.distanceMeters - b.distanceMeters);
      const sliced = allStops.slice(0, limit);

      const enriched = sliced.map((stop, index) => ({
        ...stop,
        walkingTimeMinutes: Math.max(1, Math.ceil(stop.distanceMeters / 80)),
        nextBusMinutes: Math.max(3, 4 + index * 2)
      }));

      return {
        success: true,
        data: enriched,
        isDemoMode: true
      };
    }
  },

  /**
   * Obtiene la telemetría en tiempo real de las 12 unidades colectivas
   */
  async fetchTelemetry() {
    try {
      const response = await fetch(`${API_BASE_URL}/automation/telemetry`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al consultar telemetría`);
      }

      const json = await response.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        return {
          success: true,
          data: json.data,
          isDemoMode: false
        };
      }
      throw new Error('Sin datos en backend');
    } catch (err) {
      // Fallback simulado cinematográfico LERP de las 12 unidades con parada de 15s
      const simulatedUnits = advanceDemoKinematics();

      return {
        success: true,
        data: simulatedUnits,
        isDemoMode: true
      };
    }
  },

  /**
   * Planificador inteligente de viajes ("¿Qué combi tomo?")
   */
  async planTrip({ originLat, originLng, destLat, destLng }) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ originLat, originLng, destLat, destLng }),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al planificar viaje`);
      }

      const json = await response.json();
      return {
        success: true,
        data: json,
        isDemoMode: false
      };
    } catch (err) {
      console.warn('[Tuxtla-Rutas API] Planificando viaje localmente en modo Offline/Demo:', err.message);

      // Algoritmo multimodal de contingencia local
      const routes = BACKUP_ROUTES.filter((r) => r.scheduleInfo?.status !== 'SUSPENDED');
      const directOptions = [];
      const transferOptions = [];

      const MAX_WALK = 1100;
      const MAX_TRANSFER = 500;

      for (const route of routes) {
        let bestOrig = null, minODist = Infinity, bestDest = null, minDDist = Infinity;
        for (const stop of route.stops) {
          const od = calculateHaversineDistance(originLat, originLng, stop.lat, stop.lng);
          const dd = calculateHaversineDistance(destLat, destLng, stop.lat, stop.lng);
          if (od <= MAX_WALK && od < minODist) { minODist = od; bestOrig = stop; }
          if (dd <= MAX_WALK && dd < minDDist) { minDDist = dd; bestDest = stop; }
        }

        if (bestOrig && bestDest && bestOrig.id !== bestDest.id) {
          const stopsCount = Math.abs(bestDest.stopOrder - bestOrig.stopOrder);
          if (stopsCount >= 1) {
            const oWalk = Math.max(1, Math.round(minODist / 80));
            const transit = Math.round(stopsCount * 2.2) + 3;
            const dWalk = Math.max(1, Math.round(minDDist / 80));
            directOptions.push({
              id: `direct-${route.id}`,
              type: 'DIRECT',
              routeId: route.id,
              routeName: route.name,
              routeColor: route.color,
              originStop: bestOrig,
              destStop: bestDest,
              originWalkMeters: Math.round(minODist),
              destWalkMeters: Math.round(minDDist),
              totalWalkMeters: Math.round(minODist + minDDist),
              stopsCount,
              estimatedMinutes: oWalk + transit + dWalk,
              instructions: [
                `Caminar ${Math.round(minODist)} m hacia "${bestOrig.name}" (~${oWalk} min).`,
                `Tomar ${route.name} y viajar ${stopsCount} paradas (~${transit} min).`,
                `Descender en "${bestDest.name}".`,
                `Caminar ${Math.round(minDDist)} m al destino final (~${dWalk} min).`
              ]
            });
          }
        }
      }

      // Trasbordos locales
      for (let i = 0; i < routes.length; i++) {
        const rA = routes[i];
        let bestOrigA = null, minODA = Infinity;
        for (const s of rA.stops) {
          const d = calculateHaversineDistance(originLat, originLng, s.lat, s.lng);
          if (d <= MAX_WALK && d < minODA) { minODA = d; bestOrigA = s; }
        }
        if (!bestOrigA) continue;

        for (let j = 0; j < routes.length; j++) {
          if (i === j) continue;
          const rB = routes[j];
          let bestDestB = null, minDDB = Infinity;
          for (const s of rB.stops) {
            const d = calculateHaversineDistance(destLat, destLng, s.lat, s.lng);
            if (d <= MAX_WALK && d < minDDB) { minDDB = d; bestDestB = s; }
          }
          if (!bestDestB) continue;

          let bestPair = null, minTD = Infinity;
          for (const sA of rA.stops) {
            if (sA.id === bestOrigA.id) continue;
            for (const sB of rB.stops) {
              if (sB.id === bestDestB.id) continue;
              const td = calculateHaversineDistance(sA.lat, sA.lng, sB.lat, sB.lng);
              if (td <= MAX_TRANSFER && td < minTD) {
                minTD = td;
                bestPair = { sA, sB, td };
              }
            }
          }

          if (bestPair) {
            const { sA, sB, td } = bestPair;
            const scA = Math.abs(sA.stopOrder - bestOrigA.stopOrder);
            const scB = Math.abs(bestDestB.stopOrder - sB.stopOrder);
            if (scA >= 1 && scB >= 1) {
              const ow = Math.max(1, Math.round(minODA / 80));
              const tA = Math.round(scA * 2.2) + 3;
              const tw = Math.max(1, Math.round(td / 80));
              const tB = Math.round(scB * 2.2);
              const dw = Math.max(1, Math.round(minDDB / 80));
              transferOptions.push({
                id: `transfer-${rA.id}-${rB.id}`,
                type: 'TRANSFER',
                firstRoute: { id: rA.id, name: rA.name, color: rA.color, originStop: bestOrigA, transferStop: sA, stopsCount: scA },
                transferNode: { fromStopName: sA.name, toStopName: sB.name, walkMeters: Math.round(td), walkMinutes: tw, nodeName: sA.name === sB.name ? sA.name : `${sA.name} ↔ ${sB.name}` },
                secondRoute: { id: rB.id, name: rB.name, color: rB.color, transferStop: sB, destStop: bestDestB, stopsCount: scB },
                originWalkMeters: Math.round(minODA),
                transferWalkMeters: Math.round(td),
                destWalkMeters: Math.round(minDDB),
                totalWalkMeters: Math.round(minODA + td + minDDB),
                totalStopsCount: scA + scB,
                estimatedMinutes: ow + tA + tw + 4 + tB + dw,
                instructions: [
                  `Caminar ${Math.round(minODA)} m hacia "${bestOrigA.name}" (~${ow} min).`,
                  `Abordar "${rA.name}" y avanzar ${scA} paradas (~${tA} min).`,
                  `Bajar en "${sA.name}" y caminar ${Math.round(td)} m hacia "${sB.name}".`,
                  `Tomar "${rB.name}" y avanzar ${scB} paradas (~${tB} min).`,
                  `Descender en "${bestDestB.name}" y caminar ${Math.round(minDDB)} m (~${dw} min).`
                ]
              });
            }
          }
        }
      }

      directOptions.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
      transferOptions.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);

      return {
        success: true,
        data: {
          directOptions: directOptions.slice(0, 5),
          transferOptions: transferOptions.slice(0, 6),
          directCount: directOptions.length,
          transferCount: transferOptions.length
        },
        isDemoMode: true
      };
    }
  },

  /**
   * Consulta alertas viales e incidentes registrados
   */
  async fetchIncidents() {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener incidentes`);
      }

      const json = await response.json();
      return {
        success: true,
        data: json.data || [],
        isDemoMode: false
      };
    } catch (err) {
      console.warn('[Tuxtla-Rutas API] Usando alertas locales:', err.message);
      return {
        success: true,
        data: demoIncidents,
        isDemoMode: true
      };
    }
  },

  /**
   * Reporta un nuevo incidente vial (pasajero o soporte)
   */
  async reportIncident(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al reportar incidente`);
      }

      const json = await response.json();
      return { success: true, data: json.data, isDemoMode: false };
    } catch (err) {
      console.warn('[Tuxtla-Rutas API] Guardando incidente localmente:', err.message);
      const newInc = {
        id: `inc-${Date.now()}`,
        ...payload,
        status: payload.createdByRole === 'USER' ? 'PENDING' : 'ACTIVE_ALERT',
        createdAt: new Date().toISOString()
      };
      demoIncidents = [newInc, ...demoIncidents];
      return { success: true, data: newInc, isDemoMode: true };
    }
  },

  /**
   * Actualiza el estado de un incidente (Soporte)
   */
  async updateIncidentStatus(id, { status, delayMinutes }) {
    try {
      const response = await fetch(`${API_BASE_URL}/incidents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status, delayMinutes }),
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al actualizar incidente`);
      }

      const json = await response.json();
      return { success: true, data: json.data, isDemoMode: false };
    } catch (err) {
      demoIncidents = demoIncidents.map((i) =>
        i.id === id ? { ...i, status: status || i.status, delayMinutes: delayMinutes ?? i.delayMinutes } : i
      );
      return { success: true, isDemoMode: true };
    }
  },

  /**
   * Actualiza configuración operativa de una ruta (Admin)
   */
  async updateRouteConfig(id, config) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${id}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al actualizar ruta`);
      }

      const json = await response.json();
      return { success: true, data: json.data, isDemoMode: false };
    } catch (err) {
      const r = BACKUP_ROUTES.find((item) => item.id === id);
      if (r) {
        if (config.frequencyMinutes !== undefined) r.scheduleInfo.frequencyMinutes = config.frequencyMinutes;
        if (config.status !== undefined) r.scheduleInfo.status = config.status;
        if (config.color !== undefined) r.color = config.color;
      }
      return { success: true, isDemoMode: true };
    }
  },

  /**
   * Despacha una nueva unidad colectiva (Admin)
   */
  async dispatchFleetUnit(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/automation/fleet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al despachar flota`);
      }

      const json = await response.json();
      return { success: true, data: json.data, isDemoMode: false };
    } catch (err) {
      const { unitId, routeId, speedKmh = 30 } = payload;
      const existingIdx = DEMO_UNITS_STATE.findIndex((u) => u.unitId === unitId);
      const newUnit = {
        unitId,
        routeId: routeId || BACKUP_ROUTES[0].id,
        currentStopIndex: 0,
        nextStopIndex: 1,
        direction: 1,
        progress: 0.1,
        status: 'IN_TRANSIT',
        dwellRemainingSec: 0,
        speedKmh
      };
      if (existingIdx >= 0) {
        DEMO_UNITS_STATE[existingIdx] = { ...DEMO_UNITS_STATE[existingIdx], ...newUnit };
      } else {
        DEMO_UNITS_STATE.push(newUnit);
      }
      return { success: true, data: newUnit, isDemoMode: true };
    }
  },

  // Métodos de compatibilidad con código anterior
  async getRoutes() {
    return this.fetchRoutes();
  },

  async getNearestStop(lat, lng, radius = 1000) {
    const res = await this.fetchNearestStops({ lat, lng, radius, limit: 1 });
    return {
      success: true,
      data: res.data && res.data.length > 0 ? res.data[0] : null,
      isDemoMode: res.isDemoMode
    };
  }
};

