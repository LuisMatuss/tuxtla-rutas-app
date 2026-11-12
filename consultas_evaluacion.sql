-- =============================================================================
-- PROYECTO: TUXTLA-RUTAS
-- ARCHIVO: consultas_evaluacion.sql
-- BASE DE DATOS: tuxtla_rutas_db (PostgreSQL)
-- DESCRIPCION: 7 Consultas Evaluativas validadas sobre el esquema real
--              (tablas: routes, stops, incidents, users, telemetry_logs)
-- =============================================================================

-- =============================================================================
-- TEMA 1: SELECCION (Clausula WHERE con columnas reales)
-- Obtiene las rutas en estado operativo cuya frecuencia de paso es de 7 minutos o menos.
-- =============================================================================
SELECT
    id,
    name,
    description,
    first_run,
    last_run,
    frequency_minutes,
    status
FROM routes
WHERE status = 'OPERATIONAL'
  AND frequency_minutes <= 7;

-- =============================================================================
-- TEMA 2: PROYECCION (SELECT con alias legibles en espanol)
-- Proyecta las columnas operativas de las rutas con encabezados claros para reporte.
-- =============================================================================
SELECT
    id AS "Clave de Ruta",
    name AS "Nombre Oficial de la Ruta",
    color AS "Color Identificador",
    first_run AS "Primera Corrida",
    last_run AS "Ultima Corrida",
    frequency_minutes AS "Frecuencia (Minutos)",
    status AS "Estado Operativo"
FROM routes;

-- =============================================================================
-- TEMA 3: CONDICIONALES IN Y LIKE
-- Busca paradas cuyo nombre contenga 'Parque' o 'UNACH' dentro de un grupo especifico de rutas.
-- =============================================================================
SELECT
    id AS "ID Parada",
    route_id AS "Clave Ruta",
    name AS "Nombre de Parada",
    stop_order AS "Orden de Parada"
FROM stops
WHERE route_id IN ('r-001', 'r-002', 'r-005', 'r-008', 'r-009')
  AND (name LIKE '%Parque%' OR name LIKE '%UNACH%');

-- =============================================================================
-- TEMA 4: REGLAS DE PRECEDENCIA (AND, OR y ORDER BY compuesto)
-- Evalua condiciones agrupadas con parentesis y ordena por frecuencia ascendente y nombre.
-- =============================================================================
SELECT
    id AS "Clave Ruta",
    name AS "Ruta",
    frequency_minutes AS "Frecuencia (min)",
    first_run AS "Inicio",
    last_run AS "Fin",
    status AS "Estado"
FROM routes
WHERE (name LIKE '%Centro%' OR description LIKE '%UNACH%')
  AND frequency_minutes <= 8
  AND status = 'OPERATIONAL'
ORDER BY frequency_minutes ASC, name ASC;

-- =============================================================================
-- TEMA 5: FUNCIONES (Texto, Numericas, Fecha/Hora y Estadisticas con OVER())
-- Incluye en un solo SELECT validado todas las funciones escalares y de ventana requeridas.
-- =============================================================================
SELECT
    id AS "Clave",
    -- Funciones de Texto
    LOWER(name) AS "Nombre Minusculas",
    UPPER(status) AS "Estado Mayusculas",
    INITCAP(LOWER(name)) AS "Nombre Titulo",
    CONCAT(id, ' - ', name) AS "Etiqueta Completa",
    SUBSTR(name, 1, 15) AS "Extracto Nombre",
    LENGTH(name) AS "Longitud Nombre",
    REPLACE(name, 'Ruta', 'Linea') AS "Nombre Reemplazado",
    TRIM('   ' || name || '   ') AS "Nombre Sin Espacios",
    -- Funciones Numericas (sobre frequency_minutes)
    ROUND(frequency_minutes / 2.0, 2) AS "Espera Media Redondeada",
    TRUNC(frequency_minutes / 2.0, 1) AS "Espera Media Truncada",
    MOD(frequency_minutes, 2) AS "Residuo Paridad Frecuencia",
    -- Funciones de Fecha y Hora
    CURRENT_DATE AS "Fecha Actual",
    CURRENT_TIME AS "Hora Actual",
    CURRENT_TIMESTAMP AS "Marca de Tiempo Actual",
    -- Funciones de Agregacion y Estadisticas con Ventana OVER()
    COUNT(frequency_minutes) OVER() AS "Total de Rutas",
    SUM(frequency_minutes) OVER() AS "Suma Frecuencias",
    ROUND(AVG(frequency_minutes) OVER(), 2) AS "Promedio Frecuencia",
    MIN(frequency_minutes) OVER() AS "Frecuencia Minima",
    MAX(frequency_minutes) OVER() AS "Frecuencia Maxima",
    ROUND(STDDEV(frequency_minutes) OVER(), 2) AS "Desviacion Estandar",
    ROUND(VARIANCE(frequency_minutes) OVER(), 2) AS "Varianza Frecuencia"
FROM routes
ORDER BY id ASC;

-- =============================================================================
-- TEMA 6: UNIONES (LEFT OUTER JOIN entre routes e incidents)
-- Une el catalogo de rutas con los incidentes viales usando routes.id = incidents.route_id.
-- =============================================================================
SELECT
    r.id AS "Clave Ruta",
    r.name AS "Nombre de Ruta",
    r.frequency_minutes AS "Frecuencia Base (min)",
    COALESCE(i.id, 'SIN-INCIDENTE') AS "Folio Incidente",
    COALESCE(i.type, 'OPERACION_NORMAL') AS "Tipo Contingencia",
    COALESCE(i.title, 'Sin afectaciones viales reportadas') AS "Reporte Vial",
    COALESCE(i.location_name, 'Trayecto despejado') AS "Punto de Referencia",
    COALESCE(i.delay_minutes, 0) AS "Retraso Estimado (min)",
    COALESCE(i.reported_by, 'Sistema Central') AS "Reportado Por"
FROM routes r
LEFT OUTER JOIN incidents i
    ON r.id = i.route_id
ORDER BY i.delay_minutes DESC NULLS LAST, r.id ASC;

-- =============================================================================
-- TEMA 7: SUBCONSULTAS (Subconsulta de una fila < AVG y multifila NOT IN)
-- Obtiene rutas con frecuencia menor al promedio general y sin incidentes viales registrados.
-- =============================================================================
SELECT
    r.id AS "Clave Ruta",
    r.name AS "Nombre de Ruta",
    r.frequency_minutes AS "Frecuencia (min)",
    r.first_run AS "Primera Corrida",
    r.last_run AS "Ultima Corrida",
    r.status AS "Estado"
FROM routes r
WHERE r.frequency_minutes < (
    SELECT AVG(frequency_minutes)
    FROM routes
)
AND r.id NOT IN (
    SELECT route_id
    FROM incidents
    WHERE route_id IS NOT NULL
)
ORDER BY r.frequency_minutes ASC, r.id ASC;

