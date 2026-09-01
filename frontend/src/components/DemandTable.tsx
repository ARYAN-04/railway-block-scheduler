import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { MaintenanceDemand, ScheduledBlock, Train } from '../types';

interface DemandTableProps {
  demands: MaintenanceDemand[];
  blocks: ScheduledBlock[];
  trains?: Train[];
  onOpenHandshake: (blockId: string) => void;
  selectedBlockId?: string | null;
  filterDepartment?: string;
  filterStatus?: string;
  searchQuery?: string;
}

export const DemandTable: React.FC<DemandTableProps> = ({
  demands,
  blocks,
  trains = [],
  onOpenHandshake,
  selectedBlockId,
  filterDepartment = 'ALL',
  filterStatus = 'ALL',
  searchQuery = '',
}) => {
  const [activeTab, setActiveTab] = useState<'POSSESSIONS' | 'TRAINS'>('POSSESSIONS');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Map demand ID to ScheduledBlock
  const blockMap = useMemo(() => {
    const map = new Map<string, ScheduledBlock>();
    blocks.forEach((b) => map.set(b.demand_id, b));
    return map;
  }, [blocks]);

  const formatTime = (min?: number): string => {
    if (min === undefined) return '--:--';
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Filter demands
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (filterDepartment !== 'ALL' && d.department !== filterDepartment) return false;

      const block = blockMap.get(d.id);
      if (filterStatus === 'BUNDLED' && !block?.is_bundled) return false;
      if (filterStatus === 'AUTHORIZED' && block?.status !== 'AUTHORIZED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          d.id.toLowerCase().includes(q) ||
          d.activity.toLowerCase().includes(q) ||
          d.asset_type.toLowerCase().includes(q) ||
          d.system.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [demands, filterDepartment, filterStatus, searchQuery, blockMap]);

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden text-slate-800">
      {/* Sub-header Tabs */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('POSSESSIONS')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'POSSESSIONS'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Corridor Possessions & Demands ({filteredDemands.length})
          </button>
          <button
            onClick={() => setActiveTab('TRAINS')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
              activeTab === 'TRAINS'
                ? 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Train Timetable & Fleet ({trains.length})
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          {activeTab === 'POSSESSIONS' ? (
            <span>TMS • TDMS • SMMS High-Density Records</span>
          ) : (
            <span>COA Active Train Timetable & Routes</span>
          )}
        </div>
      </div>

      {/* Rows Container */}
      <div className="divide-y divide-slate-200 bg-white">
        {activeTab === 'POSSESSIONS' ? (
          filteredDemands.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              No maintenance demands match the selected filters.
            </div>
          ) : (
            filteredDemands.map((demand) => {
              const block = blockMap.get(demand.id);
              const isSelected = selectedBlockId === demand.id;
              const isExpanded = expandedId === demand.id;
              const isBundled = block?.is_bundled;
              const isAuthorized = block?.status === 'AUTHORIZED';

              // Clean, un-sloped department tag (no pastel circles)
              const renderDeptTag = () => {
                if (demand.department === 'TRACTION_TRD') {
                  return (
                    <span className="w-12 h-6 rounded bg-orange-700 text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      TDMS
                    </span>
                  );
                }
                if (demand.department === 'SIGNAL_TELECOM') {
                  return (
                    <span className="w-12 h-6 rounded bg-indigo-700 text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      SMMS
                    </span>
                  );
                }
                return (
                  <span className="w-12 h-6 rounded bg-teal-800 text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    TMS
                  </span>
                );
              };

              const isDegradedOrCritical = demand.severity === 'CRITICAL' || demand.urgency_days_overdue > 10;
              const rowBg = isSelected
                ? 'bg-blue-50/70 ring-1 ring-blue-500'
                : isDegradedOrCritical
                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                : 'bg-white hover:bg-slate-50';

              return (
                <div key={demand.id} className={`${rowBg} transition-colors`}>
                  {/* Main High-Density Row matching screenshot layout */}
                  <div className="px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs">
                    {/* Left: Department Tag, Title & Subtitle */}
                    <div className="flex items-center space-x-3 min-w-[260px] lg:w-[320px] flex-shrink-0">
                      {renderDeptTag()}
                      <div className="truncate">
                        <div className="font-bold text-slate-900 truncate hover:text-blue-700 transition-colors">
                          {demand.id} • {demand.activity}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5 truncate">
                          <span className="font-medium text-slate-700">{demand.duration_minutes} min</span>
                          <span>•</span>
                          <span>KM {demand.start_km.toFixed(1)}–{demand.end_km.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Columns: Clean Technical Data (no pastel bubbles) */}
                    <div className="hidden sm:flex items-center space-x-4 text-[11px] font-mono text-slate-700 flex-1 justify-around px-2">
                      {/* Asset Type */}
                      <div className="flex flex-col items-start min-w-[65px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">ASSET</span>
                        <span className="font-semibold text-slate-900">{demand.asset_type}</span>
                      </div>

                      {/* Track GMT */}
                      <div className="flex flex-col items-start min-w-[65px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">GMT</span>
                        <span className="text-slate-800 font-semibold">{demand.track_gmt}</span>
                      </div>

                      {/* Power Block Interlock: Clean industrial indicator */}
                      <div className="flex flex-col items-start min-w-[70px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">POWER BLK</span>
                        {demand.power_block_required ? (
                          <span className="text-orange-800 font-bold text-xs">Required</span>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </div>

                      {/* Signal Disconnection: Clean industrial indicator */}
                      <div className="flex flex-col items-start min-w-[70px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">SIG DISC</span>
                        {demand.signal_disconnection_required ? (
                          <span className="text-indigo-800 font-bold text-xs">Required</span>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </div>

                      {/* Scheduled Window */}
                      <div className="flex flex-col items-start min-w-[90px]">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">SLOT</span>
                        <div className="text-[11px] font-bold text-slate-900">
                          {block ? (
                            <span>{formatTime(block.scheduled_start_min)} – {formatTime(block.scheduled_end_min)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Unscheduled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Clean Operational Status Button & Count Boxes */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0">
                      {/* Clean Industrial Status Box (matches reference screenshot style) */}
                      <button
                        onClick={() => onOpenHandshake(demand.id)}
                        className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 flex items-center space-x-1.5 font-sans text-xs font-semibold shadow-sm transition-colors"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAuthorized
                              ? 'bg-emerald-600'
                              : isBundled
                              ? 'bg-purple-700'
                              : isDegradedOrCritical
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                        />
                        <span className="font-bold">
                          {isAuthorized
                            ? 'PTW Authorized'
                            : isBundled
                            ? 'Integrated Joint'
                            : isDegradedOrCritical
                            ? 'Degraded Mode'
                            : 'Operational'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                      </button>

                      {/* Numeric Indicator Badges (matching screenshot's square boxes) */}
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <span
                          title="Conflicts: 0"
                          className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-bold"
                        >
                          0
                        </span>

                        <span
                          title={isBundled ? `${block?.bundled_with.length} Joint Bundled Demands` : '0 Bundled Peers'}
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            isBundled
                              ? 'bg-purple-800 text-white'
                              : 'bg-slate-100 border border-slate-300 text-slate-500'
                          }`}
                        >
                          {isBundled ? (block?.bundled_with.length || 1) : 0}
                        </span>

                        <span
                          title={`DCS Criticality: ${demand.criticality_score || 80}/100`}
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            isDegradedOrCritical
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 border border-slate-300 text-slate-600'
                          }`}
                        >
                          {demand.severity === 'CRITICAL' ? 'C' : demand.severity === 'URGENT' ? 'U' : 'R'}
                        </span>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : demand.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs font-mono text-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Asset & Work Scope
                        </div>
                        <div className="text-slate-900 font-bold mt-0.5">{demand.asset_type}</div>
                        <div className="text-[11px] text-slate-600">
                          Activity: {demand.activity}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Spatial Span: KM {demand.start_km.toFixed(1)} to KM {demand.end_km.toFixed(1)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">
                          Safety & Interlock Directives
                        </div>
                        <div className="mt-0.5 flex flex-col space-y-0.5 text-[11px]">
                          <div>
                            Traction Power Block:{' '}
                            <span className={demand.power_block_required ? 'text-amber-800 font-bold' : 'text-slate-500'}>
                              {demand.power_block_required ? 'MANDATORY (TPC PN Required)' : 'NOT REQUIRED'}
                            </span>
                          </div>
                          <div>
                            Signal Disconnection:{' '}
                            <span className={demand.signal_disconnection_required ? 'text-indigo-800 font-bold' : 'text-slate-500'}>
                              {demand.signal_disconnection_required ? 'MANDATORY (S&T Interlock)' : 'NOT REQUIRED'}
                            </span>
                          </div>
                          <div>
                            Overdue Days: <span className="text-slate-900 font-bold">{demand.urgency_days_overdue} days</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-bold">
                            G&SR PTW Status
                          </div>
                          <div className="mt-0.5 text-[11px]">
                            {block?.system_private_number ? (
                              <div className="text-emerald-700 font-bold">
                                PN: {block.system_private_number} (PTW: {block.ptw_id})
                              </div>
                            ) : (
                              <div className="text-slate-500 font-semibold">
                                Pending Private Number Exchange
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => onOpenHandshake(demand.id)}
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-sans font-bold transition-colors shadow-sm"
                          >
                            Open Digital PTW Form
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Trains Fleet Tab */
          trains.map((train) => (
            <div key={train.id} className="bg-white hover:bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors">
              <div className="flex items-center space-x-3 min-w-[260px] lg:w-[320px]">
                <span className="w-12 h-6 rounded bg-blue-800 text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  TRAIN
                </span>
                <div className="truncate">
                  <div className="font-bold text-slate-900 truncate">
                    {train.id} • {train.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {train.type.replace('_', ' ')} • Priority {train.priority}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-6 text-[11px] font-mono text-slate-700 flex-1 justify-around px-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">CORRIDOR</span>
                  <span className="font-bold">KM {train.start_km} → {train.end_km}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">DEPARTURE</span>
                  <span className="font-bold">{formatTime(train.dep_min)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ARRIVAL</span>
                  <span className="font-bold">{formatTime(train.arr_min)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">TRANSIT</span>
                  <span className="font-bold">{train.arr_min - train.dep_min} min</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-800 flex items-center space-x-1.5 font-sans text-xs font-semibold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span className="font-bold">Operational</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="flex items-center space-x-1 font-mono text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-bold">
                    0
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 font-bold">
                    0
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
