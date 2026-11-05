// Emblema Oficial Tuxtla Rutas (Estilo Rubber Hose Colectivo Ruta 108 + Respaldo Vectorial de Alta Precisión)
// Intenta cargar /logo-tuxtla-rutas.png si existe físicamente; de lo contrario renderiza el emblema SVG oficial trazado con curvas vectoriales <path>.

import React, { useState, useEffect } from 'react';

let cachedCustomLogoStatus = null; // null | boolean

function arcCircle(cx, cy, r) {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

function arcEllipse(cx, cy, rx, ry) {
  return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;
}

function roundedBox(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  if (rad <= 0) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
  }
  return [
    `M ${x + rad} ${y}`,
    `H ${x + w - rad}`,
    `Q ${x + w} ${y} ${x + w} ${y + rad}`,
    `V ${y + h - rad}`,
    `Q ${x + w} ${y + h} ${x + w - rad} ${y + h}`,
    `H ${x + rad}`,
    `Q ${x} ${y + h} ${x} ${y + h - rad}`,
    `V ${y + rad}`,
    `Q ${x} ${y} ${x + rad} ${y}`,
    'Z'
  ].join(' ');
}

export function BrandLogo({ size = 42, alt = 'Emblema Tuxtla Rutas', style = {} }) {
  const [hasCustomPng, setHasCustomPng] = useState(cachedCustomLogoStatus === true);
  const isDetailed = size >= 110;
  const clipId = React.useId();

  useEffect(() => {
    if (cachedCustomLogoStatus !== null) {
      setHasCustomPng(cachedCustomLogoStatus);
      return;
    }

    let active = true;
    fetch('/logo-tuxtla-rutas.png', { method: 'HEAD' })
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        const exists = res.ok && contentType.toLowerCase().startsWith('image/');
        cachedCustomLogoStatus = exists;
        if (active) setHasCustomPng(exists);
      })
      .catch(() => {
        cachedCustomLogoStatus = false;
        if (active) setHasCustomPng(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (hasCustomPng) {
    return (
      <img
        src="/logo-tuxtla-rutas.png"
        alt={alt}
        width={size}
        height={size}
        onError={() => {
          cachedCustomLogoStatus = false;
          setHasCustomPng(false);
        }}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
          ...style
        }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      role="img"
      aria-label={alt}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'block',
        flexShrink: 0,
        overflow: 'visible',
        ...style
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={arcCircle(160, 154, 134)} />
        </clipPath>
      </defs>

      {/* Sombra sólida estilo tinta clásica bajo el medallón */}
      <path d={arcCircle(160, 160, 142)} fill="#18181B" opacity="0.42" />

      {/* Medallón exterior de tinta negra y aro crema */}
      <path d={arcCircle(160, 154, 142)} fill="#FFFBEB" stroke="#18181B" strokeWidth="7" />
      <path d={arcCircle(160, 154, 134)} fill="#29ABE2" stroke="#18181B" strokeWidth="5" />

      {/* Interior cartográfico recortado al círculo */}
      <g clipPath={`url(#${clipId})`}>
        {/* Brillo superior azul cielo */}
        <path d={arcEllipse(146, 84, 122, 62)} fill="#38BDF8" opacity="0.55" />

        {/* Trazos punteados de mapa urbano de Tuxtla */}
        <path
          d="M 22 132 Q 86 78 158 114 T 298 92"
          fill="none"
          stroke="#FFFBEB"
          strokeWidth="4"
          strokeDasharray="8 7"
          strokeLinecap="round"
          opacity="0.88"
        />
        <path
          d="M 34 198 Q 108 168 182 192 T 302 164"
          fill="none"
          stroke="#E0F2FE"
          strokeWidth="3.5"
          strokeDasharray="6 7"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path d={arcCircle(62, 109, 5.5)} fill="#FFFBEB" stroke="#18181B" strokeWidth="2.8" />
        <path d={arcCircle(152, 111, 5.5)} fill="#FDE047" stroke="#18181B" strokeWidth="2.8" />

        {/* Nubes estilo Rubber Hose años 30 */}
        <g fill="#FFFBEB" stroke="#18181B" strokeWidth="4" strokeLinejoin="round">
          <path d="M 44 82 C 44 71 55 64 65 68 C 71 58 87 59 92 70 C 101 70 106 78 103 85 C 102 89 96 90 90 90 L 50 90 C 45 90 43 86 44 82 Z" />
          <path d="M 140 56 C 140 48 148 43 156 46 C 161 39 173 40 177 48 C 184 48 188 54 185 60 L 144 60 C 141 60 139 58 140 56 Z" />
        </g>

        {/* Asfalto curvo en la base del medallón */}
        <path d={arcEllipse(160, 256, 146, 52)} fill="#1E293B" stroke="#18181B" strokeWidth="5" />
        <path
          d="M 52 246 Q 160 228 268 246"
          fill="none"
          stroke="#FDE047"
          strokeWidth="4"
          strokeDasharray="12 10"
          strokeLinecap="round"
        />
      </g>

      {/* Pin GPS Rojo Sonriente estilo Rubber Hose (Derecha Superior) */}
      <g transform="translate(232, 92) rotate(9)">
        <path
          d="M 0 -46 C -25 -46 -44 -27 -44 -3 C -44 24 0 58 0 58 C 0 58 44 24 44 -3 C 44 -27 25 -46 0 -46 Z"
          fill="#EF4444"
          stroke="#18181B"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        {/* Reflejo brillante del pin */}
        <path
          d="M -27 -18 C -24 -30 -14 -37 -4 -38"
          fill="none"
          stroke="#FCA5A5"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Rostro crema con ojos pie-cut clásicos */}
        <path d={arcCircle(0, -5, 24)} fill="#FFFBEB" stroke="#18181B" strokeWidth="4.5" />
        {/* Ojo izquierdo pie-cut */}
        <path d={arcEllipse(-8, -10, 4.5, 6.5)} fill="#18181B" />
        <path d="M -8 -10 L -2 -13 L -2 -8 Z" fill="#FFFBEB" />
        {/* Ojo derecho pie-cut */}
        <path d={arcEllipse(8, -10, 4.5, 6.5)} fill="#18181B" />
        <path d="M 8 -10 L 14 -13 L 14 -8 Z" fill="#FFFBEB" />
        {/* Sonrisa alegre */}
        <path
          d="M -11 2 Q 0 13 11 2"
          fill="none"
          stroke="#18181B"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path d="M -13 0 Q -10 2 -9 4" fill="none" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M 13 0 Q 10 2 9 4" fill="none" stroke="#18181B" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      {/* Combi Colectiva Tuxtla Ruta 108 Centro (Color Crema + Franjas Verde y Naranja) */}
      <g transform="translate(0, -2)">
        {/* Sombra proyectada sobre el asfalto */}
        <path d={arcEllipse(146, 233, 88, 13)} fill="#0F172A" opacity="0.65" />

        {/* Copete / Letrero luminoso superior RUTA 108 CENTRO */}
        <path
          d={roundedBox(86, 96, 120, 24, 8)}
          fill="#FDE68A"
          stroke="#18181B"
          strokeWidth="5.5"
        />
        {isDetailed && (
          <text
            x="146"
            y="112.5"
            textAnchor="middle"
            fill="#18181B"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.02em'
            }}
          >
            RUTA 108 CENTRO
          </text>
        )}

        {/* Espejos retrovisores clásicos */}
        <path d="M 56 146 L 44 142 L 44 158 L 56 155" fill="#FFFBEB" stroke="#18181B" strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M 236 146 L 246 142 L 246 158 L 236 155" fill="#FFFBEB" stroke="#18181B" strokeWidth="4.5" strokeLinejoin="round" />

        {/* Carrocería principal en crema cálido con contorno grueso de tinta */}
        <path
          d={roundedBox(56, 116, 180, 104, 26)}
          fill="#FFFBEB"
          stroke="#18181B"
          strokeWidth="6.5"
        />

        {/* Sombreado inferior crema cálido */}
        <path
          d="M 60 194 L 232 194 C 232 208 222 217 208 217 L 84 217 C 70 217 60 208 60 194 Z"
          fill="#FEF3C7"
        />

        {/* Franja Verde Colectivo (#0D9468) */}
        <path
          d={roundedBox(59, 174, 174, 12, 0)}
          fill="#0D9468"
          stroke="#18181B"
          strokeWidth="3.5"
        />

        {/* Franja Naranja Tuxtla (#F97316) */}
        <path
          d={roundedBox(59, 186, 174, 11, 0)}
          fill="#F97316"
          stroke="#18181B"
          strokeWidth="3.5"
        />

        {/* Parabrisas panorámico dividido con ceja expresiva Rubber Hose */}
        <path
          d={roundedBox(70, 128, 71, 38, 10)}
          fill="#BAE6FD"
          stroke="#18181B"
          strokeWidth="5"
        />
        <path
          d={roundedBox(151, 128, 71, 38, 10)}
          fill="#BAE6FD"
          stroke="#18181B"
          strokeWidth="5"
        />

        {/* Ojos amistosos en el parabrisas estilo Rubber Hose */}
        <path d={arcEllipse(114, 148, 5.5, 8)} fill="#18181B" />
        <path d="M 114 148 L 121 144 L 121 150 Z" fill="#BAE6FD" />
        <path d={arcEllipse(178, 148, 5.5, 8)} fill="#18181B" />
        <path d="M 178 148 L 185 144 L 185 150 Z" fill="#BAE6FD" />

        {/* Brillos diagonales de cristal */}
        <path d="M 80 156 L 94 136" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M 198 156 L 212 136" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Faros redondos amarillos y parrilla sonriente */}
        <path d={arcCircle(80, 204, 9.5)} fill="#FDE047" stroke="#18181B" strokeWidth="4.5" />
        <path d={arcCircle(78, 201, 3)} fill="#FFFBEB" />
        <path d={arcCircle(212, 204, 9.5)} fill="#FDE047" stroke="#18181B" strokeWidth="4.5" />
        <path d={arcCircle(210, 201, 3)} fill="#FFFBEB" />

        {/* Sonrisa cromada en parrilla frontal */}
        <path
          d="M 122 202 Q 146 213 170 202"
          fill="none"
          stroke="#18181B"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Defensa frontal cromada */}
        <path
          d={roundedBox(50, 213, 192, 12, 6)}
          fill="#E2E8F0"
          stroke="#18181B"
          strokeWidth="5"
        />

        {/* Llantas cara blanca estilo Rubber Hose */}
        <g>
          <path d={arcCircle(92, 227, 19)} fill="#18181B" />
          <path d={arcCircle(92, 227, 10)} fill="#FFFBEB" stroke="#18181B" strokeWidth="3" />
          <path d={arcCircle(92, 227, 4)} fill="#F59E0B" />

          <path d={arcCircle(200, 227, 19)} fill="#18181B" />
          <path d={arcCircle(200, 227, 10)} fill="#FFFBEB" stroke="#18181B" strokeWidth="3" />
          <path d={arcCircle(200, 227, 4)} fill="#F59E0B" />
        </g>
      </g>

      {/* Placa Inferior "TUXTLA RUTAS" en Ámbar (#F59E0B) con Contorno de Tinta (#18181B) */}
      {isDetailed && (
        <g transform="translate(0, 6)">
          {/* Placa de sombra sólida de tinta */}
          <path d={roundedBox(40, 255, 240, 46, 13)} fill="#18181B" />
          {/* Cuerpo ámbar principal */}
          <path
            d={roundedBox(40, 249, 240, 46, 13)}
            fill="#F59E0B"
            stroke="#18181B"
            strokeWidth="6"
          />
          {/* Bisel superior amarillo cálido */}
          <path
            d="M 52 255 L 268 255"
            stroke="#FDE68A"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Remaches decorativos laterales */}
          <path d={arcCircle(56, 272, 3.5)} fill="#18181B" />
          <path d={arcCircle(264, 272, 3.5)} fill="#18181B" />

          <text
            x="160"
            y="280"
            textAnchor="middle"
            fill="#18181B"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '23px',
              fontWeight: 800,
              letterSpacing: '0.03em'
            }}
          >
            TUXTLA RUTAS
          </text>
        </g>
      )}
    </svg>
  );
}
