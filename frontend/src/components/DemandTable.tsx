import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Layers,
  ShieldCheck,
  Search,
  AlertTriangle,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type { MaintenanceDemand, ScheduledBlock } from '../types';

interface DemandTableProps {
  demands: MaintenanceDemand[];
  blocks: ScheduledBlock[];
  onOpenHandshake: (blockId: string) => void;
  selectedBlockId?: string | null;
}

export const DemandTable: React.FC<DemandTableProps> = ({
  demands,
  blocks,
  onOpenHandshake,
  selectedBlockId,
}) => {
  const [filterDept, setFilterDept] = useState<'ALL' | 'TMS' | 'TDMS' | 'SMMS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Map demand ID to its scheduled block
  const blockByDemandId = useMemo(() => {
    const map = new Map<string, ScheduledBlock>();
    for (const b of blocks) {
      map.set(b.demand_id, b);
    }
    return map;
  }, [blocks]);

  // Format minutes into HH:MM
  const formatTime = (min?: number): string => {
    if (min === undefined) return '--:--';
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      const matchesDept = filterDept === 'ALL' || d.system === filterDept;
      const matchesQuery =
        searchQuery.trim() === '' ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.asset_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesQuery;
    });
  }, [demands, filterDept, searchQuery]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              Cross-Department Maintenance Demands
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-mono border border-slate-700">
                TMS • TDMS • SMMS
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Dynamic Criticality Scoring ($DCS_m$) & G&SR PTW Digital Handshakes
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search demand or activity..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 font-mono w-44 sm:w-56"
            />
          </div>

          {/* Department Filter Tabs */}
          <div className="flex items-center rounded-lg bg-slate-800/80 p-1 border border-slate-700">
            {(['ALL', 'TMS', 'TDMS', 'SMMS'] as const).map((dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  filterDept === dept
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {dept === 'ALL' ? 'All (5)' : dept}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Demand ID & Dept</th>
              <th className="px-4 py-3">Activity & Asset</th>
              <th className="px-4 py-3">Location (KM)</th>
              <th className="px-4 py-3">Duration & Window</th>
              <th className="px-4 py-3">Criticality Score ($DCS$)</th>
              <th className="px-4 py-3">Bundling & Integration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Digital PTW Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredDemands.map((demand) => {
              const block = blockByDemandId.get(demand.id);
              const isSelected = selectedBlockId === demand.id;
              const isBundled = block?.is_bundled ?? false;
              const isAuthorized = block?.status === 'AUTHORIZED';
              const score = demand.criticality_score ?? block?.criticality_score ?? 50.0;

              return (
                <tr
                  key={demand.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    isSelected ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  {/* Demand ID & Dept Badge */}
                  <td className="px-4 py-3 font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-100">{demand.id}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          demand.system === 'TMS'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : demand.system === 'TDMS'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {demand.system}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                      {demand.department.replace('_', ' ')}
                    </p>
                  </td>

                  {/* Activity & Asset */}
                  <td className="px-4 py-3 font-sans">
                    <div className="font-medium text-slate-200">{demand.activity}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{demand.asset_type}</span>
                      {demand.power_block_required && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Power Block
                        </span>
                      )}
                      {demand.signal_disconnection_required && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Signal Disconn.
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-4 py-3">
                    <span className="text-slate-200">
                      KM {demand.start_km.toFixed(1)} – {demand.end_km.toFixed(1)}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Span: {Math.max(0.1, demand.end_km - demand.start_km).toFixed(1)} KM
                    </p>
                  </td>

                  {/* Duration & Window */}
                  <td className="px-4 py-3">
                    <span className="text-slate-200 font-bold">{demand.duration_minutes} min</span>
                    {block ? (
                      <p className="text-[11px] text-cyan-400">
                        {formatTime(block.scheduled_start_min)} → {formatTime(block.scheduled_end_min)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500">Awaiting Solver</p>
                    )}
                  </td>

                  {/* Criticality Score Meter */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {score >= 80 ? (
                        <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                      ) : score >= 60 ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      <span
                        className={`font-bold ${
                          score >= 80
                            ? 'text-rose-400'
                            : score >= 60
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {score.toFixed(1)}
                      </span>
                    </div>
                    {/* Visual Meter Bar */}
                    <div className="w-20 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score >= 80 ? 'bg-rose-500' : score >= 60 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {demand.urgency_days_overdue}d overdue • {demand.track_gmt} GMT
                    </p>
                  </td>

                  {/* Bundling & Integration */}
                  <td className="px-4 py-3">
                    {isBundled ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded bg-purple-950/80 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-800">
                          <Layers className="h-3 w-3" />
                          INTEGRATED BLOCK
                        </span>
                        {block?.bundled_with && block.bundled_with.length > 0 && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            With: {block.bundled_with.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500">Standalone</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {isAuthorized ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800">
                          <ShieldCheck className="h-3 w-3" />
                          AUTHORIZED
                        </span>
                        {block?.system_private_number && (
                          <p className="text-[9px] text-emerald-400 font-mono">
                            {block.system_private_number}
                          </p>
                        )}
                      </div>
                    ) : block ? (
                      <span className="inline-flex items-center rounded bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
                        SCHEDULED
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        PENDING
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    {isAuthorized ? (
                      <button
                        onClick={() => onOpenHandshake(demand.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 hover:bg-slate-750 border border-emerald-500/30 text-[11px] font-medium transition-all"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>View Token</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenHandshake(demand.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 text-[11px] font-bold shadow-md shadow-purple-950 transition-all active:scale-95"
                      >
                        <span>Grant PTW</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
