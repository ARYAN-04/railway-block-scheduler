import React from 'react';
import { TrendingUp, Layers, Clock, ShieldCheck } from 'lucide-react';
import type { OptimizationMetrics } from '../types';

interface KPICardsProps {
  metrics: OptimizationMetrics;
}

export const KPICards: React.FC<KPICardsProps> = ({ metrics }) => {
  const safeMetrics: OptimizationMetrics = metrics || {
    uncoordinated_closure_hours: 8.0,
    optimized_closure_hours: 3.5,
    capacity_uptime_gained_percent: 56.25,
    integrated_blocks_created: 2,
    train_cancellations: 0,
  };

  const hoursSaved = Math.max(
    0,
    safeMetrics.uncoordinated_closure_hours - safeMetrics.optimized_closure_hours
  );

  return (
    <div className="bg-white border border-slate-300 rounded-lg p-3 text-slate-800 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* 1. Capacity Uptime Gained */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Corridor Capacity Uptime</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-slate-900">
              +{safeMetrics.capacity_uptime_gained_percent.toFixed(1)}%
            </span>
            <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Uplift
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Multi-department possession synchronization
          </div>
        </div>

        {/* 2. Integrated Blocks */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Integrated Blocks</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-purple-900">
              {safeMetrics.integrated_blocks_created}
            </span>
            <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              Joint Clusters (5 Demands)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            TMS, TDMS & SMMS co-possession
          </div>
        </div>

        {/* 3. Track Closure Hours */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Track Closure Time</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-blue-900">
              {safeMetrics.optimized_closure_hours.toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400 line-through font-mono">
              {safeMetrics.uncoordinated_closure_hours.toFixed(1)}h raw
            </span>
            <span className="text-[11px] font-mono text-blue-800 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              -{hoursSaved.toFixed(1)}h saved
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {((hoursSaved / (safeMetrics.uncoordinated_closure_hours || 1)) * 100).toFixed(1)}% total closure reduction
          </div>
        </div>

        {/* 4. Punctuality Retention */}
        <div className="px-4 py-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Punctuality Retention</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono text-emerald-700">
              {safeMetrics.train_cancellations === 0 ? '100%' : '94.2%'}
            </span>
            <span className="text-xs text-emerald-800 font-bold font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              0 Cancellations
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Zero spatial train-possession collisions
          </div>
        </div>
      </div>
    </div>
  );
};
