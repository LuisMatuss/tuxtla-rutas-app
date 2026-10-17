// Módulo Maestro de Datos Semilla Geoespaciales: 8 Rutas Principales de Tuxtla Gutiérrez, Chiapas
// Coordenadas GeoJSON en formato canónico [Longitud, Latitud] bajo el estándar SRID 4326 (WGS 84)

/**
 * Cálculo geodésico Haversine exacto en metros entre dos coordenadas decimales
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
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

export const TUXTLA_ROUTES_SEED = [
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
      { id: 'b0000001-0000-0000-0000-000000000001', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Terminal Parque Terán', lat: 16.7450, lng: -93.1685, stopOrder: 1 },
      { id: 'b0000001-0000-0000-0000-000000000002', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Crucero Terán', lat: 16.7505, lng: -93.1640, stopOrder: 2 },
      { id: 'b0000001-0000-0000-0000-000000000003', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'UNACH Campus I', lat: 16.7535, lng: -93.1602, stopOrder: 3 },
      { id: 'b0000001-0000-0000-0000-000000000004', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Jardines de Tuxtla', lat: 16.7565, lng: -93.1568, stopOrder: 4 },
      { id: 'b0000001-0000-0000-0000-000000000005', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Plaza Cristal / Caña Hueca', lat: 16.7589, lng: -93.1534, stopOrder: 5 },
      { id: 'b0000001-0000-0000-0000-000000000006', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Rectoría UNICACH / 15a Pte', lat: 16.7565, lng: -93.1410, stopOrder: 6 },
      { id: 'b0000001-0000-0000-0000-000000000007', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 7 },
      { id: 'b0000001-0000-0000-0000-000000000008', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque Bicentenario', lat: 16.7538, lng: -93.1215, stopOrder: 8 },
      { id: 'b0000001-0000-0000-0000-000000000009', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque Central / Catedral', lat: 16.7516, lng: -93.1161, stopOrder: 9 },
      { id: 'b0000001-0000-0000-0000-000000000010', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 10 },
      { id: 'b0000001-0000-0000-0000-000000000011', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Polyforum / Torre Chiapas', lat: 16.7470, lng: -93.0880, stopOrder: 11 },
      { id: 'b0000001-0000-0000-0000-000000000012', routeId: 'a0000001-0000-0000-0000-000000000001', name: 'Hospital Gómez Maza / Diana Cazadora', lat: 16.7450, lng: -93.0815, stopOrder: 12 }
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
      { id: 'b0000002-0000-0000-0000-000000000001', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Crucero Juan Crispín', lat: 16.7595, lng: -93.1750, stopOrder: 1 },
      { id: 'b0000002-0000-0000-0000-000000000002', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Tecnológico de Tuxtla ITTG', lat: 16.7575, lng: -93.1655, stopOrder: 2 },
      { id: 'b0000002-0000-0000-0000-000000000003', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'UNACH Blvd. Belisario', lat: 16.7535, lng: -93.1602, stopOrder: 3 },
      { id: 'b0000002-0000-0000-0000-000000000004', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Plaza Cristal', lat: 16.7589, lng: -93.1534, stopOrder: 4 },
      { id: 'b0000002-0000-0000-0000-000000000005', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Av. Central y 11a Pte', lat: 16.7554, lng: -93.1295, stopOrder: 5 },
      { id: 'b0000002-0000-0000-0000-000000000006', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 6 },
      { id: 'b0000002-0000-0000-0000-000000000007', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 7 },
      { id: 'b0000002-0000-0000-0000-000000000008', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Mercado Díaz Ordaz', lat: 16.7505, lng: -93.1110, stopOrder: 8 },
      { id: 'b0000002-0000-0000-0000-000000000009', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 9 },
      { id: 'b0000002-0000-0000-0000-000000000010', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Fuente Mactumatzá Ote', lat: 16.7380, lng: -93.0950, stopOrder: 10 },
      { id: 'b0000002-0000-0000-0000-000000000011', routeId: 'a0000002-0000-0000-0000-000000000002', name: 'Terminal Patria Nueva', lat: 16.7335, lng: -93.0795, stopOrder: 11 }
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
      { id: 'b0000003-0000-0000-0000-000000000001', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Entrada Real del Bosque / Terán Sur', lat: 16.7310, lng: -93.1720, stopOrder: 1 },
      { id: 'b0000003-0000-0000-0000-000000000002', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Crucero Terán Sur (Conexión Ruta 1)', lat: 16.7435, lng: -93.1665, stopOrder: 2 },
      { id: 'b0000003-0000-0000-0000-000000000003', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Libramiento Sur y Periférico Pte', lat: 16.7315, lng: -93.1550, stopOrder: 3 },
      { id: 'b0000003-0000-0000-0000-000000000004', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Chedraui Sur / Mactumatzá', lat: 16.7322, lng: -93.1420, stopOrder: 4 },
      { id: 'b0000003-0000-0000-0000-000000000005', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Paso a Desnivel San José', lat: 16.7350, lng: -93.1280, stopOrder: 5 },
      { id: 'b0000003-0000-0000-0000-000000000006', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Crucero Villaflores', lat: 16.7375, lng: -93.1180, stopOrder: 6 },
      { id: 'b0000003-0000-0000-0000-000000000007', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Calle Central y Libramiento Sur', lat: 16.7368, lng: -93.1118, stopOrder: 7 },
      { id: 'b0000003-0000-0000-0000-000000000008', routeId: 'a0000003-0000-0000-0000-000000000003', name: '11a Oriente y Lib. Sur', lat: 16.7362, lng: -93.1020, stopOrder: 8 },
      { id: 'b0000003-0000-0000-0000-000000000009', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Plaza Poliforum / Libramiento', lat: 16.7385, lng: -93.0890, stopOrder: 9 },
      { id: 'b0000003-0000-0000-0000-000000000010', routeId: 'a0000003-0000-0000-0000-000000000003', name: 'Central de Abastos', lat: 16.7410, lng: -93.0720, stopOrder: 10 }
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
      { id: 'b0000004-0000-0000-0000-000000000001', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Reloj Floral / Laguitos', lat: 16.7685, lng: -93.1590, stopOrder: 1 },
      { id: 'b0000004-0000-0000-0000-000000000002', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'UNICACH Ciudad Universitaria', lat: 16.7725, lng: -93.1495, stopOrder: 2 },
      { id: 'b0000004-0000-0000-0000-000000000003', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Mirador Los Amorosos', lat: 16.7695, lng: -93.1330, stopOrder: 3 },
      { id: 'b0000004-0000-0000-0000-000000000004', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Libramiento Norte y Calle Central', lat: 16.7680, lng: -93.1155, stopOrder: 4 },
      { id: 'b0000004-0000-0000-0000-000000000005', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Parque del Oriente / Fidel Velázquez', lat: 16.7655, lng: -93.0980, stopOrder: 5 },
      { id: 'b0000004-0000-0000-0000-000000000006', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Fiscalía General', lat: 16.7580, lng: -93.0860, stopOrder: 6 },
      { id: 'b0000004-0000-0000-0000-000000000007', routeId: 'a0000004-0000-0000-0000-000000000004', name: 'Torre Chiapas', lat: 16.7470, lng: -93.0880, stopOrder: 7 }
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
      { id: 'b0000005-0000-0000-0000-000000000001', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'UNACH Campus I', lat: 16.7535, lng: -93.1602, stopOrder: 1 },
      { id: 'b0000005-0000-0000-0000-000000000002', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Plaza Sol / 5a Norte', lat: 16.7630, lng: -93.1485, stopOrder: 2 },
      { id: 'b0000005-0000-0000-0000-000000000003', routeId: 'a0000005-0000-0000-0000-000000000005', name: '5a Norte y 13a Pte', lat: 16.7605, lng: -93.1340, stopOrder: 3 },
      { id: 'b0000005-0000-0000-0000-000000000004', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 4 },
      { id: 'b0000005-0000-0000-0000-000000000005', routeId: 'a0000005-0000-0000-0000-000000000005', name: '5a Norte y Calle Central', lat: 16.7562, lng: -93.1168, stopOrder: 5 },
      { id: 'b0000005-0000-0000-0000-000000000006', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6 },
      { id: 'b0000005-0000-0000-0000-000000000007', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Barrio San Roque', lat: 16.7465, lng: -93.1090, stopOrder: 7 },
      { id: 'b0000005-0000-0000-0000-000000000008', routeId: 'a0000005-0000-0000-0000-000000000005', name: 'Mercado de los Ancianos', lat: 16.7410, lng: -93.1125, stopOrder: 8 }
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
      { id: 'b0000006-0000-0000-0000-000000000001', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Col. Chapultepec', lat: 16.7655, lng: -93.1690, stopOrder: 1 },
      { id: 'b0000006-0000-0000-0000-000000000002', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Panteón Jardín / Laguitos', lat: 16.7635, lng: -93.1585, stopOrder: 2 },
      { id: 'b0000006-0000-0000-0000-000000000003', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Caña Hueca', lat: 16.7589, lng: -93.1534, stopOrder: 3 },
      { id: 'b0000006-0000-0000-0000-000000000004', routeId: 'a0000006-0000-0000-0000-000000000006', name: '1a Sur Poniente', lat: 16.7525, lng: -93.1360, stopOrder: 4 },
      { id: 'b0000006-0000-0000-0000-000000000005', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Bicentenario', lat: 16.7538, lng: -93.1215, stopOrder: 5 },
      { id: 'b0000006-0000-0000-0000-000000000006', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6 },
      { id: 'b0000006-0000-0000-0000-000000000007', routeId: 'a0000006-0000-0000-0000-000000000006', name: 'Mercado Juan Sabines', lat: 16.7495, lng: -93.1145, stopOrder: 7 },
      { id: 'b0000006-0000-0000-0000-000000000008', routeId: 'a0000006-0000-0000-0000-000000000006', name: '9a Sur Oriente', lat: 16.7425, lng: -93.1060, stopOrder: 8 }
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
      { id: 'b0000007-0000-0000-0000-000000000001', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Calle Central y Libramiento Sur', lat: 16.7368, lng: -93.1118, stopOrder: 1 },
      { id: 'b0000007-0000-0000-0000-000000000002', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Mercado de los Ancianos', lat: 16.7410, lng: -93.1125, stopOrder: 2 },
      { id: 'b0000007-0000-0000-0000-000000000003', routeId: 'a0000007-0000-0000-0000-000000000007', name: '4a Sur y Calle Central', lat: 16.7475, lng: -93.1145, stopOrder: 3 },
      { id: 'b0000007-0000-0000-0000-000000000004', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 4 },
      { id: 'b0000007-0000-0000-0000-000000000005', routeId: 'a0000007-0000-0000-0000-000000000007', name: '5a Norte y Calle Central', lat: 16.7562, lng: -93.1168, stopOrder: 5 },
      { id: 'b0000007-0000-0000-0000-000000000006', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Teatro de la Ciudad', lat: 16.7600, lng: -93.1120, stopOrder: 6 },
      { id: 'b0000007-0000-0000-0000-000000000007', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Distribuidor Vial Norte', lat: 16.7720, lng: -93.1050, stopOrder: 7 },
      { id: 'b0000007-0000-0000-0000-000000000008', routeId: 'a0000007-0000-0000-0000-000000000007', name: 'Terminal Albania Alta / Las Granjas', lat: 16.7840, lng: -93.0980, stopOrder: 8 }
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
      { id: 'b0000008-0000-0000-0000-000000000001', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Blvd. Laguitos Poniente', lat: 16.7660, lng: -93.1640, stopOrder: 1 },
      { id: 'b0000008-0000-0000-0000-000000000002', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Facultad de Ingeniería UNACH', lat: 16.7555, lng: -93.1560, stopOrder: 2 },
      { id: 'b0000008-0000-0000-0000-000000000003', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Hospital ISSSTE Belisario', lat: 16.7570, lng: -93.1460, stopOrder: 3 },
      { id: 'b0000008-0000-0000-0000-000000000004', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque de la Marimba', lat: 16.7547, lng: -93.1235, stopOrder: 4 },
      { id: 'b0000008-0000-0000-0000-000000000005', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Av. Central y 2a Pte', lat: 16.7530, lng: -93.1200, stopOrder: 5 },
      { id: 'b0000008-0000-0000-0000-000000000006', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque Central', lat: 16.7516, lng: -93.1161, stopOrder: 6 },
      { id: 'b0000008-0000-0000-0000-000000000007', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Mercado Díaz Ordaz', lat: 16.7505, lng: -93.1110, stopOrder: 7 },
      { id: 'b0000008-0000-0000-0000-000000000008', routeId: 'a0000008-0000-0000-0000-000000000008', name: 'Parque 5 de Mayo', lat: 16.7495, lng: -93.1065, stopOrder: 8 }
    ]
  }
];
