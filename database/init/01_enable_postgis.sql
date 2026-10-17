-- ==============================================================================
-- Proyecto: Tuxtla-Rutas
-- Archivo: 01_enable_postgis.sql
-- Propósito: Inicializar extensiones espaciales y utilitarias en PostgreSQL
-- ==============================================================================

-- 1. Habilitar PostGIS para soporte de datos geoespaciales (LineString, Point, etc.)
-- y funciones de análisis espacial bajo el estándar OGC / SRID 4326 (WGS 84).
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Habilitar extensión uuid-ossp para generación de identificadores únicos universales (UUID v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
