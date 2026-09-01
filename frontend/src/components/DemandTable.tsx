import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Zap,
  Radio,
  Train as TrainIcon,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
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
    <div className="bg-[#1a2230] border border-[#2d3a4f] rounded-lg shadow-sm overflow-hidden text-slate-200">
      {/* Sub-header Tabs */}
      <div className="px-4 py-2 bg-[#141b26] border-b border-[#2d3a4f] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('POSSESSIONS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'POSSESSIONS'
                ? 'bg-[#27354a] text-slate-100 border border-[#3b4e6b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Corridor Possessions & Demands ({filteredDemands.length})
          </button>
          <button
            onClick={() => setActiveTab('TRAINS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeTab === 'TRAINS'
                ? 'bg-[#27354a] text-slate-100 border border-[#3b4e6b]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Train Timetable & Fleet ({trains.length})
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          {activeTab === 'POSSESSIONS' ? (
            <span>TMS • TDMS • SMMS High-Density Asset Records</span>
          ) : (
            <span>COA Active Train Consists & Trajectories</span>
          )}
        </div>
      </div>

      {/* Rows Container */}
      <div className="divide-y divide-[#253246] bg-[#121822]">
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

              // Specific Department Icon
              const renderDeptIcon = () => {
                if (demand.department === 'TRACTION_TRD') {
                  return (
                    <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-600/80 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                  );
                }
                if (demand.department === 'SIGNAL_TELECOM') {
                  return (
                    <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-600/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                  );
                }
                return (
                  <div className="w-8 h-8 rounded-full bg-sky-950/80 border border-sky-600/80 flex items-center justify-center text-sky-400 flex-shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                );
              };

              // Determine row background styling: Subtle warm tint for high overdue / critical items
              const isDegradedOrCritical = demand.severity === 'CRITICAL' || demand.urgency_days_overdue > 10;
              const rowBg = isSelected
                ? 'bg-[#222e40] ring-1 ring-sky-400'
                : isDegradedOrCritical
                ? 'bg-[#1c222b] hover:bg-[#202834]'
                : 'bg-[#151c27] hover:bg-[#18212e]';

              return (
                <div key={demand.id} className={`${rowBg} transition-colors`}>
                  {/* Main High-Density Row */}
                  <div className="px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 text-xs">
                    {/* Left: Round icon, Title & Subtitle */}
                    <div className="flex items-center space-x-3 min-w-[260px] lg:w-[320px] flex-shrink-0">
                      {renderDeptIcon()}
                      <div className="truncate">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-bold text-slate-100 truncate hover:text-sky-300 transition-colors">
                            {demand.id} • {demand.activity}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 truncate">
                          <span>{demand.department.replace('_', ' ')}:</span>
                          <span className="text-slate-300 font-semibold">{demand.duration_minutes} min</span>
                          <span>•</span>
                          <span>KM {demand.start_km.toFixed(1)}–{demand.end_km.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Columns: System, Specs, Interlocks, Windows */}
                    <div className="hidden sm:flex items-center space-x-4 text-[11px] font-mono text-slate-300 flex-1 justify-around px-2">
                      {/* System Code */}
                      <div className="flex flex-col items-start min-w-[60px]">
                        <span className="text-[10px] text-slate-500 uppercase">SYS</span>
                        <span className="font-semibold text-slate-200">{demand.system}</span>
                      </div>

                      {/* Track GMT */}
                      <div className="flex flex-col items-start min-w-[65px]">
                        <span className="text-[10px] text-slate-500 uppercase">GMT</span>
                        <span className="text-slate-300">{demand.track_gmt} GMT</span>
                      </div>

                      {/* Power Block Interlock */}
                      <div className="flex flex-col items-start min-w-[75px]">
                        <span className="text-[10px] text-slate-500 uppercase">POWER BLK</span>
                        {demand.power_block_required ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-900/60 border border-amber-600 text-amber-300 text-[10px] font-bold">
                            REQ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-[#1f2838] border border-[#2d3a4f] text-slate-400 text-[10px]">
                            OFF
                          </span>
                        )}
                      </div>

                      {/* Signal Disconnection */}
                      <div className="flex flex-col items-start min-w-[75px]">
                        <span className="text-[10px] text-slate-500 uppercase">SIG DISC</span>
                        {demand.signal_disconnection_required ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 border border-emerald-600 text-emerald-300 text-[10px] font-bold">
                            REQ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-[#1f2838] border border-[#2d3a4f] text-slate-400 text-[10px]">
                            OFF
                          </span>
                        )}
                      </div>

                      {/* Scheduled Window */}
                      <div className="flex flex-col items-start min-w-[90px]">
                        <span className="text-[10px] text-slate-500 uppercase">WINDOW</span>
                        <div className="text-[10px] font-semibold text-slate-200">
                          {block ? (
                            <span>{formatTime(block.scheduled_start_min)} – {formatTime(block.scheduled_end_min)}</span>
                          ) : (
                            <span className="text-slate-500">Unscheduled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Operational Status Pill & Counter Badges */}
                    <div className="flex items-center space-x-2.5 flex-shrink-0">
                      {/* Operational Status Box */}
                      {isAuthorized ? (
                        <button
                          onClick={() => onOpenHandshake(demand.id)}
                          className="px-2.5 py-1 rounded border border-emerald-500 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 flex items-center space-x-1 font-mono text-[11px] font-semibold transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-0.5" />
                          <span>Authorized PTW</span>
                          <ChevronRight className="w-3 h-3 text-emerald-400 ml-0.5" />
                        </button>
                      ) : isBundled ? (
                        <button
                          onClick={() => onOpenHandshake(demand.id)}
                          className="px-2.5 py-1 rounded border border-indigo-500 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 flex items-center space-x-1 font-mono text-[11px] font-semibold transition-colors"
                        >
                          <span>Integrated Joint</span>
                          <ChevronRight className="w-3 h-3 text-indigo-400 ml-0.5" />
                        </button>
                      ) : isDegradedOrCritical ? (
                        <button
                          onClick={() => onOpenHandshake(demand.id)}
                          className="px-2.5 py-1 rounded border border-amber-600 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 flex items-center space-x-1 font-mono text-[11px] font-semibold transition-colors"
                        >
                          <span>Critical Overdue</span>
                          <ChevronRight className="w-3 h-3 text-amber-400 ml-0.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenHandshake(demand.id)}
                          className="px-2.5 py-1 rounded border border-sky-600 bg-sky-950/30 text-sky-300 hover:bg-sky-900/40 flex items-center space-x-1 font-mono text-[11px] font-semibold transition-colors"
                        >
                          <span>Operational</span>
                          <ChevronRight className="w-3 h-3 text-sky-400 ml-0.5" />
                        </button>
                      )}

                      {/* Numeric Indicator Badges (matching screenshot's red/gray square boxes) */}
                      <div className="flex items-center space-x-1 font-mono text-[10px]">
                        {/* Conflicts Counter */}
                        <span
                          title="Train-Maintenance Conflicts: 0"
                          className="w-6 h-6 rounded bg-[#1f293a] border border-[#304058] flex items-center justify-center text-slate-300 font-bold"
                        >
                          0
                        </span>

                        {/* Joint Bundled Items Counter */}
                        <span
                          title={isBundled ? `${block?.bundled_with.length} Joint Bundled Demands` : '0 Bundled Peers'}
                          className={`w-6 h-6 rounded border flex items-center justify-center font-bold ${
                            isBundled
                              ? 'bg-indigo-950/90 border-indigo-500 text-indigo-300'
                              : 'bg-[#1f293a] border-[#304058] text-slate-400'
                          }`}
                        >
                          {isBundled ? (block?.bundled_with.length || 1) : 0}
                        </span>

                        {/* Critical Severity Level */}
                        <span
                          title={`DCS Criticality Score: ${demand.criticality_score || 80}/100`}
                          className={`w-6 h-6 rounded border flex items-center justify-center font-bold ${
                            isDegradedOrCritical
                              ? 'bg-rose-950/90 border-rose-600 text-rose-300'
                              : 'bg-[#1f293a] border-[#304058] text-slate-400'
                          }`}
                        >
                          {demand.severity === 'CRITICAL' ? 'C' : demand.severity === 'URGENT' ? 'U' : 'R'}
                        </span>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : demand.id)}
                        className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="px-6 py-3 bg-[#10151f] border-t border-[#222e40] text-xs font-mono text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">
                          Asset & Work Scope
                        </div>
                        <div className="text-slate-200 mt-0.5">{demand.asset_type}</div>
                        <div className="text-[11px] text-slate-400">
                          Activity: {demand.activity}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Spatial Span: KM {demand.start_km.toFixed(1)} to KM {demand.end_km.toFixed(1)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">
                          Safety & Interlock Directives
                        </div>
                        <div className="mt-0.5 flex flex-col space-y-0.5 text-[11px]">
                          <div>
                            Traction Power Block:{' '}
                            <span className={demand.power_block_required ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                              {demand.power_block_required ? 'MANDATORY (TPC PN Required)' : 'NOT REQUIRED'}
                            </span>
                          </div>
                          <div>
                            Signal Disconnection:{' '}
                            <span className={demand.signal_disconnection_required ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                              {demand.signal_disconnection_required ? 'MANDATORY (S&T Interlock)' : 'NOT REQUIRED'}
                            </span>
                          </div>
                          <div>
                            Overdue Days: <span className="text-slate-200">{demand.urgency_days_overdue} days</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">
                            G&SR PTW Status
                          </div>
                          <div className="mt-0.5 text-[11px]">
                            {block?.system_private_number ? (
                              <div className="text-emerald-400 font-bold">
                                PN: {block.system_private_number} (PTW: {block.ptw_id})
                              </div>
                            ) : (
                              <div className="text-amber-400">
                                Pending Private Number Exchange
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => onOpenHandshake(demand.id)}
                            className="px-3 py-1 rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-sans font-semibold transition-colors"
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
            <div key={train.id} className="bg-[#151c27] hover:bg-[#18212e] px-4 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors">
              <div className="flex items-center space-x-3 min-w-[260px] lg:w-[320px]">
                <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-600/80 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <TrainIcon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-100 truncate">
                    {train.id} • {train.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {train.type.replace('_', ' ')} • Priority {train.priority}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-6 text-[11px] font-mono text-slate-300 flex-1 justify-around px-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">CORRIDOR</span>
                  <span>KM {train.start_km} → {train.end_km}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">DEPARTURE</span>
                  <span>{formatTime(train.dep_min)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">ARRIVAL</span>
                  <span>{formatTime(train.arr_min)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">TRANSIT</span>
                  <span>{train.arr_min - train.dep_min} min</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className="px-2.5 py-1 rounded border border-emerald-500 bg-emerald-950/40 text-emerald-300 flex items-center space-x-1 font-mono text-[11px]">
                  <span>Operational / On-Time</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>

                <div className="flex items-center space-x-1 font-mono text-[10px]">
                  <span className="w-6 h-6 rounded bg-[#1f293a] border border-[#304058] flex items-center justify-center text-slate-300 font-bold">
                    0
                  </span>
                  <span className="w-6 h-6 rounded bg-[#1f293a] border border-[#304058] flex items-center justify-center text-slate-300 font-bold">
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
