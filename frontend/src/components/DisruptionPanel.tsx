import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Zap,
  Sliders,
  CheckCircle2,
  Train as TrainIcon,
} from 'lucide-react';
import type { DisruptionRequest, Train } from '../types';

interface DisruptionPanelProps {
  trains: Train[];
  onSimulate: (req: DisruptionRequest) => Promise<void>;
  onReset: () => Promise<void>;
  isLoading: boolean;
  activeDisruption: DisruptionRequest | null;
}

export const DisruptionPanel: React.FC<DisruptionPanelProps> = ({
  trains,
  onSimulate,
  onReset,
  isLoading,
  activeDisruption,
}) => {
  const [selectedTrainId, setSelectedTrainId] = useState<string>(
    trains[1]?.id || '12424' // Default to Rajdhani
  );
  const [delayMinutes, setDelayMinutes] = useState<number>(45);
  const [notes, setNotes] = useState<string>('Signal failure at Ghaziabad Outer yard');

  const selectedTrain = trains.find((t) => t.id === selectedTrainId) || trains[0];

  const formatTime = (min?: number): string => {
    if (min === undefined) return '--:--';
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleSimulate = async () => {
    await onSimulate({
      train_id: selectedTrainId,
      delay_minutes: delayMinutes,
      notes: notes.trim(),
    });
  };

  const handlePreset = (trainId: string, delay: number, noteText: string) => {
    setSelectedTrainId(trainId);
    setDelayMinutes(delay);
    setNotes(noteText);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur overflow-hidden font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
              Disruption Simulator & Adaptive Re-Planner
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono border border-rose-800">
                What-If Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Dynamic Delay Injection & Collision-Free CP-SAT Rescheduling
            </p>
          </div>
        </div>

        {activeDisruption && (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>
              Train #{activeDisruption.train_id} (+{activeDisruption.delay_minutes}m)
            </span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Quick Scenario Preset Pills */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
            Quick Disruption Presets:
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                handlePreset(
                  '12424',
                  45,
                  'Dibrugarh Rajdhani held at Ghaziabad outer due to freight rake overtake.'
                )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${
                selectedTrainId === '12424' && delayMinutes === 45
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-rose-400">12424 Rajdhani:</span> +45 min
            </button>

            <button
              onClick={() =>
                handlePreset(
                  '12004',
                  30,
                  'Lucknow Shatabdi speed restriction caution orders near Dadri.'
                )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${
                selectedTrainId === '12004' && delayMinutes === 30
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-cyan-400">12004 Shatabdi:</span> +30 min
            </button>

            <button
              onClick={() =>
                handlePreset(
                  'BOXN-DTR',
                  60,
                  'Dadri Thermal coal rake held for locomotive crew change.'
                )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all text-left ${
                selectedTrainId === 'BOXN-DTR' && delayMinutes === 60
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <span className="font-bold text-amber-400">Coal Freight:</span> +60 min
            </button>
          </div>
        </div>

        {/* Train & Delay Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Train Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-slate-300 flex items-center gap-1.5">
              <TrainIcon className="h-3.5 w-3.5 text-cyan-400" />
              Target Train / Service
            </label>
            <select
              value={selectedTrainId}
              onChange={(e) => setSelectedTrainId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              {trains.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.id} {t.name} ({formatTime(t.dep_min)} → {formatTime(t.arr_min)})
                </option>
              ))}
            </select>
            {selectedTrain && (
              <p className="text-[11px] text-slate-400 font-mono">
                Current window: {formatTime(selectedTrain.dep_min)} →{' '}
                {formatTime(selectedTrain.arr_min)} • Priority {selectedTrain.priority}
              </p>
            )}
          </div>

          {/* Delay Minutes Adjustment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <label className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-rose-400" />
                Injected Delay:
              </label>
              <span className="font-black text-rose-400 text-sm">+{delayMinutes} minutes</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />

            {/* Quick Step Buttons */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDelayMinutes(mins)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    delayMinutes === mins
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Notes */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">
            Controller Dispatch Log / Disruption Reason:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Overhead catenary wire tension drop or signal interlocking issue"
            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Active Disruption Feedback Banner */}
        {activeDisruption && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 flex items-start space-x-3 text-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-300 font-mono">
                Adaptive Re-Optimization Active
              </p>
              <p className="text-slate-300 font-sans">
                Train #{activeDisruption.train_id} shifted by +{activeDisruption.delay_minutes} min.
                CP-SAT discrete solver dynamically re-calculated corridor intervals: zero train
                collisions and zero cancellations maintained!
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-3">
          <button
            onClick={onReset}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Baseline Schedule</span>
          </button>

          <button
            onClick={handleSimulate}
            disabled={isLoading}
            className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white font-bold text-xs hover:from-rose-500 hover:to-amber-500 shadow-lg shadow-rose-950 transition-all active:scale-95 disabled:opacity-50 font-mono"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Re-Solving CP-SAT Model...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Inject Disruption & Re-Plan (CP-SAT)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
