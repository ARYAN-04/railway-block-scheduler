import React, { useState, useMemo } from 'react';
import {
  Train as TrainIcon,
  Filter,
  Eye,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { ScheduledBlock, Station, Train } from '../types';

interface MareyChartProps {
  stations: Station[];
  trains: Train[];
  blocks: ScheduledBlock[];
  onSelectBlock?: (block: ScheduledBlock) => void;
  selectedBlockId?: string | null;
}

interface TooltipData {
  type: 'train' | 'block';
  x: number;
  y: number;
  data: Train | ScheduledBlock;
}

// Fixed dimensions for the SVG coordinate system
const SVG_WIDTH = 1100;
const SVG_HEIGHT = 580;
const MARGIN = { top: 40, right: 40, bottom: 45, left: 110 };
const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right; // 950
const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom; // 495
const TOTAL_HORIZON_MIN = 720; // 12 Hours (00:00 to 12:00)
const TOTAL_KM = 106.0;

export const MareyChart: React.FC<MareyChartProps> = ({
  stations,
  trains,
  blocks,
  onSelectBlock,
  selectedBlockId,
}) => {
  // Interactive filters
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'TMS' | 'TDMS' | 'SMMS'>('ALL');
  const [showTrains, setShowTrains] = useState<boolean>(true);
  const [showBlocks, setShowBlocks] = useState<boolean>(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Coordinate projection functions
  const timeToX = (min: number): number => {
    const clamped = Math.max(0, Math.min(TOTAL_HORIZON_MIN, min));
    return MARGIN.left + (clamped / TOTAL_HORIZON_MIN) * PLOT_WIDTH;
  };

  const kmToY = (km: number): number => {
    const clamped = Math.max(0, Math.min(TOTAL_KM, km));
    return MARGIN.top + (clamped / TOTAL_KM) * PLOT_HEIGHT;
  };

  // Time grid markers (every 60 minutes)
  const timeMarkers = useMemo(() => {
    const markers: { min: number; label: string }[] = [];
    for (let m = 0; m <= TOTAL_HORIZON_MIN; m += 60) {
      const h = Math.floor(m / 60);
      const label = `${h.toString().padStart(2, '0')}:00`;
      markers.push({ min: m, label });
    }
    return markers;
  }, []);

  // Half-hour minor grid lines
  const halfHourMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let m = 30; m < TOTAL_HORIZON_MIN; m += 60) {
      markers.push(m);
    }
    return markers;
  }, []);

  // Filtered blocks based on department selection
  const filteredBlocks = useMemo(() => {
    if (deptFilter === 'ALL') return blocks;
    return blocks.filter((b) => b.system === deptFilter);
  }, [blocks, deptFilter]);

  // Format minutes into HH:MM
  const formatTime = (min: number): string => {
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden">
      {/* Top Header & Interactive Legend Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
            <TrainIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              Time-Distance String Chart (Marey Diagram)
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono border border-slate-700">
                12-Hour Horizon (00:00 – 12:00)
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Live Trajectory Projection & Joint Track Possession Windows
            </p>
          </div>
        </div>

        {/* Filters and Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Department Filter */}
          <div className="flex items-center rounded-lg bg-slate-800/80 p-1 border border-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400 ml-1.5 mr-1" />
            <span className="text-[11px] text-slate-400 mr-2 font-mono">Dept:</span>
            {(['ALL', 'TMS', 'TDMS', 'SMMS'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDeptFilter(filter)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  deptFilter === filter
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter}
              </button>
            ))}
          </div>

          {/* Layer Toggles */}
          <button
            onClick={() => setShowTrains(!showTrains)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] transition-all ${
              showTrains
                ? 'bg-slate-800 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Trains ({trains.length})</span>
          </button>

          <button
            onClick={() => setShowBlocks(!showBlocks)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-[11px] transition-all ${
              showBlocks
                ? 'bg-slate-800 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Lock className="h-3 w-3" />
            <span>Blocks ({blocks.length})</span>
          </button>
        </div>
      </div>

      {/* SVG Visualization Canvas */}
      <div className="relative w-full overflow-x-auto bg-slate-950/80 select-none">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto min-w-[950px]"
          style={{ maxHeight: '600px' }}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            {/* Striped pattern for Integrated / Bundled Blocks */}
            <pattern
              id="integrated-stripes"
              patternUnits="userSpaceOnUse"
              width="12"
              height="12"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="#a855f7"
                strokeWidth="3.5"
                strokeOpacity="0.4"
              />
            </pattern>

            {/* Glowing filters for premium train strings */}
            <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.7" />
            </filter>
            <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#06b6d4" floodOpacity="0.6" />
            </filter>
            <filter id="purple-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* 1. Spatial Segment Background Shading */}
          {/* Segment 1: 0 - 30 KM (Ghaziabad - Ajaibpur) */}
          <rect
            x={MARGIN.left}
            y={kmToY(0)}
            width={PLOT_WIDTH}
            height={kmToY(30) - kmToY(0)}
            fill="#0f172a"
            fillOpacity="0.45"
          />
          {/* Segment 2: 30 - 60 KM (Ajaibpur - Wair) */}
          <rect
            x={MARGIN.left}
            y={kmToY(30)}
            width={PLOT_WIDTH}
            height={kmToY(60) - kmToY(30)}
            fill="#1e293b"
            fillOpacity="0.25"
          />
          {/* Segment 3: 60 - 106 KM (Wair - Aligarh) */}
          <rect
            x={MARGIN.left}
            y={kmToY(60)}
            width={PLOT_WIDTH}
            height={kmToY(106) - kmToY(60)}
            fill="#0f172a"
            fillOpacity="0.45"
          />

          {/* Segment Labels on right boundary */}
          <text
            x={SVG_WIDTH - MARGIN.right - 8}
            y={kmToY(15)}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
            fontFamily="monospace"
          >
            Segment 0: GZB – AJR (0-30 KM)
          </text>
          <text
            x={SVG_WIDTH - MARGIN.right - 8}
            y={kmToY(45)}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
            fontFamily="monospace"
          >
            Segment 1: AJR – WAIR (30-60 KM)
          </text>
          <text
            x={SVG_WIDTH - MARGIN.right - 8}
            y={kmToY(83)}
            textAnchor="end"
            fontSize="10"
            fill="#64748b"
            fontFamily="monospace"
          >
            Segment 2: WAIR – ALJN (60-106 KM)
          </text>

          {/* Segment Boundary Separator Lines */}
          <line
            x1={MARGIN.left}
            y1={kmToY(30)}
            x2={MARGIN.left + PLOT_WIDTH}
            y2={kmToY(30)}
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1={MARGIN.left}
            y1={kmToY(60)}
            x2={MARGIN.left + PLOT_WIDTH}
            y2={kmToY(60)}
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* 2. Vertical Time Grid Lines */}
          {halfHourMarkers.map((min) => (
            <line
              key={`half-${min}`}
              x1={timeToX(min)}
              y1={MARGIN.top}
              x2={timeToX(min)}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {timeMarkers.map(({ min, label }) => {
            const x = timeToX(min);
            return (
              <g key={`time-${min}`}>
                <line
                  x1={x}
                  y1={MARGIN.top}
                  x2={x}
                  y2={MARGIN.top + PLOT_HEIGHT}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeOpacity="0.8"
                />
                {/* Time label on Bottom Axis */}
                <text
                  x={x}
                  y={MARGIN.top + PLOT_HEIGHT + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {label}
                </text>
                {/* Time label on Top Axis */}
                <text
                  x={x}
                  y={MARGIN.top - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* 3. Horizontal Station Guide Lines & Labels */}
          {stations.map((stn) => {
            const y = kmToY(stn.km);
            const isMajor = ['GZB', 'DKDE', 'KRJ', 'ALJN'].includes(stn.id);
            return (
              <g key={`stn-${stn.id}`}>
                <line
                  x1={MARGIN.left}
                  y1={y}
                  x2={MARGIN.left + PLOT_WIDTH}
                  y2={y}
                  stroke={isMajor ? '#334155' : '#1e293b'}
                  strokeWidth={isMajor ? 1.5 : 0.75}
                  strokeDasharray={isMajor ? undefined : '3 3'}
                />
                {/* Station Name & KM on Left Axis */}
                <text
                  x={MARGIN.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize={isMajor ? '11' : '10'}
                  fill={isMajor ? '#f1f5f9' : '#94a3b8'}
                  fontFamily="monospace"
                  fontWeight={isMajor ? '700' : '400'}
                >
                  {stn.name}
                </text>
                <text
                  x={MARGIN.left - 80}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {stn.km.toFixed(0)}k
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={MARGIN.left - 10}
            y={MARGIN.top - 15}
            textAnchor="end"
            fontSize="10"
            fill="#38bdf8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            STATION / KM ↓
          </text>
          <text
            x={MARGIN.left + PLOT_WIDTH / 2}
            y={MARGIN.top + PLOT_HEIGHT + 40}
            textAnchor="middle"
            fontSize="11"
            fill="#38bdf8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            TIME OF DAY (HOURS) →
          </text>

          {/* 4. Scheduled Maintenance Possession Bounding Boxes */}
          {showBlocks &&
            filteredBlocks.map((block) => {
              const x = timeToX(block.scheduled_start_min);
              const width = Math.max(
                8,
                timeToX(block.scheduled_end_min) - timeToX(block.scheduled_start_min)
              );

              // Calculate Y and height: point assets get minimum 4 KM height
              const spanKm = Math.max(4.0, block.end_km - block.start_km);
              const centerKm = (block.start_km + block.end_km) / 2;
              const y = kmToY(centerKm - spanKm / 2);
              const height = (spanKm / TOTAL_KM) * PLOT_HEIGHT;

              const isBundled = block.is_bundled;
              const isSelected = selectedBlockId === block.demand_id;
              const isAuthorized = block.status === 'AUTHORIZED';

              // Visual styling based on bundling & department
              let fill = 'rgba(59, 130, 246, 0.25)'; // TMS Blue
              let stroke = '#3b82f6';
              if (block.system === 'TDMS') {
                fill = 'rgba(245, 158, 11, 0.25)'; // TDMS Amber
                stroke = '#f59e0b';
              } else if (block.system === 'SMMS') {
                fill = 'rgba(16, 185, 129, 0.25)'; // SMMS Emerald
                stroke = '#10b981';
              }

              if (isBundled) {
                fill = 'rgba(168, 85, 247, 0.28)';
                stroke = '#c084fc';
              }

              return (
                <g
                  key={`block-${block.demand_id}`}
                  className="cursor-pointer transition-all duration-150 group"
                  onClick={() => onSelectBlock && onSelectBlock(block)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      type: 'block',
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      data: block,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Outer Bounding Box */}
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="4"
                    fill={fill}
                    stroke={isSelected ? '#38bdf8' : stroke}
                    strokeWidth={isSelected ? 3 : isBundled ? 2.5 : 1.5}
                    filter={isBundled ? 'url(#purple-glow)' : undefined}
                    strokeDasharray={isSelected ? '4 2' : undefined}
                    className="hover:opacity-90 transition-opacity"
                  />

                  {/* Striped overlay pattern for integrated bundled blocks */}
                  {isBundled && (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="4"
                      fill="url(#integrated-stripes)"
                      pointerEvents="none"
                    />
                  )}

                  {/* Integrated / Department Tag */}
                  {width > 35 && height > 16 && (
                    <text
                      x={x + 5}
                      y={y + 13}
                      fontSize="9"
                      fill={isBundled ? '#f3e8ff' : '#ffffff'}
                      fontFamily="monospace"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {isBundled ? `⚡ ${block.system}` : block.system}
                    </text>
                  )}

                  {/* Authorized PTW Badge Icon */}
                  {isAuthorized && (
                    <circle
                      cx={x + width - 8}
                      cy={y + 8}
                      r="5"
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="1"
                    />
                  )}
                </g>
              );
            })}

          {/* 5. Train Trajectory Strings */}
          {showTrains &&
            trains.map((train) => {
              const x1 = timeToX(train.dep_min);
              const y1 = kmToY(train.start_km);
              const x2 = timeToX(train.arr_min);
              const y2 = kmToY(train.end_km);

              const isPremium = train.type === 'PASSENGER_PREMIUM';
              const isRegular = train.type === 'PASSENGER_REGULAR';

              let stroke = '#f59e0b'; // Freight Amber
              let strokeWidth = 2;
              let dashArray: string | undefined = '6 3';
              let filter: string | undefined = undefined;

              if (isPremium) {
                stroke = '#10b981'; // Emerald
                strokeWidth = 3.2;
                dashArray = undefined;
                filter = 'url(#emerald-glow)';
              } else if (isRegular) {
                stroke = '#06b6d4'; // Cyan
                strokeWidth = 2.4;
                dashArray = undefined;
                filter = 'url(#cyan-glow)';
              }

              // Calculate angle for text alignment along string
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

              return (
                <g
                  key={`train-${train.id}`}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      type: 'train',
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      data: train,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Invisible thick hover target */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth="14"
                  />

                  {/* Main Train Trajectory Line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    filter={filter}
                    className="transition-all group-hover:stroke-white group-hover:stroke-[4]"
                  />

                  {/* Start Point Node */}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={isPremium ? 4 : 3}
                    fill={stroke}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* End Point Node */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={isPremium ? 4 : 3}
                    fill={stroke}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* Train Label Along String */}
                  <text
                    x={midX}
                    y={midY - 5}
                    transform={`rotate(${angleDeg}, ${midX}, ${midY})`}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill={isPremium ? '#a7f3d0' : isRegular ? '#bae6fd' : '#fde68a'}
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  >
                    {train.id} {train.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Floating Interactive Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur max-w-xs text-xs"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          {tooltip.type === 'train' ? (
            (() => {
              const t = tooltip.data as Train;
              const durationMin = t.arr_min - t.dep_min;
              const dist = t.end_km - t.start_km;
              const speed = durationMin > 0 ? ((dist / durationMin) * 60).toFixed(0) : '0';
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                    <span className="font-bold text-slate-100 font-mono">
                      #{t.id} {t.name}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                        t.type === 'PASSENGER_PREMIUM'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : t.type === 'PASSENGER_REGULAR'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {t.type.replace('PASSENGER_', '')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">Departure:</span> {formatTime(t.dep_min)}
                    </div>
                    <div>
                      <span className="text-slate-500">Arrival:</span> {formatTime(t.arr_min)}
                    </div>
                    <div>
                      <span className="text-slate-500">Distance:</span> {dist.toFixed(0)} KM
                    </div>
                    <div>
                      <span className="text-slate-500">Avg Speed:</span> {speed} km/h
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium pt-1 flex items-center gap-1 border-t border-slate-800/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Path clear • Disjunctive buffer enforced</span>
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const b = tooltip.data as ScheduledBlock;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-100 font-mono">{b.demand_id}</span>
                      {b.is_bundled && (
                        <span className="bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                          INTEGRATED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                      {b.system}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium text-[11px]">{b.activity}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">Window:</span> {formatTime(b.scheduled_start_min)}–{formatTime(b.scheduled_end_min)}
                    </div>
                    <div>
                      <span className="text-slate-500">Duration:</span> {b.duration_minutes}m
                    </div>
                    <div>
                      <span className="text-slate-500">Span:</span> KM {b.start_km}–{b.end_km}
                    </div>
                    <div>
                      <span className="text-slate-500">Criticality:</span>{' '}
                      <span className="text-amber-400 font-bold">{b.criticality_score.toFixed(1)}</span>
                    </div>
                  </div>
                  {b.bundled_with && b.bundled_with.length > 0 && (
                    <div className="rounded bg-purple-950/40 border border-purple-800/50 p-1.5 text-[10px] font-mono text-purple-200">
                      <span className="font-semibold text-purple-400">Bundled Peers:</span>{' '}
                      {b.bundled_with.join(', ')}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono">
                    <span className="text-slate-400">
                      Status:{' '}
                      <strong
                        className={
                          b.status === 'AUTHORIZED' ? 'text-emerald-400' : 'text-amber-400'
                        }
                      >
                        {b.status}
                      </strong>
                    </span>
                    <span className="text-cyan-400 underline cursor-pointer">
                      Click to Authorize PTW →
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Bottom Chart Legend */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800 px-5 py-3 bg-slate-950/70 text-xs font-mono text-slate-300 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Train Classes:</span>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
            <span className="text-slate-200">Premium Passenger (Rajdhani/Shatabdi)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-5 rounded-full bg-cyan-500"></span>
            <span className="text-slate-200">Regular Express</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-5 rounded border border-dashed border-amber-400 bg-amber-500/30"></span>
            <span className="text-slate-200">Freight Rakes (Coal/POL)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-500 font-semibold uppercase text-[10px]">Possession Blocks:</span>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-4 rounded border border-purple-500 bg-purple-500/30 shadow-[0_0_8px_#a855f7]"></span>
            <span className="text-purple-300 font-bold">Integrated Joint Block</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded border border-blue-500 bg-blue-500/30"></span>
            <span className="text-blue-300">TMS (Track)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded border border-amber-500 bg-amber-500/30"></span>
            <span className="text-amber-300">TDMS (OHE)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-3 w-3 rounded border border-emerald-500 bg-emerald-500/30"></span>
            <span className="text-emerald-300">SMMS (S&T)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
