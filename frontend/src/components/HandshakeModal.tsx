import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Zap,
  Key,
  CheckCircle,
  FileText,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { grantSafetyToken } from '../api';
import type { GrantBlockResponse, MaintenanceDemand, ScheduledBlock } from '../types';

interface HandshakeModalProps {
  block: ScheduledBlock | null;
  demand?: MaintenanceDemand | null;
  isOpen: boolean;
  onClose: () => void;
  onGrantSuccess: (res: GrantBlockResponse) => void;
}

export const HandshakeModal: React.FC<HandshakeModalProps> = ({
  block,
  demand,
  isOpen,
  onClose,
  onGrantSuccess,
}) => {
  const [sectionControllerId, setSectionControllerId] = useState('SC-DLI-04');
  const [tpcPrivateNumber, setTpcPrivateNumber] = useState('TPC-62841');
  const [depotSupervisorId, setDepotSupervisorId] = useState('JE-PWAY-DKR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newlyGrantedData, setNewlyGrantedData] = useState<GrantBlockResponse | null>(null);

  if (!isOpen || !block) return null;

  const grantedData =
    newlyGrantedData ||
    (block.status === 'AUTHORIZED' && block.ptw_id
      ? {
          block_id: block.demand_id,
          system_private_number: block.system_private_number || 'PN-782491',
          ptw_id: block.ptw_id,
          ptw_timestamp: new Date().toISOString(),
          status: 'AUTHORIZED',
          message: 'Digital PTW previously authorized and currently active.',
        }
      : null);

  const formatTime = (min: number): string => {
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpcPrivateNumber.trim()) {
      setErrorMsg('TPC Private Number is strictly mandatory under G&SR Rule 15.06.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await grantSafetyToken({
        block_id: block.demand_id,
        section_controller_id: sectionControllerId,
        tpc_private_number: tpcPrivateNumber,
        depot_supervisor_id: depotSupervisorId,
      });

      setNewlyGrantedData(res);
      onGrantSuccess(res);
    } catch {
      setErrorMsg('Handshake failed. Ensure G&SR verification credentials are valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiresPowerBlock =
    demand?.power_block_required || block.system === 'TDMS' || block.is_bundled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100 font-mono tracking-wide uppercase">
                  Digital Safety Handshake (BDMS)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono border border-purple-800">
                  G&SR Rule 15.06
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Permit to Work (PTW) Electronic Issuance & Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Block Metadata Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold font-mono text-cyan-400">
                  {block.demand_id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                  {block.system}
                </span>
                {block.is_bundled && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    INTEGRATED BUNDLE
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                {formatTime(block.scheduled_start_min)} → {formatTime(block.scheduled_end_min)} (
                {block.duration_minutes}m)
              </span>
            </div>

            <p className="text-sm font-medium text-slate-200">{block.activity}</p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
              <div>
                Location:{' '}
                <span className="text-slate-200">
                  KM {block.start_km.toFixed(1)} – {block.end_km.toFixed(1)}
                </span>
              </div>
              <div>
                DCS Criticality:{' '}
                <span className="text-amber-400 font-bold">
                  {block.criticality_score.toFixed(1)} / 100
                </span>
              </div>
            </div>

            {block.bundled_with && block.bundled_with.length > 0 && (
              <div className="text-[11px] font-mono text-purple-300 bg-purple-950/40 p-2 rounded border border-purple-900/60">
                ⚡ <strong>Synchronized Joint Clearance:</strong> Also issues co-possession for{' '}
                <span className="text-white font-bold">{block.bundled_with.join(', ')}</span>
              </div>
            )}
          </div>

          {/* If already granted or just granted: Display Certificate */}
          {grantedData ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300 font-mono tracking-wide uppercase">
                    Line Possession & Power Block Authorized
                  </h4>
                  <p className="text-xs text-slate-300">
                    Official cryptographic authorization token logged in digital register.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-950/80 border border-emerald-500/20 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    System Private Number (PN)
                  </span>
                  <span className="text-base font-black text-emerald-400 tracking-wider">
                    {grantedData.system_private_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Permit to Work ID
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {grantedData.ptw_id}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  Timestamp:{' '}
                  <span className="text-slate-300">
                    {new Date(grantedData.ptw_timestamp).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-slate-950 font-bold text-xs hover:bg-emerald-500 shadow transition-all"
                >
                  Done & Return to Chart
                </button>
              </div>
            </div>
          ) : (
            /* Safety Input Form */
            <form onSubmit={handleGrant} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center space-x-2 rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Section Controller ID */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    Section Controller ID (Operating Dept)
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionControllerId}
                    onChange={(e) => setSectionControllerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* TPC Private Number */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      TPC Private Number (Traction Power Controller)
                    </span>
                    {requiresPowerBlock && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        Mandatory (OHE Isolation)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TPC-62841"
                    value={tpcPrivateNumber}
                    onChange={(e) => setTpcPrivateNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Depot Supervisor ID */}
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-purple-400" />
                    Depot P-Way / S&T Field Supervisor ID
                  </label>
                  <input
                    type="text"
                    required
                    value={depotSupervisorId}
                    onChange={(e) => setDepotSupervisorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-bold text-xs hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                      <span>Validating G&SR Handshake...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Generate Digital Safety Token (PTW)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
