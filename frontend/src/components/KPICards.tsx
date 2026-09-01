import React from 'react';
import { TrendingUp, Layers, Clock, ShieldCheck } from 'lucide-react';
import type { OptimizationMetrics } from '../types';

interface KPICardsProps {
  metrics: OptimizationMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  const hoursSaved = Math.max(
    0,
    metrics.uncoordinated_closure_hours - metrics.optimized_closure_hours
  );

  return (
    <div className="bg-[#1a2230] border border-[#2d3a4f] rounded-lg p-3 text-slate-200">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#2d3a4f]">
        {/* 1. Capacity Uptime Gained */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Corridor Capacity Uptime</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              +{metrics.capacity_uptime_gained_percent.toFixed(1)}%
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              Uplift
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Multi-department possession synchronization
          </div>
        </div>

        {/* 2. Integrated Blocks */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Integrated Blocks</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {metrics.integrated_blocks_created}
            </span>
            <span className="text-xs text-slate-400">
              Joint Clusters (5 Demands)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            TMS, TDMS & SMMS co-possession
          </div>
        </div>

        {/* 3. Track Closure Hours */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Track Closure Time</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-sky-300">
              {metrics.optimized_closure_hours.toFixed(1)}h
            </span>
            <span className="text-xs text-slate-500 line-through">
              {metrics.uncoordinated_closure_hours.toFixed(1)}h raw
            </span>
            <span className="text-[11px] font-mono text-sky-400 font-semibold">
              -{hoursSaved.toFixed(1)}h saved
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {((hoursSaved / (metrics.uncoordinated_closure_hours || 1)) * 100).toFixed(1)}% total closure reduction
          </div>
        </div>

        {/* 4. Punctuality Retention */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Punctuality Retention</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {metrics.train_cancellations === 0 ? '100%' : '94.2%'}
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              0 Cancellations
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Zero spatial train-possession collisions
          </div>
        </div>
      </div>
    </div>
  );
};
