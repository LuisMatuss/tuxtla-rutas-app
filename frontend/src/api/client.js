// Adaptador de Comunicación Frontend: Cliente HTTP para interactuar con la API hexagonal del backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  /**
   * Obtiene la lista completa de rutas
   */
  async getRoutes() {
    // Esqueleto: Invocación fetch a /routes
    const response = await fetch(`${API_BASE_URL}/routes`);
    if (!response.ok) throw new Error('Error al obtener rutas del servidor');
    return response.json();
  },

  /**
   * Encuentra la parada más cercana a unas coordenadas dadas
   * @param {number} lat
   * @param {number} lng
   * @param {number} [radius=1000]
   */
  async getNearestStop(lat, lng, radius = 1000) {
    // Esqueleto: Invocación fetch a /routes/nearest-stop
    const response = await fetch(`${API_BASE_URL}/routes/nearest-stop?lat=${lat}&lng=${lng}&radius=${radius}`);
    if (!response.ok) throw new Error('Error al consultar parada cercana');
    return response.json();
  }
};
