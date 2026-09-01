import React, { useState, useEffect } from 'react';
import {
  Train as TrainIcon,
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import {
  getCorridor,
  getTrains,
  getDemands,
  runOptimize,
  simulateDisruption,
  resetData,
} from './api';
import type {
  CorridorInfo,
  DisruptionRequest,
  GrantBlockResponse,
  MaintenanceDemand,
  OptimizationMetrics,
  ScheduledBlock,
  Train,
} from './types';
import { KPICards } from './components/KPICards';
import { MareyChart } from './components/MareyChart';
import { DemandTable } from './components/DemandTable';
import { DisruptionPanel } from './components/DisruptionPanel';
import { HandshakeModal } from './components/HandshakeModal';

export const App: React.FC = () => {
  // Application Data States
  const [corridor, setCorridor] = useState<CorridorInfo | null>(null);
  const [trains, setTrains] = useState<Train[]>([]);
  const [demands, setDemands] = useState<MaintenanceDemand[]>([]);
  const [scheduledBlocks, setScheduledBlocks] = useState<ScheduledBlock[]>([]);
  const [metrics, setMetrics] = useState<OptimizationMetrics>({
    uncoordinated_closure_hours: 8.0,
    optimized_closure_hours: 3.5,
    capacity_uptime_gained_percent: 56.25,
    integrated_blocks_created: 2,
    train_cancellations: 0,
  });

  // UI Interactive States
  const [isOptimizing, setIsOptimizing] = useState(true);
  const [isDisrupting, setIsDisrupting] = useState(false);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionRequest | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isHandshakeOpen, setIsHandshakeOpen] = useState(false);
  const [lastOptimizedAt, setLastOptimizedAt] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live Control Room Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [corrData, trainData, demandData, optData] = await Promise.all([
          getCorridor(),
          getTrains(),
          getDemands(),
          runOptimize(),
        ]);
        if (!isMounted) return;
        setCorridor(corrData);
        setTrains(trainData);
        setDemands(demandData);
        setScheduledBlocks(optData.scheduled_blocks);
        setMetrics(optData.metrics);
        setLastOptimizedAt(new Date().toLocaleTimeString('en-IN', { hour12: false }));
      } catch {
        // Fallback is handled automatically in api.ts
      } finally {
        if (isMounted) setIsOptimizing(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Run Optimizer Trigger
  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const optData = await runOptimize();
      setScheduledBlocks(optData.scheduled_blocks);
      setMetrics(optData.metrics);
      setLastOptimizedAt(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    } finally {
      setIsOptimizing(false);
    }
  };

  // Disruption Simulation Trigger
  const handleSimulateDisruption = async (req: DisruptionRequest) => {
    setIsDisrupting(true);
    try {
      const res = await simulateDisruption(req);
      setActiveDisruption(req);
      // Reload trains to reflect shifted schedule
      const updatedTrains = await getTrains();
      setTrains(updatedTrains);
      setScheduledBlocks(res.scheduled_blocks);
      setMetrics(res.metrics);
    } finally {
      setIsDisrupting(false);
    }
  };

  // Reset to Baseline
  const handleReset = async () => {
    setIsDisrupting(true);
    try {
      const res = await resetData();
      setActiveDisruption(null);
      const [corrData, trainData, demandData] = await Promise.all([
        getCorridor(),
        getTrains(),
        getDemands(),
      ]);
      setCorridor(corrData);
      setTrains(trainData);
      setDemands(demandData);
      setScheduledBlocks(res.scheduled_blocks);
      setMetrics(res.metrics);
    } finally {
      setIsDisrupting(false);
    }
  };

  // Open Handshake Modal for given block ID or demand ID
  const handleOpenHandshake = (blockOrDemandId: string) => {
    setSelectedBlockId(blockOrDemandId);
    setIsHandshakeOpen(true);
  };

  // Selected block for Handshake modal
  const activeSelectedBlock =
    scheduledBlocks.find(
      (b) => b.demand_id === selectedBlockId || b.activity === selectedBlockId
    ) || null;

  const activeSelectedDemand =
    demands.find((d) => d.id === selectedBlockId) || null;

  // Handshake Authorization Success Callback
  const handleGrantSuccess = (res: GrantBlockResponse) => {
    setScheduledBlocks((prev) =>
      prev.map((b) => {
        if (b.demand_id === res.block_id || b.bundled_with.includes(res.block_id)) {
          return {
            ...b,
            status: 'AUTHORIZED',
            ptw_id: res.ptw_id,
            system_private_number: res.system_private_number,
          };
        }
        return b;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Controller Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between sticky top-0 z-40 gap-4">
        {/* Left: Brand & Corridor Metadata */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <TrainIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase">
                RailSync<span className="text-cyan-400">-AI</span>
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold">
                ABPS v1.0
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 font-mono font-bold">
                CP-SAT Discrete Solver
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {corridor?.corridor_name || 'Ghaziabad (GZB) – Aligarh (ALJN) Corridor • 106.0 KM'}
            </p>
          </div>
        </div>

        {/* Right: Actions, Live Clock & Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Controller Digital Clock */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold tracking-widest">{currentTime || '12:00:00'}</span>
            <span className="text-[10px] text-slate-500">IST</span>
          </div>

          {/* System Mode Pill */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">Autonomous ABPS Active</span>
          </div>

          {/* Reset Baseline Button */}
          <button
            onClick={handleReset}
            disabled={isDisrupting || isOptimizing}
            title="Reset to initial corridor baseline"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Primary Action: Run CP-SAT Optimizer */}
          <button
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-slate-950 font-bold text-xs hover:from-cyan-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 disabled:opacity-60 font-mono"
          >
            {isOptimizing ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Optimizing Possessions...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Run CP-SAT Optimizer</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Optimization Status Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>OR-Tools CP-SAT discrete solver</span>
          </span>
          <span>•</span>
          <span>Disjunctive safety window: 5 min clearance buffer</span>
          <span>•</span>
          <span>Joint bundling synchronization threshold: ±15 min</span>
        </div>
        {lastOptimizedAt && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Optimal Schedule Solved at {lastOptimizedAt}</span>
          </div>
        )}
      </div>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Section 1: KPI Analytics Cards */}
        <section>
          <KPICards metrics={metrics} />
        </section>

        {/* Section 2: Interactive Marey Chart */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Time-Distance Space Chart & Cross-Departmental Possessions</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Click any maintenance block to review or issue digital safety PTW
            </span>
          </div>
          <MareyChart
            stations={corridor?.stations || []}
            trains={trains}
            blocks={scheduledBlocks}
            onSelectBlock={(b) => handleOpenHandshake(b.demand_id)}
            selectedBlockId={selectedBlockId}
          />
        </section>

        {/* Section 3: Disruption Simulator Panel + Multi-Department Demand Table */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Disruption Simulator */}
          <div className="lg:col-span-5 space-y-4">
            <DisruptionPanel
              trains={trains}
              onSimulate={handleSimulateDisruption}
              onReset={handleReset}
              isLoading={isDisrupting}
              activeDisruption={activeDisruption}
            />
          </div>

          {/* Right Column: Multi-Department Demand Table */}
          <div className="lg:col-span-7 space-y-4">
            <DemandTable
              demands={demands}
              blocks={scheduledBlocks}
              onOpenHandshake={handleOpenHandshake}
              selectedBlockId={selectedBlockId}
            />
          </div>
        </section>
      </main>

      {/* Digital Safety Handshake (BDMS / PTW) Modal */}
      <HandshakeModal
        block={activeSelectedBlock}
        demand={activeSelectedDemand}
        isOpen={isHandshakeOpen}
        onClose={() => setIsHandshakeOpen(false)}
        onGrantSuccess={handleGrantSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs font-mono text-slate-500">
        <p>
          RailSync-AI (ABPS) • Ministry of Railways Hackathon Prototype • G&SR Rule 15.06 Compliant
          Digital Handshakes
        </p>
      </footer>
    </div>
  );
};

export default App;
