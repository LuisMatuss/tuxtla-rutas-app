-- ==============================================================================
-- Proyecto: Tuxtla-Rutas
-- Archivo: 02_schema.sql
-- Propósito: Definición del esquema de datos relacional y geoespacial (PostGIS)
-- Sistema de Referencia Espacial: SRID 4326 (WGS 84: Longitud [-180, 180], Latitud [-90, 90])
-- ==============================================================================

-- 1. Tabla de Rutas de Transporte Público
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    path_geometry GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Paradas de Transporte Público asociadas a las rutas
CREATE TABLE IF NOT EXISTS stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    location_geometry GEOMETRY(Point, 4326) NOT NULL,
    stop_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
);

-- ==============================================================================
-- Índices Espaciales y de Optimización
-- Los índices GiST (Generalized Search Tree) implementan árboles R en 2D,
-- optimizando operaciones espaciales como ST_DWithin, ST_Intersects y ordenación <->.
-- ==============================================================================

-- Índice GiST para el trazado vectorial de la ruta
CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST (path_geometry);

-- Índice GiST para las ubicaciones puntuales de las paradas
CREATE INDEX IF NOT EXISTS idx_stops_geom ON stops USING GIST (location_geometry);

-- Índice relacional para consultas de paradas filtradas por ruta
CREATE INDEX IF NOT EXISTS idx_stops_route_id ON stops (route_id);
