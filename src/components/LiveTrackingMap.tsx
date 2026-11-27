import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoCoord,
  geocodeBrazilCityAsync,
  getControlPointForRoute,
  getQuadraticBezierPoint,
  haversineKm,
  projectLatLngToSvg,
  resolveBrazilLocationSync,
} from '../services/brazilGeo';
import { TRACKING_STAGE_LABELS } from '../services/firestoreStore';

interface LiveTrackingMapProps {
  originCityState: string;
  destinationCityState: string;
  currentLocation?: string;
  routeProgress: number;
  statusStep: number;
  trackingCode?: string;
  shippingLabel?: string;
  createdAtLabel?: string;
  updatedAtLabel?: string;
  compact?: boolean;
}

const BRAZIL_OUTLINE_PATH =
  'M 218 54 L 256 46 L 288 74 L 326 86 L 372 110 L 424 128 L 478 148 L 516 176 L 518 206 L 496 244 L 474 286 L 464 328 L 434 366 L 382 390 L 348 424 L 318 468 L 288 504 L 256 472 L 266 436 L 244 404 L 222 362 L 194 334 L 180 296 L 146 270 L 96 248 L 58 222 L 50 186 L 78 148 L 116 106 L 154 88 L 194 64 Z';

// Subtle macro-region borders inside Brazil for high-realism map silhouette
const BRAZIL_REGION_DIVIDERS = [
  'M 118 148 Q 195 168 258 178 Q 318 182 364 134',
  'M 258 178 Q 272 252 292 318 Q 332 332 398 312',
  'M 292 318 Q 282 372 262 406 L 344 416',
  'M 364 134 Q 382 224 446 268',
];

const BRAZIL_HUBS: Array<{ label: string; lat: number; lng: number }> = [
  { label: 'MANAUS', lat: -3.11, lng: -60.02 },
  { label: 'FORTALEZA', lat: -3.73, lng: -38.52 },
  { label: 'RECIFE', lat: -8.04, lng: -34.87 },
  { label: 'SALVADOR', lat: -12.97, lng: -38.5 },
  { label: 'BRASÍLIA', lat: -15.79, lng: -47.88 },
  { label: 'BELO HORIZONTE', lat: -19.91, lng: -43.93 },
  { label: 'RIO', lat: -22.9, lng: -43.17 },
  { label: 'SÃO PAULO', lat: -23.55, lng: -46.63 },
  { label: 'CURITIBA', lat: -25.43, lng: -49.27 },
  { label: 'PORTO ALEGRE', lat: -30.03, lng: -51.21 },
];

const ROUTE_MILESTONES = [...TRACKING_STAGE_LABELS];

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  originCityState,
  destinationCityState,
  currentLocation,
  routeProgress,
  statusStep,
  trackingCode,
  shippingLabel,
  createdAtLabel,
  updatedAtLabel,
  compact = false,
}) => {
  const safeProgress = Math.min(100, Math.max(0, Number(routeProgress) || 0));

  const [originCoord, setOriginCoord] = useState<GeoCoord>(() =>
    resolveBrazilLocationSync(originCityState, 'Curitiba - PR')
  );
  const [destCoord, setDestCoord] = useState<GeoCoord>(() =>
    resolveBrazilLocationSync(destinationCityState, 'São Paulo - SP')
  );
  const [animatedProgress, setAnimatedProgress] = useState<number>(safeProgress);
  const animRef = useRef<number | null>(null);
  const currentAnimatedRef = useRef<number>(safeProgress);

  useEffect(() => {
    let active = true;
    const syncFallback = resolveBrazilLocationSync(originCityState, 'Curitiba - PR');
    setOriginCoord(syncFallback);
    geocodeBrazilCityAsync(originCityState).then((geo) => {
      if (active && geo) setOriginCoord(geo);
    });
    return () => {
      active = false;
    };
  }, [originCityState]);

  useEffect(() => {
    let active = true;
    const syncFallback = resolveBrazilLocationSync(destinationCityState, 'São Paulo - SP');
    setDestCoord(syncFallback);
    geocodeBrazilCityAsync(destinationCityState).then((geo) => {
      if (active && geo) setDestCoord(geo);
    });
    return () => {
      active = false;
    };
  }, [destinationCityState]);

  // Smooth truck animation whenever routeProgress changes (real-time admin slider or Firestore snapshot)
  useEffect(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }
    const startVal = currentAnimatedRef.current;
    const targetVal = safeProgress;
    if (Math.abs(targetVal - startVal) < 0.2) {
      currentAnimatedRef.current = targetVal;
      setAnimatedProgress(targetVal);
      return;
    }

    const startTime = performance.now();
    const duration = 680;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = startVal + (targetVal - startVal) * eased;
      currentAnimatedRef.current = next;
      setAnimatedProgress(next);
      if (elapsed < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [safeProgress]);

  const geometry = useMemo(() => {
    const p0 = projectLatLngToSvg(originCoord.lat, originCoord.lng);
    const p2 = projectLatLngToSvg(destCoord.lat, destCoord.lng);
    const p1 = getControlPointForRoute(p0, p2);
    const t = Math.min(1, Math.max(0, animatedProgress / 100));
    const truck = getQuadraticBezierPoint(p0, p1, p2, t);
    const hubMid = getQuadraticBezierPoint(p0, p1, p2, 0.5);

    const steps = 32;
    const traveledPts: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const pt = getQuadraticBezierPoint(p0, p1, p2, (i / steps) * t);
      traveledPts.push(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    }

    const totalKm = haversineKm(originCoord, destCoord);
    const remainingKm = Math.max(0, Math.round(totalKm * (1 - t)));

    // Keep origin & destination callout boxes separated if cities are geographically close
    const closeY = Math.abs(p2.y - p0.y) < 38 && Math.abs(p2.x - p0.x) < 120;
    const originLabelOffsetY = closeY ? 22 : p0.y > 450 ? -22 : 20;
    const destLabelOffsetY = closeY ? -24 : p2.y < 60 ? 22 : -22;

    return {
      p0,
      p1,
      p2,
      hubMid,
      truck,
      traveledPolyline: traveledPts.join(' '),
      fullCurvePath: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${p1.x.toFixed(1)} ${p1.y.toFixed(
        1
      )} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
      totalKm,
      remainingKm,
      originLabelOffsetY,
      destLabelOffsetY,
    };
  }, [originCoord, destCoord, animatedProgress]);

  const truckFacingLeft = geometry.p2.x < geometry.p0.x;
  const activeLocationText =
    currentLocation?.trim() ||
    (safeProgress >= 100 ? destinationCityState : originCityState) ||
    'Em trânsito';

  const carrierCheckpoints = useMemo(() => {
    const origin = originCityState || 'Curitiba - PR';
    const dest = destinationCityState || 'Destino';
    const curr = activeLocationText;
    const tsUpdate = updatedAtLabel || createdAtLabel || 'Atualizado recentemente';
    const tsCreate = createdAtLabel || tsUpdate;

    const events: Array<{
      step: number;
      title: string;
      place: string;
      time: string;
      current: boolean;
    }> = [
      {
        step: 0,
        title: 'Pedido criado e registrado na central',
        place: `Central de Pedidos Brasil Tech · ${origin}`,
        time: tsCreate,
        current: statusStep === 0,
      },
      {
        step: 1,
        title: 'Pedido em andamento — conferência técnica, NF-e (DANFE) e lacre',
        place: `Unidade de Expedição & Fiscal · ${origin}`,
        time: statusStep === 1 ? tsUpdate : tsCreate,
        current: statusStep === 1,
      },
      {
        step: 2,
        title: 'Pedido em logística — em transferência para a base de destino',
        place: statusStep === 2 ? curr : `Em rota rodoviária/aérea · ${origin} ➔ ${dest}`,
        time: tsUpdate,
        current: statusStep === 2,
      },
      {
        step: 3,
        title: 'Saiu para entrega ao destinatário',
        place: statusStep === 3 ? curr : `Base de Distribuição Local · ${dest}`,
        time: tsUpdate,
        current: statusStep === 3,
      },
      {
        step: 4,
        title: 'Entregue ao destinatário com protocolo assinado',
        place: `Entregue em ${dest}`,
        time: tsUpdate,
        current: statusStep === 4,
      },
    ];

    return events.filter((ev) => ev.step <= statusStep).reverse();
  }, [originCityState, destinationCityState, activeLocationText, statusStep, updatedAtLabel, createdAtLabel]);

  return (
    <div className={`live-map-card ${compact ? 'compact' : ''}`}>
      <div className="live-map-header">
        <div className="live-map-badge-row">
          <span className="live-pulse-badge">
            <span className="live-pulse-dot" />
            ROTA EM TEMPO REAL
          </span>
          {trackingCode && <span className="live-map-code">{trackingCode}</span>}
          {shippingLabel && !compact && (
            <span className="live-map-carrier-tag">{shippingLabel}</span>
          )}
        </div>
        <div className="live-map-route-summary">
          <strong>{originCityState || 'Curitiba - PR'}</strong>
          <span className="live-route-arrow">➔</span>
          <strong>{destinationCityState || 'Destino'}</strong>
        </div>
      </div>

      <div className="live-map-stats-strip">
        <div className="live-stat-item">
          <span className="live-stat-label">Localização Atual</span>
          <strong className="live-stat-value">{activeLocationText}</strong>
        </div>
        <div className="live-stat-item">
          <span className="live-stat-label">Progresso da Rota</span>
          <strong className="live-stat-value tabular-nums">
            {Math.round(animatedProgress)}% concluído
          </strong>
        </div>
        <div className="live-stat-item">
          <span className="live-stat-label">Distância Restante</span>
          <strong className="live-stat-value tabular-nums">
            {geometry.remainingKm === 0
              ? 'Chegou ao destino'
              : `~${geometry.remainingKm} km de ${geometry.totalKm} km`}
          </strong>
        </div>
      </div>

      <div className="live-map-canvas-wrap">
        <svg
          viewBox="0 0 560 540"
          className="live-map-svg"
          role="img"
          aria-label={`Mapa de rastreio em tempo real de ${originCityState} até ${destinationCityState}`}
        >
          <defs>
            <linearGradient id="btMapBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#090D16" />
              <stop offset="55%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#0B1120" />
            </linearGradient>
            <radialGradient id="btMapGlow" cx="55%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#84CC16" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#090D16" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="btRouteDone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#84CC16" />
              <stop offset="55%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="btGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="560" height="540" rx="18" fill="url(#btMapBg)" />
          <rect x="0" y="0" width="560" height="540" rx="18" fill="url(#btMapGlow)" />

          {/* Subtle coordinate grid */}
          {[80, 160, 240, 320, 400, 480].map((pos) => (
            <g key={pos} opacity="0.1">
              <line x1={pos} y1="18" x2={pos} y2="522" stroke="#94A3B8" strokeDasharray="2 6" />
              <line x1="18" y1={pos} x2="542" y2={pos} stroke="#94A3B8" strokeDasharray="2 6" />
            </g>
          ))}

          {/* Brazil Territory Silhouette */}
          <path
            d={BRAZIL_OUTLINE_PATH}
            fill="#12223C"
            stroke="#315283"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Subtle Regional Borders */}
          {BRAZIL_REGION_DIVIDERS.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke="#243D63"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.7"
            />
          ))}

          {/* Major Brazilian Capitals Reference Dots */}
          {BRAZIL_HUBS.map((hub) => {
            const pt = projectLatLngToSvg(hub.lat, hub.lng);
            return (
              <g key={hub.label} opacity="0.54">
                <circle cx={pt.x} cy={pt.y} r="2.1" fill="#64748B" />
                <text
                  x={pt.x + 5}
                  y={pt.y + 3}
                  fill="#7B8FA8"
                  fontSize="8.2"
                  fontWeight="600"
                  fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                >
                  {hub.label}
                </text>
              </g>
            );
          })}

          {/* Full Planned Route Dashed Line */}
          <path
            d={geometry.fullCurvePath}
            fill="none"
            stroke="#334155"
            strokeWidth="4.2"
            strokeDasharray="7 6"
            strokeLinecap="round"
          />

          {/* Intermediate Hub Waypoint */}
          <g transform={`translate(${geometry.hubMid.x}, ${geometry.hubMid.y})`} opacity="0.85">
            <circle
              r="4.2"
              fill={animatedProgress >= 50 ? '#22C55E' : '#1E293B'}
              stroke="#94A3B8"
              strokeWidth="1.4"
            />
          </g>

          {/* Traveled Route Glowing Line */}
          {geometry.traveledPolyline && (
            <polyline
              points={geometry.traveledPolyline}
              fill="none"
              stroke="url(#btRouteDone)"
              strokeWidth="4.6"
              strokeLinecap="round"
              filter="url(#btGlow)"
            />
          )}

          {/* Origin Marker */}
          <g transform={`translate(${geometry.p0.x}, ${geometry.p0.y})`}>
            <circle r="11" fill="#38BDF8" opacity="0.22" />
            <circle r="5.8" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
            <g transform={`translate(0, ${geometry.originLabelOffsetY})`}>
              <rect
                x="-62"
                y="-9"
                width="124"
                height="18"
                rx="6"
                fill="#0B1324"
                fillOpacity="0.92"
                stroke="#38BDF8"
                strokeWidth="0.9"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#E0F2FE"
                fontSize="9.2"
                fontWeight="700"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              >
                Origem: {originCityState.slice(0, 17)}
              </text>
            </g>
          </g>

          {/* Destination Marker */}
          <g transform={`translate(${geometry.p2.x}, ${geometry.p2.y})`}>
            <circle r="13" fill="#22C55E" opacity="0.2" />
            <circle r="6.2" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
            <g transform={`translate(0, ${geometry.destLabelOffsetY})`}>
              <rect
                x="-64"
                y="-9"
                width="128"
                height="18"
                rx="6"
                fill="#0B1324"
                fillOpacity="0.92"
                stroke="#22C55E"
                strokeWidth="0.95"
              />
              <text
                x="0"
                y="3.5"
                textAnchor="middle"
                fill="#DCFCE7"
                fontSize="9.2"
                fontWeight="700"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              >
                Destino: {destinationCityState.slice(0, 16)}
              </text>
            </g>
          </g>

          {/* Moving Delivery Truck Group */}
          <g transform={`translate(${geometry.truck.x}, ${geometry.truck.y})`}>
            <circle r="25" fill="#22C55E" opacity="0.16" className="live-truck-radar" />
            <circle r="15.5" fill="#16A34A" opacity="0.34" />

            {/* Crisp Vector Delivery Truck */}
            <g transform={`scale(${truckFacingLeft ? -1 : 1}, 1)`}>
              {/* Subtle headlight beam */}
              <polygon points="15,-4 30,-11 30,5 15,2" fill="#FEF08A" opacity="0.22" />
              <rect
                x="-15"
                y="-10"
                width="20"
                height="13"
                rx="3"
                fill="#FACC15"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              <path
                d="M 5 -7 L 12 -7 L 15 -2 L 15 3 L 5 3 Z"
                fill="#FDE047"
                stroke="#0F172A"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <polygon points="7,-5 11.5,-5 13.3,-1.5 7,-1.5" fill="#0EA5E9" />
              <circle cx="-8" cy="4.5" r="3" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.2" />
              <circle cx="9.5" cy="4.5" r="3" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.2" />
            </g>

            {/* Floating Live Badge above Truck */}
            <g transform="translate(0, -28)">
              <rect
                x="-82"
                y="-11"
                width="164"
                height="21"
                rx="10.5"
                fill="#15803D"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="2.8"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9.3"
                fontWeight="800"
                fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
              >
                {Math.round(animatedProgress)}% • {activeLocationText.slice(0, 19)}
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div className="live-map-progress-footer">
        <div className="live-progress-bar-bg">
          <div className="live-progress-bar-fill" style={{ width: `${animatedProgress}%` }} />
        </div>
        <div className="live-milestones-row">
          {ROUTE_MILESTONES.map((m, idx) => (
            <span
              key={m}
              className={`live-milestone-chip ${statusStep >= idx ? 'reached' : ''}`}
            >
              {statusStep >= idx ? '✓ ' : ''}
              {m}
            </span>
          ))}
        </div>

        {!compact && (
          <div className="live-checkpoint-log">
            <div className="live-checkpoint-head">Histórico de Movimentação do Objeto</div>
            <div className="live-checkpoint-list">
              {carrierCheckpoints.map((ev) => (
                <div
                  key={ev.step}
                  className={`live-checkpoint-row ${ev.current ? 'is-current' : ''}`}
                >
                  <span className="live-checkpoint-marker" aria-hidden="true" />
                  <div className="live-checkpoint-content">
                    <strong>{ev.title}</strong>
                    <small>{ev.place}</small>
                  </div>
                  <span className="live-checkpoint-time tabular-nums">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {updatedAtLabel && (
          <div className="live-map-updated">
            Última atualização logística: <strong>{updatedAtLabel}</strong> • Distância total
            estimada: {geometry.totalKm} km
          </div>
        )}
      </div>
    </div>
  );
};
