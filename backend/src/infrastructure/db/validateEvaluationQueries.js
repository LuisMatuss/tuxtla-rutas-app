// Script de Inspección de Esquema Real (information_schema.columns) y Validación de las 7 Consultas Evaluativas
// Conecta a PostgreSQL local (localhost:5432, db: tuxtla_rutas_db, user: postgres, password: Admin123)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { dbConfig } from './postgresPool.js';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_FILE_PATH = path.resolve(__dirname, '../../../../consultas_evaluacion.sql');

async function validateAll() {
  const client = new Client({
    host: dbConfig.host || 'localhost',
    port: Number(dbConfig.port) || 5432,
    user: dbConfig.user || 'postgres',
    password: dbConfig.password || 'Admin123',
    database: dbConfig.database || 'tuxtla_rutas_db'
  });

  await client.connect();
  console.log('===================================================================');
  console.log('1. INSPECCION REAL DE information_schema.columns EN tuxtla_rutas_db');
  console.log('===================================================================');

  const schemaQuery = `
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('routes', 'stops', 'incidents', 'users', 'telemetry_logs')
    ORDER BY table_name ASC, ordinal_position ASC;
  `;

  const schemaRes = await client.query(schemaQuery);
  const byTable = {};
  for (const row of schemaRes.rows) {
    if (!byTable[row.table_name]) byTable[row.table_name] = [];
    byTable[row.table_name].push(`${row.column_name} (${row.data_type})`);
  }

  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`\nTabla [${table}] (${cols.length} columnas):`);
    console.log('  -> ' + cols.join(', '));
  }

  console.log('\n===================================================================');
  console.log('2. EJECUCION Y VALIDACION DE LAS 7 CONSULTAS (consultas_evaluacion.sql)');
  console.log('===================================================================');

  const rawSql = fs.readFileSync(SQL_FILE_PATH, 'utf8');
  const statements = rawSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /SELECT/i.test(s));

  let errorsCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const topicMatch = stmt.match(/--\s*(TEMA\s+\d+:[^\r\n]+)/i);
    const topicTitle = topicMatch ? topicMatch[1] : `Consulta ${i + 1}`;

    try {
      const res = await client.query(stmt);
      console.log(`\n[OK] ${topicTitle}`);
      console.log(`     Filas retornadas: ${res.rowCount} | Errores SQL: 0`);
      console.log('     Muestra fila 1:', JSON.stringify(res.rows[0]));
    } catch (err) {
      errorsCount++;
      console.error(`\n[ERROR] ${topicTitle}:`, err.message);
    }
  }

  console.log('\n===================================================================');
  console.log(`RESUMEN FINAL: ${statements.length} consultas ejecutadas | ${errorsCount} errores SQL`);
  console.log('===================================================================');

  await client.end();
  if (errorsCount > 0) {
    process.exit(1);
  }
}

validateAll().catch((err) => {
  console.error('[Error Fatal Validación SQL]:', err);
  process.exit(1);
});

