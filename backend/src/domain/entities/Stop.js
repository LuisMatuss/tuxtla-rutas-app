// Entidad de Dominio: Representa una parada de transporte público de forma pura
// Regla Arquitectónica: Sin dependencias de frameworks ni librerías de infraestructura.

export class Stop {
  /**
   * @param {Object} params
   * @param {string} params.id - Identificador único de la parada (UUID)
   * @param {string} params.routeId - Identificador de la ruta a la que pertenece
   * @param {string} params.name - Nombre descriptivo de la parada
   * @param {number} params.lat - Latitud geográfica
   * @param {number} params.lng - Longitud geográfica
   * @param {Object} [params.geometry] - Geometría GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
   * @param {number} params.stopOrder - Orden secuencial de la parada dentro del trayecto de la ruta
   * @param {number} [params.distanceMeters] - Distancia calculada en metros respecto al usuario (opcional)
   * @param {string} [params.routeName] - Nombre de la ruta asociada (opcional para paradas cercanas)
   * @param {string} [params.routeColor] - Color HEX de la ruta asociada (opcional)
   * @param {number} [params.walkingTimeMinutes] - Minutos de caminata estimados (opcional)
   * @param {number} [params.nextBusMinutes] - Minutos estimados para el próximo colectivo (opcional)
   */
  constructor({
    id,
    routeId,
    name,
    lat,
    lng,
    geometry,
    stopOrder,
    distanceMeters = null,
    routeName = null,
    routeColor = null,
    walkingTimeMinutes = null,
    nextBusMinutes = null
  }) {
    if (!name || typeof name !== 'string') {
      throw new Error('El nombre de la parada es obligatorio y debe ser una cadena de texto.');
    }

    this.id = id;
    this.routeId = routeId;
    this.name = name;
    this.lat = Number(lat);
    this.lng = Number(lng);
    this.stopOrder = stopOrder !== undefined && stopOrder !== null ? Number(stopOrder) : null;
    this.geometry = geometry || {
      type: 'Point',
      coordinates: [this.lng, this.lat]
    };

    // Propiedades operativas y contextuales
    this.distanceMeters = distanceMeters !== null && distanceMeters !== undefined ? Number(distanceMeters) : null;
    this.routeName = routeName;
    this.routeColor = routeColor;
    this.walkingTimeMinutes = walkingTimeMinutes !== null && walkingTimeMinutes !== undefined ? Number(walkingTimeMinutes) : null;
    this.nextBusMinutes = nextBusMinutes !== null && nextBusMinutes !== undefined ? Number(nextBusMinutes) : null;
  }

  /**
   * Serialización limpia para respuestas JSON
   */
  toJSON() {
    return {
      id: this.id,
      routeId: this.routeId,
      name: this.name,
      lat: this.lat,
      lng: this.lng,
      stopOrder: this.stopOrder,
      geometry: this.geometry,
      ...(this.distanceMeters !== null && { distanceMeters: this.distanceMeters }),
      ...(this.routeName !== null && { routeName: this.routeName }),
      ...(this.routeColor !== null && { routeColor: this.routeColor }),
      ...(this.walkingTimeMinutes !== null && { walkingTimeMinutes: this.walkingTimeMinutes }),
      ...(this.nextBusMinutes !== null && { nextBusMinutes: this.nextBusMinutes })
    };
  }
}
