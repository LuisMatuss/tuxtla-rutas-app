// Entidad de Dominio: Representa una Ruta troncal o ramal de transporte público
// Regla Arquitectónica: Modelo de negocio puro sin dependencias de infraestructura ni base de datos.

export class Route {
  /**
   * @param {Object} params
   * @param {string} params.id - Identificador único de la ruta (UUID)
   * @param {string} params.name - Nombre de la ruta (ej. "Ruta 1 - Centro / Terán")
   * @param {string} [params.description] - Descripción o trayecto general
   * @param {string} [params.color='#2563EB'] - Código HEX identificador para visualización en mapa
   * @param {Object} [params.geometry] - Geometría GeoJSON LineString con las coordenadas del trayecto
   * @param {Array<import('./Stop.js').Stop>} [params.stops=[]] - Lista de paradas asociadas a la ruta
   * @param {string} [params.firstRun='05:30'] - Horario de primera corrida matutina
   * @param {string} [params.lastRun='22:00'] - Horario de última corrida nocturna
   * @param {number} [params.frequencyMinutes=8] - Frecuencia de paso estimada entre unidades en minutos
   */
  constructor({
    id,
    name,
    description = '',
    color = '#2563EB',
    geometry = null,
    stops = [],
    firstRun = '05:30',
    lastRun = '22:00',
    frequencyMinutes = 8
  }) {
    if (!name || typeof name !== 'string') {
      throw new Error('El nombre de la ruta es obligatorio.');
    }

    this.id = id;
    this.name = name;
    this.description = description;
    this.color = color;
    this.geometry = geometry;
    this.stops = Array.isArray(stops) ? stops : [];
    this.firstRun = firstRun;
    this.lastRun = lastRun;
    this.frequencyMinutes = Number(frequencyMinutes) || 8;
  }

  /**
   * Propiedad calculada con la información operativa y tiempo de espera estimado
   * @returns {{ firstRun: string, lastRun: string, frequencyMinutes: number, estimatedWaitMinutes: number, status: string }}
   */
  get scheduleInfo() {
    return this.calculateScheduleInfo();
  }

  /**
   * Calcula el estado operativo actual y tiempo de espera estimado
   */
  calculateScheduleInfo() {
    // Estimación de tiempo medio de espera basada en la mitad de la frecuencia
    const estimatedWaitMinutes = Math.max(1, Math.round(this.frequencyMinutes / 2));

    return {
      firstRun: this.firstRun,
      lastRun: this.lastRun,
      frequencyMinutes: this.frequencyMinutes,
      estimatedWaitMinutes,
      status: 'OPERATIONAL'
    };
  }

  /**
   * Serialización limpia para respuestas JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      color: this.color,
      geometry: this.geometry,
      stops: this.stops.map(stop => (typeof stop.toJSON === 'function' ? stop.toJSON() : stop)),
      scheduleInfo: this.scheduleInfo
    };
  }
}
