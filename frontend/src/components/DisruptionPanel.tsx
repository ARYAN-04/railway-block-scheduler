import React, { useState } from 'react';
import {
  RotateCcw,
  Sliders,
  Play,
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
  const [notes, setNotes] = useState<string>('Overhead wire snag / Speed restriction at Ghaziabad');

  const selectedTrain = trains.find((t) => t.id === selectedTrainId) || trains[0];

  const formatTime = (min?: number): string => {
    if (min === undefined) return '--:--';
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
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
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 font-bold text-slate-800">
          <Sliders className="w-4 h-4 text-amber-600" />
          <span>What-If Disruption Simulator & Re-Planner</span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-500 font-normal">
            Dynamic Schedule Conflict Resolution
          </span>
        </div>

        {activeDisruption && (
          <div className="flex items-center space-x-2 text-[11px] font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
            <span className="font-semibold">
              Active Delay: Train {activeDisruption.train_id} (+{activeDisruption.delay_minutes}m)
            </span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Preset Scenarios Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 font-bold">Scenarios:</span>
          <button
            onClick={() =>
              handlePreset('12424', 45, 'OHE voltage fluctuation between Dadri and Dankaur')
            }
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-mono text-slate-800 font-medium transition-colors"
          >
            Rajdhani (+45 min)
          </button>
          <button
            onClick={() =>
              handlePreset('12004', 30, 'Point detection delay at Ajaibpur Jn')
            }
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-mono text-slate-800 font-medium transition-colors"
          >
            Shatabdi (+30 min)
          </button>
          <button
            onClick={() =>
              handlePreset('BOXN-DTR', 60, 'Thermal coal rake brake-pipe pressure drop')
            }
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-mono text-slate-800 font-medium transition-colors"
          >
            Freight Coal Rake (+60 min)
          </button>
        </div>

        {/* Train & Delay Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
          {/* Select Train */}
          <div>
            <label className="block text-[11px] text-slate-600 font-bold mb-1">
              Select Train Trajectory
            </label>
            <select
              value={selectedTrainId}
              onChange={(e) => setSelectedTrainId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 shadow-sm"
            >
              {trains.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} - {t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>

          {/* Delay Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold mb-1">
              <span>Inject Delay:</span>
              <span className="font-bold text-amber-700 font-mono">+{delayMinutes} minutes</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>+10m</span>
              <span>+60m</span>
              <span>+120m</span>
            </div>
          </div>

          {/* Operational Cause */}
          <div>
            <label className="block text-[11px] text-slate-600 font-bold mb-1">
              Operational Root Cause
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Signal failure at yard"
              className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 shadow-sm"
            />
          </div>
        </div>

        {/* Selected Train Preview */}
        {selectedTrain && (
          <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Scheduled:</span>
              <span className="text-slate-800 font-bold">
                {formatTime(selectedTrain.dep_min)} → {formatTime(selectedTrain.arr_min)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-amber-800 font-bold">Simulated Disrupted:</span>
              <span className="text-amber-700 font-bold">
                {formatTime(selectedTrain.dep_min + delayMinutes)} → {formatTime(selectedTrain.arr_min + delayMinutes)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            onClick={onReset}
            disabled={isLoading}
            className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Reset Baseline Schedule</span>
          </button>

          <button
            onClick={handleSimulate}
            disabled={isLoading}
            className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isLoading ? 'Re-planning with CP-SAT...' : 'Trigger Adaptive Re-Planner'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
