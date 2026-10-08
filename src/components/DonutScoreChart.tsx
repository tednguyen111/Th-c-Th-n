import React from 'react';

export interface Radar360Scores {
  ngon: number;
  bo: number;
  gia: number;
  no: number;
  khoangcach: number;
}

interface Radar360ChartProps {
  title: string;
  subtitle?: string;
  scores: Radar360Scores;
  accentColor?: 'lime' | 'orange';
}

interface Point {
  x: number;
  y: number;
}

// Round any score to nearest 0.5 step and format cleanly (e.g. 9, 8.5, 8)
export function formatHalfStepScore(val: number): string {
  const rounded = Math.round(Number(val || 0) * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// Closed Catmull-Rom spline to cubic Bezier SVG path for smooth organic rounded lobes
function createSmoothClosedPath(points: Point[], tension = 0.25): string {
  const n = points.length;
  if (n < 3) return '';

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return `${d} Z`;
}

export function DonutScoreChart({
  title,
  subtitle,
  scores,
  accentColor = 'lime',
}: Radar360ChartProps) {
  const cx = 160;
  const cy = 160;
  const maxR = 96;
  const maxScore = 10;

  const axes: { key: keyof Radar360Scores; label: string }[] = [
    { key: 'ngon', label: 'Ngon' },
    { key: 'bo', label: 'Độ bổ' },
    { key: 'gia', label: 'Giá hợp lý' },
    { key: 'no', label: 'Khẩu phần' },
    { key: 'khoangcach', label: 'Khoảng cách' },
  ];

  const getVertex = (index: number, radius: number): Point => {
    const angle = -Math.PI / 2 + ((2 * Math.PI) / 5) * index;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  // Score vertices (snapped to 0.5 increments)
  const scorePoints = axes.map((axis, idx) => {
    const raw = Math.min(maxScore, Math.max(1, Number(scores[axis.key] || 0)));
    const snapped = Math.round(raw * 2) / 2;
    const r = (snapped / maxScore) * maxR;
    return getVertex(idx, r);
  });

  const smoothBlobPath = createSmoothClosedPath(scorePoints, 0.22);

  // 5 concentric alternating circular rings like the reference "Đánh giá 360"
  const ringRadii = [1, 0.8, 0.6, 0.4, 0.2];

  // Tangent rotation angles (in degrees) for labels around the circle
  const labelTransforms: {
    angleDeg: number;
    radiusOffset: number;
  }[] = [
    { angleDeg: 0, radiusOffset: 22 },   // Top (0 deg)
    { angleDeg: 72, radiusOffset: 22 },  // Top-right (+72 deg)
    { angleDeg: -36, radiusOffset: 24 }, // Bottom-right (-36 deg)
    { angleDeg: 36, radiusOffset: 24 },  // Bottom-left (+36 deg)
    { angleDeg: -72, radiusOffset: 22 }, // Top-left (-72 deg)
  ];

  const rawAvg =
    (scores.ngon + scores.bo + scores.gia + scores.no + scores.khoangcach) / 5;
  const avgFormatted = formatHalfStepScore(rawAvg);

  const strokeColor = accentColor === 'lime' ? '#E4F222' : '#FF7A2F';
  const fillColor =
    accentColor === 'lime' ? 'rgba(216, 232, 24, 0.68)' : 'rgba(255, 115, 36, 0.62)';
  const badgeTextColor = accentColor === 'lime' ? 'text-[#E4F222]' : 'text-[#FF7A2F]';

  return (
    <div className="rounded-2xl bg-[#181B22] dark:bg-[#191D26] border border-white/8 p-4 sm:p-5 text-white shadow-md">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
            {title}
          </h4>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className={`font-mono-tabular text-xs font-bold px-2.5 py-1 rounded-lg bg-white/8 ${badgeTextColor}`}>
          TB {avgFormatted}
        </span>
      </div>

      <svg
        viewBox="0 0 320 320"
        className="w-full max-w-[290px] h-auto mx-auto select-none"
        role="img"
        aria-label={title}
      >
        {/* Concentric Circular Bullseye Rings */}
        {ringRadii.map((pct, i) => (
          <circle
            key={pct}
            cx={cx}
            cy={cy}
            r={maxR * pct}
            fill={i % 2 === 0 ? '#272B35' : '#1F232B'}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* 5 Radial Axis Spokes */}
        {axes.map((_, i) => {
          const outerPt = getVertex(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outerPt.x}
              y2={outerPt.y}
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Smooth Curved 360 Radar Shape */}
        <path
          d={smoothBlobPath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Curved / Tangential Axis Labels + Numeric Score (strictly 0.5 or integer) */}
        {axes.map((axis, i) => {
          const cfg = labelTransforms[i];
          const pt = getVertex(i, maxR + cfg.radiusOffset);
          const scoreVal = formatHalfStepScore(scores[axis.key]);

          return (
            <g
              key={axis.key}
              transform={`translate(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)}) rotate(${cfg.angleDeg})`}
            >
              <text
                x={0}
                y={-5}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-300 text-[11px] font-medium"
              >
                {axis.label}
              </text>
              <text
                x={0}
                y={9}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono-tabular fill-white text-[11px] font-bold"
              >
                {scoreVal}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
