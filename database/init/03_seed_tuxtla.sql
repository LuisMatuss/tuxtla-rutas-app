-- ==============================================================================
-- Proyecto: Tuxtla-Rutas
-- Archivo: 03_seed_tuxtla.sql
-- Propósito: Catálogo Maestro de las 8 Rutas Más Concurridas de Tuxtla Gutiérrez
-- Coordenadas de referencia: Tuxtla Gutiérrez, Chiapas (~16.7516, -93.1161)
--
-- NOTA TÉCNICA ESPACIAL POSTGIS (SRID 4326):
-- El orden canónico de coordenadas en PostGIS WKT y ST_MakePoint es (Longitud, Latitud) -> (X, Y)
-- Tuxtla Gutiérrez: Longitud Oeste (aprox. -93.1161) y Latitud Norte (aprox. 16.7516)
-- ==============================================================================

-- 1. Inserción de las 8 Rutas Principales
INSERT INTO routes (id, name, description, color, path_geometry)
VALUES
    (
        'a0000001-0000-0000-0000-000000000001',
        'Ruta 1 - Av. Central / UNACH / Terán',
        'Troncal Poniente-Oriente por Blvd. Belisario Domínguez, Parque de la Marimba, Parque Central y Hospital Gómez Maza.',
        '#2563EB',
        ST_GeomFromText('LINESTRING(
            -93.1685 16.7450,
            -93.1640 16.7505,
            -93.1602 16.7535,
            -93.1568 16.7565,
            -93.1534 16.7589,
            -93.1410 16.7565,
            -93.1235 16.7547,
            -93.1215 16.7538,
            -93.1161 16.7516,
            -93.1065 16.7495,
            -93.0880 16.7470,
            -93.0815 16.7450
        )', 4326)
    ),
    (
        'a0000002-0000-0000-0000-000000000002',
        'Ruta A - Circuito Av. Central / Patria Nueva',
        'Enlaza Juan Crispín, Tec de Tuxtla, Av. Central, Centro y colonias del extremo oriente como Patria Nueva.',
        '#DC2626',
        ST_GeomFromText('LINESTRING(
            -93.1750 16.7595,
            -93.1655 16.7575,
            -93.1602 16.7535,
            -93.1534 16.7589,
            -93.1295 16.7554,
            -93.1235 16.7547,
            -93.1161 16.7516,
            -93.1110 16.7505,
            -93.1065 16.7495,
            -93.0950 16.7380,
            -93.0795 16.7335
        )', 4326)
    ),
    (
        'a0000003-0000-0000-0000-000000000003',
        'Ruta 43 - Libramiento Sur (Poniente - Oriente)',
        'Corredor perimetral de alta velocidad conectando Real del Bosque, Chedraui Sur, Villaflores y Central de Abastos.',
        '#D97706',
        ST_GeomFromText('LINESTRING(
            -93.1720 16.7310,
            -93.1550 16.7315,
            -93.1420 16.7322,
            -93.1280 16.7350,
            -93.1180 16.7375,
            -93.1118 16.7368,
            -93.1020 16.7362,
            -93.0890 16.7385,
            -93.0720 16.7410
        )', 4326)
    ),
    (
        'a0000004-0000-0000-0000-000000000004',
        'Ruta 90 - Libramiento Norte (Laguitos - Torre Chiapas)',
        'Eje perimetral norte interconectando UNICACH Campus Norte, Mirador Los Amorosos, Fiscalía y Torre Chiapas.',
        '#7C3AED',
        ST_GeomFromText('LINESTRING(
            -93.1590 16.7685,
            -93.1495 16.7725,
            -93.1330 16.7695,
            -93.1155 16.7680,
            -93.0980 16.7655,
            -93.0860 16.7580,
            -93.0880 16.7470
        )', 4326)
    ),
    (
        'a0000005-0000-0000-0000-000000000005',
        'Ruta 58 - UNACH / 5a Norte / San Roque',
        'Conecta campus UNACH por la 5a Norte pasando por Parque de la Marimba, Parque Central, San Roque y Mercado de los Ancianos.',
        '#059669',
        ST_GeomFromText('LINESTRING(
            -93.1602 16.7535,
            -93.1485 16.7630,
            -93.1340 16.7605,
            -93.1235 16.7547,
            -93.1168 16.7562,
            -93.1161 16.7516,
            -93.1090 16.7465,
            -93.1125 16.7410
        )', 4326)
    ),
    (
        'a0000006-0000-0000-0000-000000000006',
        'Ruta 52 - Chapultepec / Caña Hueca / Centro',
        'Enlaza la Col. Chapultepec, Panteón Jardín y Parque Caña Hueca con el centro comercial y el Mercado Juan Sabines.',
        '#DB2777',
        ST_GeomFromText('LINESTRING(
            -93.1690 16.7655,
            -93.1585 16.7635,
            -93.1534 16.7589,
            -93.1360 16.7525,
            -93.1215 16.7538,
            -93.1161 16.7516,
            -93.1145 16.7495,
            -93.1060 16.7425
        )', 4326)
    ),
    (
        'a0000007-0000-0000-0000-000000000007',
        'Ruta 30 - Calle Central / Las Granjas / Sumidero',
        'Eje vertical que conecta el Libramiento Sur, Mercado de los Ancianos, Centro, Teatro de la Ciudad y el Cañón del Sumidero.',
        '#0891B2',
        ST_GeomFromText('LINESTRING(
            -93.1118 16.7368,
            -93.1125 16.7410,
            -93.1145 16.7475,
            -93.1161 16.7516,
            -93.1168 16.7562,
            -93.1120 16.7600,
            -93.1050 16.7720,
            -93.0980 16.7840
        )', 4326)
    ),
    (
        'a0000008-0000-0000-0000-000000000008',
        'Ruta 73 - Ingeniería UNACH / ISSSTE / Centro',
        'Enlaza la Facultad de Ingeniería de la UNACH, Hospital ISSSTE Belisario Domínguez y Parque de la Marimba con el Mercado Díaz Ordaz.',
        '#4F46E5',
        ST_GeomFromText('LINESTRING(
            -93.1640 16.7660,
            -93.1560 16.7555,
            -93.1460 16.7570,
            -93.1235 16.7547,
            -93.1200 16.7530,
            -93.1161 16.7516,
            -93.1110 16.7505,
            -93.1065 16.7495
        )', 4326)
    )
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    path_geometry = EXCLUDED.path_geometry;

-- 2. Inserción de Paradas para las 8 Rutas

-- Paradas Ruta 1
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Terminal Parque Terán', ST_GeomFromText('POINT(-93.1685 16.7450)', 4326), 1),
    ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Crucero Terán', ST_GeomFromText('POINT(-93.1640 16.7505)', 4326), 2),
    ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'UNACH Campus I', ST_GeomFromText('POINT(-93.1602 16.7535)', 4326), 3),
    ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'Jardines de Tuxtla', ST_GeomFromText('POINT(-93.1568 16.7565)', 4326), 4),
    ('b0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'Plaza Cristal / Caña Hueca', ST_GeomFromText('POINT(-93.1534 16.7589)', 4326), 5),
    ('b0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'Rectoría UNICACH / 15a Pte', ST_GeomFromText('POINT(-93.1410 16.7565)', 4326), 6),
    ('b0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'Parque de la Marimba', ST_GeomFromText('POINT(-93.1235 16.7547)', 4326), 7),
    ('b0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'Parque Bicentenario', ST_GeomFromText('POINT(-93.1215 16.7538)', 4326), 8),
    ('b0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'Parque Central / Catedral', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 9),
    ('b0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', 'Parque 5 de Mayo', ST_GeomFromText('POINT(-93.1065 16.7495)', 4326), 10),
    ('b0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000001', 'Polyforum / Torre Chiapas', ST_GeomFromText('POINT(-93.0880 16.7470)', 4326), 11),
    ('b0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000001', 'Hospital Gómez Maza / Diana Cazadora', ST_GeomFromText('POINT(-93.0815 16.7450)', 4326), 12)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta A
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Crucero Juan Crispín', ST_GeomFromText('POINT(-93.1750 16.7595)', 4326), 1),
    ('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Tecnológico de Tuxtla ITTG', ST_GeomFromText('POINT(-93.1655 16.7575)', 4326), 2),
    ('b0000002-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'UNACH Blvd. Belisario', ST_GeomFromText('POINT(-93.1602 16.7535)', 4326), 3),
    ('b0000002-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Plaza Cristal', ST_GeomFromText('POINT(-93.1534 16.7589)', 4326), 4),
    ('b0000002-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'Av. Central y 11a Pte', ST_GeomFromText('POINT(-93.1295 16.7554)', 4326), 5),
    ('b0000002-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002', 'Parque de la Marimba', ST_GeomFromText('POINT(-93.1235 16.7547)', 4326), 6),
    ('b0000002-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002', 'Parque Central', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 7),
    ('b0000002-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'Mercado Díaz Ordaz', ST_GeomFromText('POINT(-93.1110 16.7505)', 4326), 8),
    ('b0000002-0000-0000-0000-000000000009', 'a0000002-0000-0000-0000-000000000002', 'Parque 5 de Mayo', ST_GeomFromText('POINT(-93.1065 16.7495)', 4326), 9),
    ('b0000002-0000-0000-0000-000000000010', 'a0000002-0000-0000-0000-000000000002', 'Fuente Mactumatzá Ote', ST_GeomFromText('POINT(-93.0950 16.7380)', 4326), 10),
    ('b0000002-0000-0000-0000-000000000011', 'a0000002-0000-0000-0000-000000000002', 'Terminal Patria Nueva', ST_GeomFromText('POINT(-93.0795 16.7335)', 4326), 11)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 43
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000003-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'Entrada Real del Bosque / Terán Sur', ST_GeomFromText('POINT(-93.1720 16.7310)', 4326), 1),
    ('b0000003-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'Crucero Terán Sur (Conexión Ruta 1)', ST_GeomFromText('POINT(-93.1665 16.7435)', 4326), 2),
    ('b0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'Libramiento Sur y Periférico Pte', ST_GeomFromText('POINT(-93.1550 16.7315)', 4326), 3),
    ('b0000003-0000-0000-0000-000000000004', 'a0000003-0000-0000-0000-000000000003', 'Chedraui Sur / Mactumatzá', ST_GeomFromText('POINT(-93.1420 16.7322)', 4326), 4),
    ('b0000003-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000003', 'Paso a Desnivel San José', ST_GeomFromText('POINT(-93.1280 16.7350)', 4326), 5),
    ('b0000003-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'Crucero Villaflores', ST_GeomFromText('POINT(-93.1180 16.7375)', 4326), 6),
    ('b0000003-0000-0000-0000-000000000007', 'a0000003-0000-0000-0000-000000000003', 'Calle Central y Libramiento Sur', ST_GeomFromText('POINT(-93.1118 16.7368)', 4326), 7),
    ('b0000003-0000-0000-0000-000000000008', 'a0000003-0000-0000-0000-000000000003', '11a Oriente y Lib. Sur', ST_GeomFromText('POINT(-93.1020 16.7362)', 4326), 8),
    ('b0000003-0000-0000-0000-000000000009', 'a0000003-0000-0000-0000-000000000003', 'Plaza Poliforum / Libramiento', ST_GeomFromText('POINT(-93.0890 16.7385)', 4326), 9),
    ('b0000003-0000-0000-0000-000000000010', 'a0000003-0000-0000-0000-000000000003', 'Central de Abastos', ST_GeomFromText('POINT(-93.0720 16.7410)', 4326), 10)

ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 90
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000004-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'Reloj Floral / Laguitos', ST_GeomFromText('POINT(-93.1590 16.7685)', 4326), 1),
    ('b0000004-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004', 'UNICACH Ciudad Universitaria', ST_GeomFromText('POINT(-93.1495 16.7725)', 4326), 2),
    ('b0000004-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'Mirador Los Amorosos', ST_GeomFromText('POINT(-93.1330 16.7695)', 4326), 3),
    ('b0000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'Libramiento Norte y Calle Central', ST_GeomFromText('POINT(-93.1155 16.7680)', 4326), 4),
    ('b0000004-0000-0000-0000-000000000005', 'a0000004-0000-0000-0000-000000000004', 'Parque del Oriente / Fidel Velázquez', ST_GeomFromText('POINT(-93.0980 16.7655)', 4326), 5),
    ('b0000004-0000-0000-0000-000000000006', 'a0000004-0000-0000-0000-000000000004', 'Fiscalía General', ST_GeomFromText('POINT(-93.0860 16.7580)', 4326), 6),
    ('b0000004-0000-0000-0000-000000000007', 'a0000004-0000-0000-0000-000000000004', 'Torre Chiapas', ST_GeomFromText('POINT(-93.0880 16.7470)', 4326), 7)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 58
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000005-0000-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000005', 'UNACH Campus I', ST_GeomFromText('POINT(-93.1602 16.7535)', 4326), 1),
    ('b0000005-0000-0000-0000-000000000002', 'a0000005-0000-0000-0000-000000000005', 'Plaza Sol / 5a Norte', ST_GeomFromText('POINT(-93.1485 16.7630)', 4326), 2),
    ('b0000005-0000-0000-0000-000000000003', 'a0000005-0000-0000-0000-000000000005', '5a Norte y 13a Pte', ST_GeomFromText('POINT(-93.1340 16.7605)', 4326), 3),
    ('b0000005-0000-0000-0000-000000000004', 'a0000005-0000-0000-0000-000000000005', 'Parque de la Marimba', ST_GeomFromText('POINT(-93.1235 16.7547)', 4326), 4),
    ('b0000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', '5a Norte y Calle Central', ST_GeomFromText('POINT(-93.1168 16.7562)', 4326), 5),
    ('b0000005-0000-0000-0000-000000000006', 'a0000005-0000-0000-0000-000000000005', 'Parque Central', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 6),
    ('b0000005-0000-0000-0000-000000000007', 'a0000005-0000-0000-0000-000000000005', 'Barrio San Roque', ST_GeomFromText('POINT(-93.1090 16.7465)', 4326), 7),
    ('b0000005-0000-0000-0000-000000000008', 'a0000005-0000-0000-0000-000000000005', 'Mercado de los Ancianos', ST_GeomFromText('POINT(-93.1125 16.7410)', 4326), 8)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 52
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000006-0000-0000-0000-000000000001', 'a0000006-0000-0000-0000-000000000006', 'Col. Chapultepec', ST_GeomFromText('POINT(-93.1690 16.7655)', 4326), 1),
    ('b0000006-0000-0000-0000-000000000002', 'a0000006-0000-0000-0000-000000000006', 'Panteón Jardín / Laguitos', ST_GeomFromText('POINT(-93.1585 16.7635)', 4326), 2),
    ('b0000006-0000-0000-0000-000000000003', 'a0000006-0000-0000-0000-000000000006', 'Parque Caña Hueca', ST_GeomFromText('POINT(-93.1534 16.7589)', 4326), 3),
    ('b0000006-0000-0000-0000-000000000004', 'a0000006-0000-0000-0000-000000000006', '1a Sur Poniente', ST_GeomFromText('POINT(-93.1360 16.7525)', 4326), 4),
    ('b0000006-0000-0000-0000-000000000005', 'a0000006-0000-0000-0000-000000000006', 'Parque Bicentenario', ST_GeomFromText('POINT(-93.1215 16.7538)', 4326), 5),
    ('b0000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 'Parque Central', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 6),
    ('b0000006-0000-0000-0000-000000000007', 'a0000006-0000-0000-0000-000000000006', 'Mercado Juan Sabines', ST_GeomFromText('POINT(-93.1145 16.7495)', 4326), 7),
    ('b0000006-0000-0000-0000-000000000008', 'a0000006-0000-0000-0000-000000000006', '9a Sur Oriente', ST_GeomFromText('POINT(-93.1060 16.7425)', 4326), 8)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 30
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000007-0000-0000-0000-000000000001', 'a0000007-0000-0000-0000-000000000007', 'Calle Central y Libramiento Sur', ST_GeomFromText('POINT(-93.1118 16.7368)', 4326), 1),
    ('b0000007-0000-0000-0000-000000000002', 'a0000007-0000-0000-0000-000000000007', 'Mercado de los Ancianos', ST_GeomFromText('POINT(-93.1125 16.7410)', 4326), 2),
    ('b0000007-0000-0000-0000-000000000003', 'a0000007-0000-0000-0000-000000000007', '4a Sur y Calle Central', ST_GeomFromText('POINT(-93.1145 16.7475)', 4326), 3),
    ('b0000007-0000-0000-0000-000000000004', 'a0000007-0000-0000-0000-000000000007', 'Parque Central', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 4),
    ('b0000007-0000-0000-0000-000000000005', 'a0000007-0000-0000-0000-000000000007', '5a Norte y Calle Central', ST_GeomFromText('POINT(-93.1168 16.7562)', 4326), 5),
    ('b0000007-0000-0000-0000-000000000006', 'a0000007-0000-0000-0000-000000000007', 'Teatro de la Ciudad', ST_GeomFromText('POINT(-93.1120 16.7600)', 4326), 6),
    ('b0000007-0000-0000-0000-000000000007', 'a0000007-0000-0000-0000-000000000007', 'Distribuidor Vial Norte', ST_GeomFromText('POINT(-93.1050 16.7720)', 4326), 7),
    ('b0000007-0000-0000-0000-000000000008', 'a0000007-0000-0000-0000-000000000007', 'Terminal Albania Alta / Las Granjas', ST_GeomFromText('POINT(-93.0980 16.7840)', 4326), 8)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;

-- Paradas Ruta 73
INSERT INTO stops (id, route_id, name, location_geometry, stop_order)
VALUES
    ('b0000008-0000-0000-0000-000000000001', 'a0000008-0000-0000-0000-000000000008', 'Blvd. Laguitos Poniente', ST_GeomFromText('POINT(-93.1640 16.7660)', 4326), 1),
    ('b0000008-0000-0000-0000-000000000002', 'a0000008-0000-0000-0000-000000000008', 'Facultad de Ingeniería UNACH', ST_GeomFromText('POINT(-93.1560 16.7555)', 4326), 2),
    ('b0000008-0000-0000-0000-000000000003', 'a0000008-0000-0000-0000-000000000008', 'Hospital ISSSTE Belisario', ST_GeomFromText('POINT(-93.1460 16.7570)', 4326), 3),
    ('b0000008-0000-0000-0000-000000000004', 'a0000008-0000-0000-0000-000000000008', 'Parque de la Marimba', ST_GeomFromText('POINT(-93.1235 16.7547)', 4326), 4),
    ('b0000008-0000-0000-0000-000000000005', 'a0000008-0000-0000-0000-000000000008', 'Av. Central y 2a Pte', ST_GeomFromText('POINT(-93.1200 16.7530)', 4326), 5),
    ('b0000008-0000-0000-0000-000000000006', 'a0000008-0000-0000-0000-000000000008', 'Parque Central', ST_GeomFromText('POINT(-93.1161 16.7516)', 4326), 6),
    ('b0000008-0000-0000-0000-000000000007', 'a0000008-0000-0000-0000-000000000008', 'Mercado Díaz Ordaz', ST_GeomFromText('POINT(-93.1110 16.7505)', 4326), 7),
    ('b0000008-0000-0000-0000-000000000008', 'a0000008-0000-0000-0000-000000000008', 'Parque 5 de Mayo', ST_GeomFromText('POINT(-93.1065 16.7495)', 4326), 8)
ON CONFLICT (id) DO UPDATE 
SET route_id = EXCLUDED.route_id,
    name = EXCLUDED.name,
    location_geometry = EXCLUDED.location_geometry,
    stop_order = EXCLUDED.stop_order;
