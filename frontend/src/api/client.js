// Cliente API HTTP con Resiliencia Offline / Demo para Tuxtla-Rutas
// Si el backend o contenedor de base de datos no está disponible, activa automáticamente
// el dataset de respaldo con datos reales de Tuxtla Gutiérrez y cálculo Haversine en memoria.

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Cálculo de distancia geodésica mediante la fórmula de Haversine (en metros)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
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
 * Dataset de Respaldo Georreferenciado Sincronizado con 03_seed_tuxtla.sql
 */
export const BACKUP_ROUTES = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    name: 'Ruta 1 - Centro / Terán',
    description:
      'Ruta troncal poniente-oriente que conecta la delegación de Terán, UNACH Campus I, Blvd. Belisario Domínguez, Parque de la Marimba, Parque Central y Diana Cazadora.',
    color: '#2563EB',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1685, 16.7450],
        [-93.1602, 16.7535],
        [-93.1534, 16.7589],
        [-93.1410, 16.7565],
        [-93.1235, 16.7547],
        [-93.1215, 16.7538],
        [-93.1161, 16.7516],
        [-93.1065, 16.7495],
        [-93.0880, 16.7470],
        [-93.0833, 16.7455]
      ]
    },
    scheduleInfo: {
      firstRun: '05:30',
      lastRun: '22:00',
      frequencyMinutes: 8,
      estimatedWaitMinutes: 4,
      status: 'OPERATIONAL'
    },
    stops: [
      {
        id: 'b0000001-0000-0000-0000-000000000001',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Terminal Poniente - Parque Terán',
        lat: 16.7450,
        lng: -93.1685,
        stopOrder: 1,
        geometry: { type: 'Point', coordinates: [-93.1685, 16.7450] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000002',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'UNACH Campus I (Blvd. Belisario Domínguez)',
        lat: 16.7535,
        lng: -93.1602,
        stopOrder: 2,
        geometry: { type: 'Point', coordinates: [-93.1602, 16.7535] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000003',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Plaza Cristal / Parque Caña Hueca',
        lat: 16.7589,
        lng: -93.1534,
        stopOrder: 3,
        geometry: { type: 'Point', coordinates: [-93.1534, 16.7589] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000004',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Rectoría UNICACH / 15a Poniente',
        lat: 16.7565,
        lng: -93.1410,
        stopOrder: 4,
        geometry: { type: 'Point', coordinates: [-93.1410, 16.7565] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000005',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Parque de la Marimba (Av. Central y 8a Pte)',
        lat: 16.7547,
        lng: -93.1235,
        stopOrder: 5,
        geometry: { type: 'Point', coordinates: [-93.1235, 16.7547] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000006',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Parque Bicentenario (Av. Central y 2a Pte)',
        lat: 16.7538,
        lng: -93.1215,
        stopOrder: 6,
        geometry: { type: 'Point', coordinates: [-93.1215, 16.7538] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000007',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Parque Central / Catedral de San Marcos',
        lat: 16.7516,
        lng: -93.1161,
        stopOrder: 7,
        geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000008',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Parque 5 de Mayo (Av. Central y 11a Ote)',
        lat: 16.7495,
        lng: -93.1065,
        stopOrder: 8,
        geometry: { type: 'Point', coordinates: [-93.1065, 16.7495] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000009',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Polyforum Chiapas / Centro de Convenciones',
        lat: 16.7470,
        lng: -93.0880,
        stopOrder: 9,
        geometry: { type: 'Point', coordinates: [-93.0880, 16.7470] }
      },
      {
        id: 'b0000001-0000-0000-0000-000000000010',
        routeId: 'a0000001-0000-0000-0000-000000000001',
        name: 'Terminal Oriente - Fuente de la Diana Cazadora',
        lat: 16.7455,
        lng: -93.0833,
        stopOrder: 10,
        geometry: { type: 'Point', coordinates: [-93.0833, 16.7455] }
      }
    ]
  },
  {
    id: 'a0000002-0000-0000-0000-000000000002',
    name: 'Ruta 2 - Sur / Poniente',
    description:
      'Ruta transversal que enlaza el Libramiento Sur Poniente, Mercado de los Ancianos, Parque Central, Calzada de los Hombres Ilustres y la zona norte hacia el Cañón del Sumidero.',
    color: '#10B981',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-93.1450, 16.7320],
        [-93.1280, 16.7350],
        [-93.1125, 16.7410],
        [-93.1145, 16.7475],
        [-93.1161, 16.7516],
        [-93.1120, 16.7600],
        [-93.1050, 16.7720],
        [-93.0980, 16.7840]
      ]
    },
    scheduleInfo: {
      firstRun: '06:00',
      lastRun: '21:30',
      frequencyMinutes: 10,
      estimatedWaitMinutes: 5,
      status: 'OPERATIONAL'
    },
    stops: [
      {
        id: 'b0000002-0000-0000-0000-000000000001',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Terminal Sur - Libramiento Sur Poniente',
        lat: 16.7320,
        lng: -93.1450,
        stopOrder: 1,
        geometry: { type: 'Point', coordinates: [-93.1450, 16.7320] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000002',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Paso a Desnivel San José / Libramiento',
        lat: 16.7350,
        lng: -93.1280,
        stopOrder: 2,
        geometry: { type: 'Point', coordinates: [-93.1280, 16.7350] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000003',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Mercado de los Ancianos (9a Sur y Calle Central)',
        lat: 16.7410,
        lng: -93.1125,
        stopOrder: 3,
        geometry: { type: 'Point', coordinates: [-93.1125, 16.7410] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000004',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Calle Central Sur y 4a Sur',
        lat: 16.7475,
        lng: -93.1145,
        stopOrder: 4,
        geometry: { type: 'Point', coordinates: [-93.1145, 16.7475] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000005',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Parque Central / Palacio de Gobierno (Calle Central)',
        lat: 16.7516,
        lng: -93.1161,
        stopOrder: 5,
        geometry: { type: 'Point', coordinates: [-93.1161, 16.7516] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000006',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Teatro de la Ciudad / Calzada Hombres Ilustres',
        lat: 16.7600,
        lng: -93.1120,
        stopOrder: 6,
        geometry: { type: 'Point', coordinates: [-93.1120, 16.7600] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000007',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Distribuidor Vial Norte / Calzada al Sumidero',
        lat: 16.7720,
        lng: -93.1050,
        stopOrder: 7,
        geometry: { type: 'Point', coordinates: [-93.1050, 16.7720] }
      },
      {
        id: 'b0000002-0000-0000-0000-000000000008',
        routeId: 'a0000002-0000-0000-0000-000000000002',
        name: 'Terminal Norte - Albania Alta / Acceso Sumidero',
        lat: 16.7840,
        lng: -93.0980,
        stopOrder: 8,
        geometry: { type: 'Point', coordinates: [-93.0980, 16.7840] }
      }
    ]
  }
];

export const apiClient = {
  /**
   * Obtiene la lista completa de rutas con su trazado y paradas
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
      console.warn('[Tuxtla-Rutas API] Backend no disponible. Activando modo Demo / Offline:', err.message);
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
      // Intentar primero con el endpoint /api/stops/nearest
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

      // Algoritmo de proximidad Haversine en memoria sobre todas las paradas del dataset de respaldo
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

      // Ordenar por distancia ascendente y limitar
      allStops.sort((a, b) => a.distanceMeters - b.distanceMeters);
      const sliced = allStops.slice(0, limit);

      // Enriquecer con tiempo de caminata y próximo colectivo
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

  // Métodos de compatibilidad con código anterior
  async getRoutes() {
    const res = await this.fetchRoutes();
    return res;
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
