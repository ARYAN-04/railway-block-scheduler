import React, { useState, useMemo } from 'react';
import type { ScheduledBlock, Train, Station, MaintenanceDemand } from '../types';
import {
  Layers,
  ZoomIn,
  Maximize2,
  Clock,
  Info,
} from 'lucide-react';

interface GanttChartProps {
  trains: Train[];
  scheduledBlocks: ScheduledBlock[];
  demands: MaintenanceDemand[];
  stations: Station[];
  horizonMinutes?: number;
  onSelectBlock: (blockId: string) => void;
  selectedBlockId?: string | null;
  filterDepartment?: string;
  filterSegment?: string;
}

interface SegmentDef {
  id: string;
  name: string;
  startKm: number;
  endKm: number;
  stations: string;
}

const SEGMENTS: SegmentDef[] = [
  {
    id: 'seg-1',
    name: 'Segment 1: Ghaziabad – Ajaibpur',
    startKm: 0.0,
    endKm: 30.0,
    stations: 'GZB • DBR • BRKY • AJR',
  },
  {
    id: 'seg-2',
    name: 'Segment 2: Ajaibpur – Wair',
    startKm: 30.0,
    endKm: 60.0,
    stations: 'AJR • DKDE • WAIR',
  },
  {
    id: 'seg-3',
    name: 'Segment 3: Wair – Aligarh Jn',
    startKm: 60.0,
    endKm: 106.0,
    stations: 'WAIR • KRJ • SOM • ALJN',
  },
];

const formatMinutesToTime = (min: number): string => {
  const normalized = Math.max(0, Math.floor(min));
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const GanttChart: React.FC<GanttChartProps> = ({
  trains,
  scheduledBlocks,
  demands,
  horizonMinutes = 720,
  onSelectBlock,
  selectedBlockId,
  filterDepartment = 'ALL',
  filterSegment = 'ALL',
}) => {
  const [viewMode, setViewMode] = useState<'SEGMENT' | 'DEPARTMENT'>('SEGMENT');
  const [zoomLevel, setZoomLevel] = useState<'FULL' | 'VALLEY'>('FULL');
  const [hoveredItem, setHoveredItem] = useState<{
    type: 'TRAIN' | 'BLOCK';
    id: string;
    title: string;
    subtitle: string;
    startTime: string;
    endTime: string;
    duration: number;
    details: Record<string, string>;
  } | null>(null);

  // Time window bounds based on zoom
  const { startMin, endMin, totalSpan } = useMemo(() => {
    if (zoomLevel === 'VALLEY') {
      return { startMin: 120, endMin: 480, totalSpan: 360 }; // 02:00 to 08:00
    }
    return { startMin: 0, endMin: horizonMinutes, totalSpan: horizonMinutes };
  }, [zoomLevel, horizonMinutes]);

  // Generate hourly marks
  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    const step = 60;
    const firstHour = Math.ceil(startMin / step) * step;
    for (let m = firstHour; m <= endMin; m += step) {
      marks.push(m);
    }
    return marks;
  }, [startMin, endMin]);

  // Demand lookup map
  const demandMap = useMemo(() => {
    const map = new Map<string, MaintenanceDemand>();
    demands.forEach((d) => map.set(d.id, d));
    return map;
  }, [demands]);

  // Calculate train occupancy per segment
  const trainOccupancies = useMemo(() => {
    const records: Array<{
      train: Train;
      segmentId: string;
      enterMin: number;
      exitMin: number;
    }> = [];

    trains.forEach((train) => {
      const trainSpan = train.end_km - train.start_km;
      const trainDuration = train.arr_min - train.dep_min;
      if (trainSpan <= 0 || trainDuration <= 0) return;

      SEGMENTS.forEach((seg) => {
        const overlapStart = Math.max(train.start_km, seg.startKm);
        const overlapEnd = Math.min(train.end_km, seg.endKm);

        if (overlapStart < overlapEnd) {
          const enterRatio = (overlapStart - train.start_km) / trainSpan;
          const exitRatio = (overlapEnd - train.start_km) / trainSpan;

          const enterMin = Math.round(train.dep_min + enterRatio * trainDuration);
          const exitMin = Math.round(train.dep_min + exitRatio * trainDuration);

          records.push({
            train,
            segmentId: seg.id,
            enterMin,
            exitMin,
          });
        }
      });
    });

    return records;
  }, [trains]);

  // Filter scheduled blocks
  const visibleBlocks = useMemo(() => {
    return scheduledBlocks.filter((b) => {
      if (filterDepartment !== 'ALL' && b.department !== filterDepartment) return false;
      if (filterSegment !== 'ALL') {
        const seg = SEGMENTS.find((s) => s.id === filterSegment);
        if (seg) {
          const overlap = Math.max(b.start_km, seg.startKm) < Math.min(b.end_km, seg.endKm);
          if (!overlap) return false;
        }
      }
      return true;
    });
  }, [scheduledBlocks, filterDepartment, filterSegment]);

  // Percentage position on Gantt track with a 2% inner margin to avoid right edge clipping
  const getPositionPercent = (min: number): number => {
    const clamped = Math.max(startMin, Math.min(endMin, min));
    const raw = (clamped - startMin) / totalSpan;
    // Keep within [1%, 98%] so boundary labels and bars never clip
    return 1 + raw * 97;
  };

  const getWidthPercent = (start: number, end: number): number => {
    const clampedStart = Math.max(startMin, Math.min(endMin, start));
    const clampedEnd = Math.max(startMin, Math.min(endMin, end));
    const rawWidth = (clampedEnd - clampedStart) / totalSpan;
    return Math.max(0.8, rawWidth * 97);
  };

  const isVisibleInWindow = (start: number, end: number): boolean => {
    return end > startMin && start < endMin;
  };

  // High-saturation, high-contrast, easily distinguishable color classes
  const getDepartmentColorClass = (dept: string) => {
    switch (dept) {
      case 'ENGINEERING':
        return 'bg-teal-700 text-white border-teal-800 hover:bg-teal-800';
      case 'TRACTION_TRD':
        return 'bg-orange-600 text-white border-orange-700 hover:bg-orange-700';
      case 'SIGNAL_TELECOM':
        return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700';
      default:
        return 'bg-slate-700 text-white border-slate-800';
    }
  };

  const getTrainColorClass = (type: string) => {
    switch (type) {
      case 'PASSENGER_PREMIUM':
        return 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700';
      case 'PASSENGER_REGULAR':
        return 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700';
      case 'FREIGHT':
        return 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700';
      default:
        return 'bg-slate-600 text-white border-slate-700';
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden text-slate-900">
      {/* Chart Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Corridor Possession & Traffic Gantt</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            Ghaziabad – Aligarh Jn • 106.0 KM
          </span>
          <span className="text-slate-500 font-mono text-xs font-semibold">
            {scheduledBlocks.length} Possessions Scheduled
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5">
            <button
              onClick={() => setViewMode('SEGMENT')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'SEGMENT'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Track Segment
            </button>
            <button
              onClick={() => setViewMode('DEPARTMENT')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'DEPARTMENT'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Department
            </button>
          </div>

          {/* Zoom Toggle */}
          <div className="inline-flex rounded border border-slate-300 bg-slate-100 p-0.5">
            <button
              onClick={() => setZoomLevel('FULL')}
              title="View full 12-hour horizon (00:00 - 12:00)"
              className={`px-2 py-1 rounded text-[11px] flex items-center space-x-1 ${
                zoomLevel === 'FULL'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3 h-3 text-slate-700" />
              <span>12h Full</span>
            </button>
            <button
              onClick={() => setZoomLevel('VALLEY')}
              title="Focus on early-morning low-traffic window (02:00 - 08:00)"
              className={`px-2 py-1 rounded text-[11px] flex items-center space-x-1 ${
                zoomLevel === 'VALLEY'
                  ? 'bg-white text-slate-900 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ZoomIn className="w-3 h-3 text-emerald-600" />
              <span>02:00–08:00 Window</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-700"></span>
            <span className="font-medium">Premium Train (Rajdhani/Shatabdi)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 border border-blue-700"></span>
            <span className="font-medium">Regular Passenger Express</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 border border-amber-700"></span>
            <span className="font-medium">Freight Rake</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-700 border border-teal-800"></span>
            <span className="font-medium">TMS Engineering</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 border border-orange-700"></span>
            <span className="font-medium">TDMS Electrical/OHE</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 border border-indigo-700"></span>
            <span className="font-medium">SMMS S&T</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3.5 h-2.5 rounded-sm bg-purple-800 border border-purple-950"></span>
            <span className="text-purple-900 font-bold">Integrated Joint Possession</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[10px] text-slate-600 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Collision-Free Verification Active</span>
          </span>
        </div>
      </div>

      {/* Main Gantt Grid Container with Smooth Scrollbar & Sticky Left Lane */}
      <div className="overflow-x-auto relative hover-scrollbar">
        <div className="min-w-[1020px]">
          {/* Timeline Header Row */}
          <div className="flex border-b border-slate-300 bg-slate-50 sticky top-0 z-20">
            {/* Sticky Left Column Header */}
            <div className="w-64 flex-shrink-0 px-3 py-2 bg-slate-50 border-r border-slate-300 text-[11px] font-bold text-slate-700 flex items-center justify-between sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
              <span>Corridor Division & Schedule</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Time Ticks Across Track */}
            <div className="flex-1 relative h-9 pr-6">
              {hourMarks.map((m) => {
                const leftPercent = getPositionPercent(m);
                return (
                  <div
                    key={m}
                    className="absolute top-0 bottom-0 flex flex-col justify-between"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <div className="h-2 w-px bg-slate-400"></div>
                    <span className="text-[10px] font-mono font-semibold text-slate-600 -translate-x-1/2 pb-1 select-none">
                      {formatMinutesToTime(m)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Segment-Based View */}
          {viewMode === 'SEGMENT' && (
            <div className="divide-y divide-slate-200">
              {SEGMENTS.filter((seg) => filterSegment === 'ALL' || filterSegment === seg.id).map(
                (segment) => {
                  // Trains in this segment
                  const segTrains = trainOccupancies.filter(
                    (to) =>
                      to.segmentId === segment.id &&
                      isVisibleInWindow(to.enterMin, to.exitMin)
                  );

                  // Possessions in this segment
                  const segBlocks = visibleBlocks.filter((b) => {
                    const overlaps =
                      Math.max(b.start_km, segment.startKm) < Math.min(b.end_km, segment.endKm);
                    return overlaps && isVisibleInWindow(b.scheduled_start_min, b.scheduled_end_min);
                  });

                  return (
                    <div key={segment.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                      {/* Segment Title & Station Chainage */}
                      <div className="flex items-center bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 text-xs">
                        <div className="w-64 flex-shrink-0 sticky left-0 z-10 bg-slate-100/90 flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{segment.name}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-between text-[11px] text-slate-600 px-2 pr-6">
                          <span className="font-mono text-slate-500">{segment.stations}</span>
                          <span className="text-slate-600 font-mono text-[10px] font-semibold">
                            KM {segment.startKm.toFixed(1)} – {segment.endKm.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Lane 1: Train Traffic (COA Timetable) */}
                      <div className="flex items-stretch border-b border-slate-200 min-h-[40px]">
                        {/* Sticky left lane title */}
                        <div className="w-64 flex-shrink-0 px-3 py-1.5 bg-slate-50 border-r border-slate-300 flex items-center justify-between sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                          <div className="text-[11px] text-slate-800 font-semibold">Train Traffic (COA)</div>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">
                            {segTrains.length} rakes
                          </span>
                        </div>

                        {/* Track area */}
                        <div className="flex-1 relative h-10 bg-white pr-6">
                          {/* Hour background guide lines */}
                          {hourMarks.map((m) => (
                            <div
                              key={m}
                              className="absolute top-0 bottom-0 w-px bg-slate-200 pointer-events-none"
                              style={{ left: `${getPositionPercent(m)}%` }}
                            />
                          ))}

                          {/* Render Train Occupancy Bars */}
                          {segTrains.map((to) => {
                            const left = getPositionPercent(to.enterMin);
                            const width = getWidthPercent(to.enterMin, to.exitMin);
                            const colorClass = getTrainColorClass(to.train.type);

                            return (
                              <div
                                key={`${to.train.id}-${segment.id}`}
                                onMouseEnter={() =>
                                  setHoveredItem({
                                    type: 'TRAIN',
                                    id: to.train.id,
                                    title: `${to.train.id} • ${to.train.name}`,
                                    subtitle: `${to.train.type.replace('_', ' ')} • Priority ${to.train.priority}`,
                                    startTime: formatMinutesToTime(to.enterMin),
                                    endTime: formatMinutesToTime(to.exitMin),
                                    duration: to.exitMin - to.enterMin,
                                    details: {
                                      Segment: segment.name,
                                      'Corridor Run': `KM ${to.train.start_km} → ${to.train.end_km}`,
                                      'Overall Timetable': `${formatMinutesToTime(to.train.dep_min)} – ${formatMinutesToTime(to.train.arr_min)}`,
                                    },
                                  })
                                }
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`absolute top-1.5 bottom-1.5 rounded px-2 flex items-center overflow-hidden cursor-pointer border text-[10px] font-mono shadow-sm transition-colors hover:ring-2 hover:ring-slate-900 ${colorClass}`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                }}
                              >
                                <span className="font-bold truncate select-none">
                                  {to.train.id} {to.train.name.split(' ')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Lane 2: Maintenance Possessions (ABPS Scheduled) */}
                      <div className="flex items-stretch min-h-[46px]">
                        {/* Sticky left lane title */}
                        <div className="w-64 flex-shrink-0 px-3 py-1.5 bg-slate-50 border-r border-slate-300 flex items-center justify-between sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                          <div className="text-[11px] text-slate-800 font-semibold">Possessions (ABPS)</div>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">
                            {segBlocks.length} blocks
                          </span>
                        </div>

                        {/* Track area */}
                        <div className="flex-1 relative h-11 bg-slate-50/40 pr-6">
                          {/* Hour background guide lines */}
                          {hourMarks.map((m) => (
                            <div
                              key={m}
                              className="absolute top-0 bottom-0 w-px bg-slate-200 pointer-events-none"
                              style={{ left: `${getPositionPercent(m)}%` }}
                            />
                          ))}

                          {/* Render Possession Bars */}
                          {segBlocks.map((block) => {
                            const left = getPositionPercent(block.scheduled_start_min);
                            const width = getWidthPercent(
                              block.scheduled_start_min,
                              block.scheduled_end_min
                            );
                            const isSelected = selectedBlockId === block.demand_id;
                            const isBundled = block.is_bundled;
                            const isAuthorized = block.status === 'AUTHORIZED';

                            const baseClass = isBundled
                              ? 'bg-purple-800 text-white border-2 border-purple-950 shadow-md hover:bg-purple-900'
                              : getDepartmentColorClass(block.department);

                            return (
                              <div
                                key={`${block.demand_id}-${segment.id}`}
                                onClick={() => onSelectBlock(block.demand_id)}
                                onMouseEnter={() => {
                                  const demand = demandMap.get(block.demand_id);
                                  setHoveredItem({
                                    type: 'BLOCK',
                                    id: block.demand_id,
                                    title: `${block.demand_id} • ${block.activity}`,
                                    subtitle: `${block.department} (${block.system}) • DCS ${block.criticality_score}/100`,
                                    startTime: formatMinutesToTime(block.scheduled_start_min),
                                    endTime: formatMinutesToTime(block.scheduled_end_min),
                                    duration: block.duration_minutes,
                                    details: {
                                      Segment: segment.name,
                                      'Spatial Span': `KM ${block.start_km.toFixed(1)} – ${block.end_km.toFixed(1)}`,
                                      'Bundling Status': isBundled
                                        ? `INTEGRATED (${block.bundled_with.length} joint demands)`
                                        : 'Standalone Block',
                                      'Safety Token': block.system_private_number || 'PENDING G&SR HANDSHAKE',
                                      'Power Block': demand?.power_block_required ? 'REQUIRED (TPC Isolation)' : 'NOT REQUIRED',
                                      'Signal Disconnection': demand?.signal_disconnection_required ? 'REQUIRED' : 'NOT REQUIRED',
                                    },
                                  });
                                }}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={`absolute top-1.5 bottom-1.5 rounded px-2 flex items-center justify-between overflow-hidden cursor-pointer border text-[10px] font-sans shadow-sm transition-colors hover:ring-2 hover:ring-slate-900 ${baseClass} ${
                                  isSelected ? 'ring-2 ring-blue-600 z-10' : ''
                                }`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                }}
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  {isBundled && (
                                    <span className="px-1 py-0.2 rounded bg-white text-purple-900 font-extrabold text-[9px] uppercase tracking-wider">
                                      JOINT
                                    </span>
                                  )}
                                  <span className="font-bold truncate">
                                    {block.demand_id}: {block.activity}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                                  {isAuthorized ? (
                                    <span className="px-1 py-0.2 rounded bg-emerald-400 text-emerald-950 font-mono font-bold text-[9px]">
                                      PTW
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[9px] opacity-90">
                                      {block.duration_minutes}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Department-Based View */}
          {viewMode === 'DEPARTMENT' && (
            <div className="divide-y divide-slate-200">
              {['ENGINEERING', 'TRACTION_TRD', 'SIGNAL_TELECOM'].map((dept) => {
                const deptBlocks = visibleBlocks.filter((b) => b.department === dept);

                return (
                  <div key={dept} className="flex items-stretch min-h-[48px] bg-white hover:bg-slate-50">
                    <div className="w-64 flex-shrink-0 px-3 py-2 bg-slate-50 border-r border-slate-300 flex flex-col justify-center sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                      <div className="text-xs font-bold text-slate-800">{dept}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {dept === 'ENGINEERING'
                          ? 'TMS Track Maintenance'
                          : dept === 'TRACTION_TRD'
                          ? 'TDMS Electrical / OHE'
                          : 'SMMS Signalling & Telecom'}
                      </div>
                    </div>

                    <div className="flex-1 relative h-12 bg-white pr-6">
                      {hourMarks.map((m) => (
                        <div
                          key={m}
                          className="absolute top-0 bottom-0 w-px bg-slate-200 pointer-events-none"
                          style={{ left: `${getPositionPercent(m)}%` }}
                        />
                      ))}

                      {deptBlocks.map((block) => {
                        const left = getPositionPercent(block.scheduled_start_min);
                        const width = getWidthPercent(
                          block.scheduled_start_min,
                          block.scheduled_end_min
                        );
                        const isSelected = selectedBlockId === block.demand_id;
                        const isBundled = block.is_bundled;

                        return (
                          <div
                            key={block.demand_id}
                            onClick={() => onSelectBlock(block.demand_id)}
                            className={`absolute top-2 bottom-2 rounded px-2 flex items-center justify-between cursor-pointer border text-[10px] ${getDepartmentColorClass(
                              block.department
                            )} ${isSelected ? 'ring-2 ring-blue-600 z-10' : ''}`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
                          >
                            <span className="font-bold truncate">
                              {block.demand_id} ({block.duration_minutes}m)
                            </span>
                            {isBundled && (
                              <span className="ml-1 text-[9px] bg-white text-purple-900 px-1 rounded font-extrabold">
                                JOINT
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Persistent Fixed-Height Inspection Dock: Eliminates Stutter and Layout Jumps completely */}
      <div className="min-h-[52px] px-4 py-2.5 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-xs">
        {hoveredItem ? (
          <div className="flex flex-wrap items-center justify-between w-full gap-3">
            <div className="flex items-center space-x-3">
              <span className={`w-12 h-6 rounded font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-white ${
                hoveredItem.type === 'TRAIN' ? 'bg-blue-800' : 'bg-purple-900'
              }`}>
                {hoveredItem.type === 'TRAIN' ? 'TRAIN' : 'BLOCK'}
              </span>
              <div>
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <span>{hoveredItem.title}</span>
                  <span className="text-slate-500 font-normal">({hoveredItem.subtitle})</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Window: {hoveredItem.startTime} – {hoveredItem.endTime} ({hoveredItem.duration} min)
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-700">
              {Object.entries(hoveredItem.details).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-1">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-slate-900 font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
            <Info className="w-4 h-4 text-slate-400" />
            <span>
              Hover over any train or possession block to inspect live clearance, speed, and safety parameters. Click any possession to initiate G&SR Rule 15.06 PTW Handshake.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
