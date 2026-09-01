import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Zap,
  Key,
  CheckCircle2,
  AlertCircle,
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
          message: 'Digital PTW previously authorized and currently active in field.',
        }
      : null);

  const formatTime = (min: number): string => {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await grantSafetyToken({
        block_id: block.demand_id,
        section_controller_id: sectionControllerId.trim(),
        tpc_private_number: demand?.power_block_required ? tpcPrivateNumber.trim() : '',
        depot_supervisor_id: depotSupervisorId.trim(),
      });

      setNewlyGrantedData(res);
      onGrantSuccess(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authorize safety handshake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2230] border border-[#2d3a4f] rounded-lg shadow-xl w-full max-w-2xl text-slate-200 overflow-hidden font-sans">
        {/* Official Header */}
        <div className="px-5 py-3.5 bg-[#141b26] border-b border-[#2d3a4f] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-[#1e293b] border border-[#3b4e6b] flex items-center justify-center text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Ministry of Railways • Northern Railway
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                BDMS Digital Safety Protocol (G&SR Rule 15.06)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#27354a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target Possession Details Card */}
          <div className="p-3.5 rounded bg-[#121822] border border-[#253246] text-xs font-mono space-y-2">
            <div className="flex items-center justify-between border-b border-[#1e2738] pb-1.5">
              <span className="font-bold text-slate-100">
                {block.demand_id} • {block.activity}
              </span>
              <span className="text-sky-300 font-semibold">
                {block.department} ({block.system})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">CORRIDOR SPAN</span>
                <span>KM {block.start_km.toFixed(1)} – {block.end_km.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SCHEDULED WINDOW</span>
                <span>{formatTime(block.scheduled_start_min)} – {formatTime(block.scheduled_end_min)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">TOTAL DURATION</span>
                <span>{block.duration_minutes} minutes</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CRITICALITY (DCS)</span>
                <span>{block.criticality_score}/100</span>
              </div>
            </div>

            {block.is_bundled && (
              <div className="mt-1 pt-1.5 border-t border-[#1e2738] text-[11px] text-indigo-300 flex items-center space-x-1.5">
                <span className="px-1.5 py-0.2 rounded bg-indigo-900 border border-indigo-500 font-bold text-[10px]">
                  INTEGRATED BLOCK
                </span>
                <span>Synchronized with: {block.bundled_with.join(', ')}</span>
              </div>
            )}
          </div>

          {/* If already granted or just granted */}
          {grantedData ? (
            <div className="p-4 rounded bg-[#13221d] border border-emerald-600/60 text-slate-200 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PERMIT TO WORK (PTW) OFFICIALLY ISSUED</span>
                </div>
                <span className="text-[10px] text-emerald-500 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                  G&SR 15.06 VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-900/60">
                <div className="p-2.5 rounded bg-[#0f1b16] border border-emerald-800/60">
                  <span className="text-[10px] text-slate-400 uppercase block">System Private Number</span>
                  <span className="text-base font-bold text-emerald-300 tracking-wider">
                    {grantedData.system_private_number}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#0f1b16] border border-emerald-800/60">
                  <span className="text-[10px] text-slate-400 uppercase block">Permit Reference (PTW ID)</span>
                  <span className="text-sm font-semibold text-slate-200 truncate block">
                    {grantedData.ptw_id}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300">
                Timestamp: {grantedData.ptw_timestamp} • Station Section: Dankaur / Khurja Controller
              </div>
            </div>
          ) : (
            /* Issuance Form */
            <form onSubmit={handleGrant} className="space-y-3 text-xs">
              {demand?.power_block_required && (
                <div className="p-3 rounded bg-amber-950/40 border border-amber-600 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>TRACTION POWER BLOCK (OHE 25kV ISOLATION) MANDATORY</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 font-mono">
                    Under G&SR Rule 15.06, Section Controller must exchange a Private Number with the Traction Power Controller (TPC) confirming de-energization before issuing PTW.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Section Controller ID
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionControllerId}
                    onChange={(e) => setSectionControllerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#121822] border border-[#2d3a4f] text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Depot Field Supervisor ID
                  </label>
                  <input
                    type="text"
                    required
                    value={depotSupervisorId}
                    onChange={(e) => setDepotSupervisorId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#121822] border border-[#2d3a4f] text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {demand?.power_block_required && (
                <div className="font-mono">
                  <label className="block text-[11px] text-amber-300 mb-1">
                    TPC Private Number (Traction Power Controller)
                  </label>
                  <input
                    type="text"
                    required
                    value={tpcPrivateNumber}
                    onChange={(e) => setTpcPrivateNumber(e.target.value)}
                    placeholder="e.g. TPC-62841"
                    className="w-full px-2.5 py-1.5 rounded bg-[#121822] border border-amber-600/70 text-amber-200 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-600 text-rose-300 text-xs flex items-center space-x-2 font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded bg-[#202a3a] hover:bg-[#283549] text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Validating & Issuing...</span>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Issue Digital PTW & Private Number</span>
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
