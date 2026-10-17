# Tuxtla-Rutas 🚍🗺️

Aplicación integral para la consulta de rutas, paradas y horarios del transporte público en la ciudad de **Tuxtla Gutiérrez, Chiapas**, diseñada bajo los principios de **Arquitectura Hexagonal (Ports & Adapters)**, capacidades geoespaciales avanzadas y automatizaciones IoT/telemetría.

---

## 🏛️ Arquitectura del Sistema

El backend sigue estrictamente el patrón de **Arquitectura Hexagonal**:

```
backend/src/
├── domain/                  # LÓGICA DE NEGOCIO PURA
│   ├── entities/            # Entidades ricas de dominio (Route, Stop)
│   └── value-objects/       # Objetos de valor inmutables (GeoCoordinate)
│
├── application/             # CASOS DE USO Y CONTRATOS
│   ├── ports/
│   │   ├── in/              # Driving Ports (Contratos para los casos de uso)
│   │   └── out/             # Driven Ports (Contratos para persistencia y servicios)
│   └── use-cases/           # Orquestación de lógica y reglas de negocio
│
└── infrastructure/          # DETALLES DE IMPLEMENTACIÓN Y ADAPTADORES
    ├── db/                  # Pool de conexiones (PostgreSQL / PostGIS)
    ├── repositories/        # Implementación de adaptadores de salida (PostgresRouteRepository)
    └── web/                 # Adaptadores de entrada HTTP (Express Controllers, Routes)
```

### Reglas de Dependencia
1. **El Dominio no conoce nada del exterior**: No importa Express, `pg`, ni librerías de infraestructura.
2. **La Aplicación depende solo del Dominio y define Puertos**: Los casos de uso interactúan con persistencia exclusivamente a través de interfaces (`ports/out`).
3. **La Infraestructura implementa los Puertos**: Adaptadores secundarios implementan interfaces de salida; adaptadores primarios (Express) invocan casos de uso vía inyección de dependencias.

---

## 🚀 Pila Tecnológica

- **Base de Datos Espacial**: PostgreSQL 16 + PostGIS (geometrías `Point` y `LineString` SRID 4326).
- **Backend**: Node.js (ES Modules), Express.
- **Frontend**: React 18 / Vite, Leaflet / React-Leaflet, CSS Modules / Vanilla CSS.
- **Automatización & IoT**:
  - **n8n**: Orquestador de flujos para integración con bots de mensajería (Telegram).
  - **Node-RED**: Simulador de telemetría y emisión de coordenadas en tiempo real.
- **Contenedores**: Docker Compose.

---

## 🛠️ Puesta en Marcha

### 1. Requisitos Previos
- Docker y Docker Compose
- Node.js >= 18.x
- npm o pnpm

### 2. Infraestructura con Docker
```bash
docker-compose up -d
```
Servicios disponibles:
- **PostgreSQL / PostGIS**: `localhost:5432`
- **n8n**: `http://localhost:5678`
- **Node-RED**: `http://localhost:1880`

### 3. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Acceder en el navegador a `http://localhost:5173`.
