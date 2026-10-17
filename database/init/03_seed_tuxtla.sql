-- ==============================================================================
-- Proyecto: Tuxtla-Rutas
-- Archivo: 03_seed_tuxtla.sql
-- Propósito: Inserción de datos semilla con coordenadas geográficas reales
-- Coordenadas de referencia: Tuxtla Gutiérrez, Chiapas (~16.7516, -93.1161)
--
-- NOTA TÉCNICA ESPACIAL POSTGIS (SRID 4326):
-- El orden canónico de coordenadas en PostGIS WKT y ST_MakePoint es (Longitud, Latitud) -> (X, Y)
-- Tuxtla Gutiérrez: Longitud Oeste (aprox. -93.1161) y Latitud Norte (aprox. 16.7516)
-- ==============================================================================

-- 1. Inserción de Rutas Emblemáticas de Tuxtla Gutiérrez
INSERT INTO routes (id, name, description, color, path_geometry)
VALUES
    (
        'a0000001-0000-0000-0000-000000000001',
        'Ruta 1 - Centro / Terán',
        'Ruta troncal poniente-oriente que conecta la delegación de Terán, UNACH Campus I, Blvd. Belisario Domínguez, Parque de la Marimba, Parque Central y Diana Cazadora.',
        '#2563EB',
        ST_GeomFromText('LINESTRING(
            -93.1685 16.7450,
            -93.1602 16.7535,
            -93.1534 16.7589,
            -93.1410 16.7565,
            -93.1235 16.7547,
            -93.1215 16.7538,
            -93.1161 16.7516,
            -93.1065 16.7495,
            -93.0880 16.7470,
            -93.0833 16.7455
        )', 4326)
    ),
    (
        'a0000002-0000-0000-0000-000000000002',
        'Ruta 2 - Sur / Poniente',
        'Ruta transversal que enlaza el Libramiento Sur Poniente, Mercado de los Ancianos, Parque Central, Calzada de los Hombres Ilustres y la zona norte hacia el Cañón del Sumidero.',
        '#10B981',
        ST_GeomFromText('LINESTRING(
            -93.1450 16.7320,
            -93.1280 16.7350,
            -93.1125 16.7410,
            -93.1145 16.7475,
            -93.1161 16.7516,
            -93.1120 16.7600,
            -93.1050 16.7720,
            -93.0980 16.7840
        )', 4326)
    )
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    path_geometry = EXCLUDED.path_geometry;

-- 2. Inserción de Paradas para la Ruta 1 (Centro / Terán)
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Terminal Poniente - Parque Terán', ST_GeomFromText('POINT(-93.1685 16.7450)', 4326), 1),
    ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'UNACH Campus I (Blvd. Belisario Domínguez)', ST_GeomFromText('POINT(-93.1602 16.7535)', 4326), 2),
    ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'Plaza Cristal / Parque Caña Hueca', ST_GeomFromText('POINT(-93.1534 16.7589)', 4326), 3),
    ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Rectoría UNICACH / 15a Poniente', ST_GeomFromText('POINT(-93.1410 16.7565)', 4326), 4),
    ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'Parque de la Marimba (Av. Central y 8a Pte)', ST_GeomFromText('POINT(-93.1235 16.7547)', 4326), 5),
    ('b0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'Parque Bicentenario (Av. Central y 2a Pte)', ST_GeomFromText('POINT(-93.1215 16.7538)', 4326), 6),
    ('b0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'Parque Central / Catedral de San Marcos', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 7),
    ('b0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'Parque 5 de Mayo (Av. Central y 11a Ote)', ST_GeomFromText('POINT(-93.1065 16.7495)', 4326), 8),
    ('b0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'Polyforum Chiapas / Centro de Convenciones', ST_GeomFromText('POINT(-93.0880 16.7470)', 4326), 9),
    ('b0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', 'Terminal Oriente - Fuente de la Diana Cazadora', ST_GeomFromText('POINT(-93.0833 16.7455)', 4326), 10)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- 3. Inserción de Paradas para la Ruta 2 (Sur / Poniente)
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Terminal Sur - Libramiento Sur Poniente', ST_GeomFromText('POINT(-93.1450 16.7320)', 4326), 1),
    ('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Paso a Desnivel San José / Libramiento', ST_GeomFromText('POINT(-93.1280 16.7350)', 4326), 2),
    ('b0000002-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Mercado de los Ancianos (9a Sur y Calle Central)', ST_GeomFromText('POINT(-93.1125 16.7410)', 4326), 3),
    ('b0000002-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Calle Central Sur y 4a Sur', ST_GeomFromText('POINT(-93.1145 16.7475)', 4326), 4),
    ('b0000002-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'Parque Central / Palacio de Gobierno (Calle Central)', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 5),
    ('b0000002-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002', 'Teatro de la Ciudad / Calzada Hombres Ilustres', ST_GeomFromText('POINT(-93.1120 16.7600)', 4326), 6),
    ('b0000002-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002', 'Distribuidor Vial Norte / Calzada al Sumidero', ST_GeomFromText('POINT(-93.1050 16.7720)', 4326), 7),
    ('b0000002-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'Terminal Norte - Albania Alta / Acceso Sumidero', ST_GeomFromText('POINT(-93.0980 16.7840)', 4326), 8)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;
