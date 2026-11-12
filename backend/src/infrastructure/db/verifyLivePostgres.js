// Script de Prueba de Fuego Automatizada (Paso 4):
// 1. Reinicia el servidor backend en el puerto 3000 para garantizar que cargue PostgresRouteRepository actualizado
// 2. Realiza GET http://localhost:3000/api/routes y captura el resultado inicial desde PostgreSQL
// 3. Ejecuta directamente en PostgreSQL: UPDATE routes SET name = 'Ruta 1 - VERIFICADO EN PGADMIN' WHERE id = 'r-001';
// 4. Vuelve a consultar GET http://localhost:3000/api/routes y demuestra en consola que cambió a 'Ruta 1 - VERIFICADO EN PGADMIN'
// 5. Restaura el nombre a 'Ruta 1' con otro UPDATE y confirma la respuesta de GET http://localhost:3000/api/routes.

import { execSync, spawn } from 'child_process';
import pg from 'pg';
import { dbConfig, pool } from './postgresPool.js';

const { Client } = pg;
const API_URL = 'http://localhost:3000/api/routes';

function stopPreviousServerOnPort3000() {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = out.split(/\r?\n/);
    const pids = new Set();
    for (const line of lines) {
      if (line.includes(':3000 ') && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (pid && pid !== process.pid) {
          pids.add(pid);
        }
      }
    }
    for (const pid of pids) {
      try {
        process.kill(pid);
        console.log(`[Backend Restart] Proceso anterior en puerto 3000 detenido (PID ${pid}).`);
      } catch {}
    }
  } catch {}
}

async function fetchRouteR001() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${API_URL} respondió HTTP ${res.status}: ${body}`);
  }
  const json = await res.json();
  const r001 = (json.data || []).find((r) => r.id === 'r-001') || (json.data || [])[0];
  return { count: json.count, r001 };
}

async function runLiveProof() {
  stopPreviousServerOnPort3000();
  await new Promise((resolve) => setTimeout(resolve, 600));

  const serverModule = await import('../server.js');
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const client = new Client({
    host: dbConfig.host || 'localhost',
    port: Number(dbConfig.port) || 5432,
    user: dbConfig.user || 'postgres',
    password: dbConfig.password || 'Admin123',
    database: dbConfig.database || 'tuxtla_rutas_db'
  });

  await client.connect();

  try {
    console.log('\n=== 1. CONSULTA INICIAL GET http://localhost:3000/api/routes ===');
    const initial = await fetchRouteR001();
    console.log('Total rutas en PostgreSQL:', initial.count);
    console.log('Registro r-001 inicial:', {
      id: initial.r001?.id,
      name: initial.r001?.name,
      stopsCount: initial.r001?.stops?.length
    });

    console.log(
      "\n=== 2. EJECUTANDO EN POSTGRESQL: UPDATE routes SET name = 'Ruta 1 - VERIFICADO EN PGADMIN' WHERE id = 'r-001'; ==="
    );
    await client.query(
      "UPDATE routes SET name = 'Ruta 1 - VERIFICADO EN PGADMIN' WHERE id = 'r-001';"
    );

    console.log('\n=== 3. CONSULTA EN VIVO TRAS UPDATE GET http://localhost:3000/api/routes ===');
    const updated = await fetchRouteR001();
    console.log('Registro r-001 modificado:', {
      id: updated.r001?.id,
      name: updated.r001?.name,
      stopsCount: updated.r001?.stops?.length
    });

    console.log(
      "\n=== 4. RESTAURACIÓN EN POSTGRESQL: UPDATE routes SET name = 'Ruta 1' WHERE id = 'r-001'; ==="
    );
    await client.query("UPDATE routes SET name = 'Ruta 1' WHERE id = 'r-001';");

    const restored = await fetchRouteR001();
    console.log('Registro r-001 restaurado:', {
      id: restored.r001?.id,
      name: restored.r001?.name,
      stopsCount: restored.r001?.stops?.length
    });
  } finally {
    await client.end();
    if (serverModule.httpServer) {
      await new Promise((resolve) => serverModule.httpServer.close(resolve));
    }
    await pool.end().catch(() => {});

    // Dejar el servidor backend corriendo en segundo plano en el puerto 3000 con el código nuevo
    const child = spawn(process.execPath, ['backend/src/infrastructure/server.js'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    console.log('\n[Backend Activo] Servidor backend reiniciado y activo en http://localhost:3000 conectado a tuxtla_rutas_db.');
  }
}

runLiveProof()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Prueba de Fuego Error]:', err);
    process.exit(1);
  });
