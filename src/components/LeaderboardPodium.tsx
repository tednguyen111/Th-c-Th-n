import React from 'react';

interface PodiumUser {
  name: string;
  elo: number;
  titles?: string[];
}

interface LeaderboardPodiumProps {
  topUsers: PodiumUser[];
  currentUserName?: string;
}

export function LeaderboardPodium({
  topUsers,
  currentUserName,
}: LeaderboardPodiumProps) {
  const first = topUsers[0] || null;
  const second = topUsers[1] || null;
  const third = topUsers[2] || null;

  return (
    <div className="bg-white dark:bg-[#282D3A] rounded-2xl border border-black/6 dark:border-white/10 p-5 sm:p-6 flex flex-col items-center justify-between shadow-xs">
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E04F16] dark:text-[#FF7A45]">
            Bục Vinh Quang
          </p>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            Top 3 Thực Thần Dẫn Đầu
          </h3>
        </div>
        <span className="text-xs font-mono-tabular text-zinc-400 dark:text-slate-400">
           Nhất · Nhì · Ba
        </span>
      </div>

      {/* 3D Isometric Podium SVG (Gold #1, Silver #2, Bronze #3 + Crown + User Names) */}
      <div className="w-full max-w-[440px] mx-auto my-2">
        <svg
          viewBox="0 -30 460 360"
          className="w-full h-auto select-none overflow-visible"
          role="img"
          aria-label="Bục xếp hạng Nhất Nhì Ba"
        >
          <defs>
            {/* Floor shadow */}
            <radialGradient id="podium-floor-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.28)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* GOLD (#1) Gradients */}
            <linearGradient id="gold-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
            <linearGradient id="gold-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>

            {/* SILVER (#2) Gradients */}
            <linearGradient id="silver-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id="silver-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F1F5F9" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>

            {/* BRONZE (#3) Gradients */}
            <linearGradient id="bronze-front" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>
            <linearGradient id="bronze-top" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFEDD5" />
              <stop offset="100%" stopColor="#FDBA74" />
            </linearGradient>
          </defs>

          {/* Soft ambient base shadow */}
          <ellipse cx="230" cy="306" rx="205" ry="18" fill="url(#podium-floor-shadow)" />

          {/* ── STEP 2: SILVER (LEFT) ── */}
          <g>
            {/* Top face */}
            <polygon
              points="40,155 62,127 170,127 170,155"
              fill="url(#silver-top)"
            />
            {/* Front face */}
            <rect
              x="40"
              y="155"
              width="130"
              height="145"
              fill="url(#silver-front)"
            />
            {/* Inner right shadow strip from Step 1 */}
            <rect
              x="162"
              y="155"
              width="8"
              height="145"
              fill="rgba(0,0,0,0.12)"
            />
            {/* Circle 2 */}
            <circle cx="105" cy="224" r="30" fill="#FFFFFF" />
            <text
              x="105"
              y="226"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-mono-tabular font-extrabold text-[32px]"
              fill="#475569"
            >
              2
            </text>

            {/* User #2 Info Above Step */}
            {second && (
              <g transform="translate(105, 114)">
                <text
                  x="0"
                  y="-16"
                  textAnchor="middle"
                  className="text-[13px] font-bold fill-zinc-800 dark:fill-white"
                >
                  {second.name.length > 13 ? `${second.name.slice(0, 12)}…` : second.name}
                </text>
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  className="font-mono-tabular text-[11px] font-bold fill-slate-500 dark:fill-slate-300"
                >
                  {second.elo} AP
                </text>
              </g>
            )}
          </g>

          {/* ── STEP 3: BRONZE (RIGHT) ── */}
          <g>
            {/* Top face */}
            <polygon
              points="290,180 290,152 398,152 420,180"
              fill="url(#bronze-top)"
            />
            {/* Front face */}
            <rect
              x="290"
              y="180"
              width="130"
              height="120"
              fill="url(#bronze-front)"
            />
            {/* Inner left shadow strip from Step 1 */}
            <rect
              x="290"
              y="180"
              width="8"
              height="120"
              fill="rgba(0,0,0,0.15)"
            />
            {/* Circle 3 */}
            <circle cx="355" cy="240" r="30" fill="#FFFFFF" />
            <text
              x="355"
              y="242"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-mono-tabular font-extrabold text-[32px]"
              fill="#9A3412"
            >
              3
            </text>

            {/* User #3 Info Above Step */}
            {third && (
              <g transform="translate(355, 139)">
                <text
                  x="0"
                  y="-16"
                  textAnchor="middle"
                  className="text-[13px] font-bold fill-zinc-800 dark:fill-white"
                >
                  {third.name.length > 13 ? `${third.name.slice(0, 12)}…` : third.name}
                </text>
                <text
                  x="0"
                  y="0"
                  textAnchor="middle"
                  className="font-mono-tabular text-[11px] font-bold fill-amber-700 dark:fill-amber-300"
                >
                  {third.elo} AP
                </text>
              </g>
            )}
          </g>

          {/* ── STEP 1: GOLD (CENTER TALLEST) ── */}
          <g>
            {/* Top face */}
            <polygon
              points="170,110 182,80 278,80 290,110"
              fill="url(#gold-top)"
            />
            {/* Front face */}
            <rect
              x="170"
              y="110"
              width="120"
              height="190"
              fill="url(#gold-front)"
            />
            {/* Subtle top highlight rim */}
            <line
              x1="170"
              y1="110"
              x2="290"
              y2="110"
              stroke="#FEF9C3"
              strokeWidth="2"
            />
            {/* Circle 1 */}
            <circle cx="230" cy="182" r="34" fill="#FFFFFF" />
            <text
              x="230"
              y="184"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-mono-tabular font-extrabold text-[36px]"
              fill="#B45309"
            >
              1
            </text>

            {/* Crown & User #1 Info Above Step */}
            {first && (
              <g transform="translate(230, 68)">
                {/* Crown matching uploaded image.png, positioned higher and taller */}
                <g transform="translate(-34, -92)">
                  <svg
                    width="68"
                    height="62"
                    viewBox="0 0 100 92"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Three floating hollow rings on the crown peaks */}
                    <circle
                      cx="9"
                      cy="31"
                      r="5.5"
                      stroke="#BE8A43"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="49"
                      cy="12"
                      r="5.8"
                      stroke="#BE8A43"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="90"
                      cy="31"
                      r="5.5"
                      stroke="#BE8A43"
                      strokeWidth="4.5"
                    />

                    {/* Main crown body with curved peaks and subtle bottom-left gap */}
                    <path
                      d="M23.5 68.5 L13.5 39 C26 52 39 51 49 25 C59 51 72 52 84.5 39 L74 68.5 C60 63.5 40 63.5 27.5 68"
                      stroke="#BE8A43"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Elliptical base ring with upper-right stylized gap */}
                    <path
                      d="M63.5 74.5 C52 73 36 73.5 27.5 76.5 C23.5 78 24 82.5 29 83.8 C40 85.8 59 85.8 70 83.8 C74.5 82.5 75 78 68.5 75.5"
                      stroke="#BE8A43"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </g>

                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  className="text-[14px] font-extrabold fill-zinc-900 dark:fill-white"
                >
                  {first.name.length > 15 ? `${first.name.slice(0, 14)}…` : first.name}
                </text>
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  className="font-mono-tabular text-[12px] font-extrabold fill-[#E04F16] dark:fill-[#FACC15]"
                >
                  {first.elo} AP
                </text>
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Podium Summary Cards Below */}
      <div className="w-full grid grid-cols-3 gap-2.5 pt-3 border-t border-black/6 dark:border-white/10 text-center">
        {[
          { rank: 2, label: 'Hạng Nhì', user: second, badgeColor: 'text-slate-500 dark:text-slate-300' },
          { rank: 1, label: 'Quán Quân', user: first, badgeColor: 'text-amber-600 dark:text-amber-400' },
          { rank: 3, label: 'Hạng Ba', user: third, badgeColor: 'text-orange-700 dark:text-orange-300' },
        ].map((slot) => {
          const isMe = slot.user && currentUserName === slot.user.name;
          return (
            <div
              key={slot.rank}
              className={`p-2.5 rounded-xl border ${
                slot.rank === 1
                  ? 'bg-amber-500/8 border-amber-500/25'
                  : 'bg-[#FAF8F5] dark:bg-[#1E222B] border-black/5 dark:border-white/8'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase ${slot.badgeColor}`}>
                #{slot.rank} {slot.label}
              </div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white truncate mt-0.5">
                {slot.user ? slot.user.name : '—'}
                {isMe ? ' (Bạn)' : ''}
              </div>
              <div className="text-[11px] font-mono-tabular font-semibold text-[#E04F16] dark:text-[#FF7A45]">
                {slot.user ? `${slot.user.elo} AP` : '0 AP'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
