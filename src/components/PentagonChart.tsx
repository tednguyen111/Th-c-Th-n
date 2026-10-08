import React from 'react';

interface PentagonScores {
  ngon: number;
  bo: number;
  gia: number;
  no: number;
  khoangcach: number;
}

interface PentagonChartProps {
  scores: PentagonScores;
}

export function PentagonChart({ scores }: PentagonChartProps) {
  const cx = 160;
  const cy = 160;
  const r = 92;
  const maxScore = 10;

  const labels = ['Ngon', 'Bổ', 'Rẻ', 'No', 'Gần'];
  const keys: (keyof PentagonScores)[] = ['ngon', 'bo', 'gia', 'no', 'khoangcach'];

  const vertex = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + ((2 * Math.PI) / 5) * i;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  };

  const bgPts = keys.map((_, i) => vertex(i, r));
  const bgPath =
    bgPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  const scorePts = keys.map((k, i) => vertex(i, (scores[k] / maxScore) * r));
  const scorePath =
    scorePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox="0 0 320 320"
      className="w-full max-w-[290px] h-auto mx-auto select-none"
      role="img"
      aria-label="Biểu đồ đánh giá 5 chiều: Ngon, Bổ, Rẻ, No, Gần"
    >
      {rings.map((pct) => {
        const pts = keys.map((_, i) => vertex(i, r * pct));
        return (
          <polygon
            key={pct}
            points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
             className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
        );
      })}

      {keys.map((_, i) => {
        const p = vertex(i, r);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth="1"
          />
        );
      })}

      <path
        d={bgPath}
        className="fill-[#E04F16]/5 stroke-[#E04F16]/25"
        strokeWidth="1.5"
      />

      <path
        d={scorePath}
        className="fill-[#E04F16]/25 stroke-[#E04F16]"
        strokeWidth="2.2"
      />

      {scorePts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          className="fill-[#E04F16]"
        />
      ))}

      {keys.map((k, i) => {
        const p = vertex(i, r + 34);
        const textAnchor = p.x < cx - 12 ? 'end' : p.x > cx + 12 ? 'start' : 'middle';
        return (
          <text
            key={k}
            x={p.x}
            y={p.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            className="fill-zinc-800 dark:fill-zinc-200 text-[12px] font-semibold"
          >
            {labels[i]} ({scores[k]})
          </text>
        );
      })}
    </svg>
  );
}
