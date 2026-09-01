import React, { useState, useEffect } from 'react';
import {
  Train as TrainIcon,
  Play,
  RotateCcw,
  Clock,
  ChevronDown,
  HelpCircle,
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
import { GanttChart } from './components/GanttChart';
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

  // Filter States (matching screenshot toolbar)
  const [filterSegment, setFilterSegment] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterBlockStatus, setFilterBlockStatus] = useState<string>('ALL');
  const [filterTaskStatus, setFilterTaskStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI Interactive States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDisrupting, setIsDisrupting] = useState(false);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionRequest | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isHandshakeOpen, setIsHandshakeOpen] = useState(false);
  const [showDisruptionPanel, setShowDisruptionPanel] = useState(false);
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
      } catch {
        // Fallback is handled automatically in api.ts
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
      if (res && Array.isArray(res.scheduled_blocks)) {
        setScheduledBlocks(res.scheduled_blocks);
      }
      if (res && res.metrics) {
        setMetrics(res.metrics);
      }
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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans relative">
      {/* 1. Top Enterprise Header Bar (matching screenshot navbar) */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between sticky top-0 z-40 gap-3 text-xs text-white shadow-sm relative before:content-[''] before:absolute before:-top-96 before:left-0 before:right-0 before:h-96 before:bg-slate-900 before:pointer-events-none">
        {/* Left: Brand Pill & Navigation Tabs */}
        <div className="flex items-center space-x-4">
          {/* Brand Pill matching screenshot */}
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded bg-sky-600 text-white font-bold shadow-sm">
            <TrainIcon className="w-4 h-4" />
            <span className="tracking-wide uppercase">RAILSYNC — Operational</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-slate-300">
            <button className="px-3 py-1 rounded text-white font-bold bg-slate-800">
              Gantt Timeline
            </button>
            <button
              onClick={() => {}}
              className="px-3 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              Fleet & Possessions
            </button>
            <button
              onClick={() => setShowDisruptionPanel((prev) => !prev)}
              className={`px-3 py-1 rounded transition-colors font-medium ${
                showDisruptionPanel
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Disruption Simulator
            </button>
            <button
              onClick={() => {
                if (scheduledBlocks.length > 0) {
                  handleOpenHandshake(scheduledBlocks[0].demand_id);
                }
              }}
              className="px-3 py-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium"
            >
              Safety Handshake (G&SR)
            </button>
          </nav>
        </div>

        {/* Right: Controller, Clock & Help */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-2 text-slate-300 text-[11px] font-mono">
            <span>Corridor:</span>
            <span className="text-white font-bold">Ghaziabad – Aligarh (106 KM)</span>
          </div>

          {/* Digital Monospace IST Clock */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-200">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-white">{currentTime || '01:00:00'}</span>
            <span className="text-[10px] text-slate-400">IST</span>
          </div>

          {/* Controller Profile */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
              SC
            </div>
            <span className="hidden sm:inline text-[11px] font-mono text-slate-300 font-semibold">
              SC-DLI-04
            </span>
          </div>

          <button
            title="Help center"
            className="text-slate-300 hover:text-white text-xs flex items-center space-x-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden xl:inline font-medium">Help</span>
          </button>
        </div>
      </header>

      {/* 2. Operational Filter Toolbar (Directly mirrors reference screenshot filter strip in clean light theme) */}
      <div className="bg-white border-b border-slate-300 px-5 py-2.5 text-xs shadow-sm">
        <div className="flex flex-col space-y-2">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Real-time corridor possession status
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* 1. Track Segment Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Segment</label>
              <select
                value={filterSegment}
                onChange={(e) => setFilterSegment(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-[11px] font-medium focus:outline-none focus:border-blue-600 shadow-sm"
              >
                <option value="ALL">Select... (All Segments)</option>
                <option value="seg-1">0–30 KM (GZB–Ajaibpur)</option>
                <option value="seg-2">30–60 KM (Ajaibpur–Wair)</option>
                <option value="seg-3">60–106 KM (Wair–Aligarh)</option>
              </select>
            </div>

            {/* 2. Department Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-[11px] font-medium focus:outline-none focus:border-blue-600 shadow-sm"
              >
                <option value="ALL">Select... (All Depts)</option>
                <option value="ENGINEERING">TMS Engineering (P-Way)</option>
                <option value="TRACTION_TRD">TDMS Electrical (OHE)</option>
                <option value="SIGNAL_TELECOM">SMMS S&T (Signalling)</option>
              </select>
            </div>

            {/* 3. Block Status Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Block status</label>
              <select
                value={filterBlockStatus}
                onChange={(e) => setFilterBlockStatus(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-[11px] font-medium focus:outline-none focus:border-blue-600 shadow-sm"
              >
                <option value="ALL">Select... (All Statuses)</option>
                <option value="BUNDLED">Integrated / Joint</option>
                <option value="AUTHORIZED">Authorized (PTW Active)</option>
              </select>
            </div>

            {/* 4. Task Status Filter */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Task status</label>
              <select
                value={filterTaskStatus}
                onChange={(e) => setFilterTaskStatus(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-[11px] font-medium focus:outline-none focus:border-blue-600 shadow-sm"
              >
                <option value="ALL">Select... (All Tasks)</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PENDING">Pending Handshake</option>
              </select>
            </div>

            {/* 5. Action / Quick Run */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Action</label>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleRunOptimizer}
                  disabled={isOptimizing}
                  className="flex-1 px-2.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] transition-colors disabled:opacity-60 flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isOptimizing ? 'Solving...' : 'Run CP-SAT'}</span>
                </button>
                <button
                  onClick={handleReset}
                  title="Reset Baseline"
                  className="px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors shadow-sm"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 6. Entity Search */}
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Entity</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Asset or train name..."
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-[11px] focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 p-5 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* Disruption Simulator Drawer (Toggleable) */}
        {showDisruptionPanel && (
          <DisruptionPanel
            key={activeDisruption ? `${activeDisruption.train_id}-${activeDisruption.delay_minutes}` : 'baseline'}
            trains={trains}
            onSimulate={handleSimulateDisruption}
            onReset={handleReset}
            isLoading={isDisrupting}
            activeDisruption={activeDisruption}
          />
        )}

        {/* Operational Telemetry Metrics Ribbon */}
        <KPICards metrics={metrics} />

        {/* Core Timeline: Gantt Chart (Replaces Marey Chart) */}
        <GanttChart
          trains={trains}
          scheduledBlocks={scheduledBlocks}
          demands={demands}
          stations={corridor?.stations || []}
          onSelectBlock={handleOpenHandshake}
          selectedBlockId={selectedBlockId}
          filterDepartment={filterDepartment}
          filterSegment={filterSegment}
        />

        {/* High-Density Asset & Possession Fleet List (matching screenshot layout) */}
        <DemandTable
          demands={demands}
          blocks={scheduledBlocks}
          trains={trains}
          onOpenHandshake={handleOpenHandshake}
          selectedBlockId={selectedBlockId}
          filterDepartment={filterDepartment}
          filterStatus={filterBlockStatus}
          searchQuery={searchQuery}
        />
      </main>

      {/* Safety Handshake Dialog (G&SR Rule 15.06 BDMS) */}
      <HandshakeModal
        block={activeSelectedBlock}
        demand={activeSelectedDemand}
        isOpen={isHandshakeOpen}
        onClose={() => setIsHandshakeOpen(false)}
        onGrantSuccess={handleGrantSuccess}
      />
    </div>
  );
};

export default App;
