// Value Object de Dominio: Coordenada geográfica validada e inmutable (Latitud, Longitud)
// Regla Arquitectónica: Cero dependencias externas o de infraestructura en el dominio puro.

export class GeoCoordinate {
  /**
   * @param {number|string} lat - Latitud en grados decimales (-90 a 90)
   * @param {number|string} lng - Longitud en grados decimales (-180 a 180)
   */
  constructor(lat, lng) {
    const latitude = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
    const longitude = typeof lng === 'string' ? parseFloat(lng) : Number(lng);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error(
        `Latitud geográfica inválida: "${lat}". Debe ser un número finito entre -90 y 90 grados.`
      );
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error(
        `Longitud geográfica inválida: "${lng}". Debe ser un número finito entre -180 y 180 grados.`
      );
    }

    this.lat = latitude;
    this.lng = longitude;
    this.latitude = latitude;
    this.longitude = longitude;

    Object.freeze(this);
  }

  /**
   * Retorna una representación en arreglo [longitud, latitud] compatible con estándares GeoJSON / PostGIS
   * @returns {[number, number]}
   */
  toCoordinates() {
    return [this.lng, this.lat];
  }

  /**
   * Calcula la distancia geodésica Haversine exacta en metros hacia otra coordenada
   * @param {GeoCoordinate} other
   * @returns {number}
   */
  distanceTo(other) {
    const R = 6371e3; // Radio medio de la Tierra en metros
    const φ1 = (this.lat * Math.PI) / 180;
    const φ2 = (other.lat * Math.PI) / 180;
    const Δφ = ((other.lat - this.lat) * Math.PI) / 180;
    const Δλ = ((other.lng - this.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10;
  }

  /**
   * @returns {string}
   */
  toString() {
    return `${this.lat}, ${this.lng}`;
  }
}

