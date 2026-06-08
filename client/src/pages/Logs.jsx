import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, 
  Trash2, 
  Search, 
  Key, 
  UserPlus, 
  DollarSign, 
  Scale, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Terminal,
  X 
} from 'lucide-react';
import GlassCard from '../components/common/GlassCard';
import Modal from '../components/common/Modal';
import { ShimmerList } from '../components/common/Shimmer';

const Logs = () => {
  const { user } = useAuth();
  const { activities, fetchActivities, clearActivities } = useBudget();
  const [loading, setLoading] = useState(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Wipe confirm modal state
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [wipingLoading, setWipingLoading] = useState(false);

  // Load audit trail on mount
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      await fetchActivities();
      setLoading(false);
    };
    loadLogs();
  }, [fetchActivities]);

  // Action Type Icon mapper
  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'REGISTER':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <UserPlus size={16} />
          </div>
        );
      case 'LOGIN':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
            <Key size={16} />
          </div>
        );
      case 'CREATE_TRANSACTION':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <DollarSign size={16} />
          </div>
        );
      case 'UPDATE_TRANSACTION':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/5 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <DollarSign size={16} />
          </div>
        );
      case 'DELETE_TRANSACTION':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/5 text-rose-500 flex items-center justify-center border border-rose-500/20">
            <Trash2 size={16} />
          </div>
        );
      case 'CREATE_BUDGET':
      case 'UPDATE_BUDGET':
        return (
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/5 text-violet-500 flex items-center justify-center border border-violet-500/20">
            <Scale size={16} />
          </div>
        );
      case 'CLEAR_LOGS':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 dark:bg-rose-500/5 text-rose-500 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert size={16} />
          </div>
        );
      case 'RECURRING_TRIGGER':
        return (
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/5 text-sky-500 flex items-center justify-center border border-sky-500/20">
            <Activity size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-slate-800/40 text-slate-550 flex items-center justify-center border border-slate-300/30">
            <Terminal size={16} />
          </div>
        );
    }
  };

  // Perform Wipe logs request
  const handleWipeLogsSubmit = async (e) => {
    e.preventDefault();
    setWipingLoading(true);
    const success = await clearActivities();
    setWipingLoading(false);
    if (success) {
      setIsWipeConfirmOpen(false);
    }
  };

  // Filter logs locally based on search keywords
  const filteredLogs = activities.filter((log) => {
    const search = searchTerm.toLowerCase();
    return (
      log.actionType.toLowerCase().includes(search) ||
      log.description.toLowerCase().includes(search) ||
      (log.ipAddress && log.ipAddress.includes(search))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* 1. Header Area & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Security & Audits
          </span>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            Activity Audit Logs
          </h2>
        </div>

        {activities && activities.length > 0 && (
          <button
            onClick={() => setIsWipeConfirmOpen(true)}
            className="glass-btn-secondary py-2 px-3 hover:border-rose-500/30 hover:text-rose-500 hover:bg-rose-500/5 text-xs self-start sm:self-center"
          >
            <Trash2 size={14} />
            Wipe Audit History
          </button>
        )}
      </div>

      {/* 2. Search filter */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 dark:text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="glass-input pl-11"
          placeholder="Filter audit logs by action type, description, or IP..."
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 3. Audit Trails Ledger List */}
      <GlassCard className="border-white/20 dark:border-white/10 shadow-glass overflow-hidden">
        {loading ? (
          <div className="p-6">
            <ShimmerList rows={5} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="py-4.5 px-6">Event</th>
                  <th className="py-4.5 px-6">Action Category</th>
                  <th className="py-4.5 px-6">IP Address</th>
                  <th className="py-4.5 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr 
                      key={log._id} 
                      className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <td className="py-4 px-6 w-[50%]">
                        <div className="leading-relaxed font-medium">
                          {log.description}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          {getActionIcon(log.actionType)}
                          <span className="font-bold font-mono tracking-wide text-[10px] uppercase text-slate-500 dark:text-slate-400">
                            {log.actionType}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="py-4 px-6 text-right text-slate-400 dark:text-slate-500">
                        <div className="font-bold text-[10px]">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[9px] font-semibold opacity-70 mt-0.5">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      {searchTerm ? 'No activity logs match your filter query.' : 'No audit entries recorded in database.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* CONFIRMATION WIPE MODAL */}
      <Modal
        isOpen={isWipeConfirmOpen}
        onClose={() => setIsWipeConfirmOpen(false)}
        title="Wipe Security Audit Trails"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleWipeLogsSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex gap-3">
            <AlertTriangle className="flex-shrink-0 animate-pulse" size={20} />
            <div>
              <span className="uppercase tracking-widest text-[9px] font-black block mb-0.5">Critical Danger Action</span>
              <p className="font-medium leading-relaxed">
                This operation is irreversible. All activity trail history, transactions records edits logs, and security login histories will be permanently wiped from the ledger.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Are you absolutely sure you want to clean all administrative history logs for your user workspace? A fresh record will be auto-generated to mark this wiping event.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsWipeConfirmOpen(false)}
              className="glass-btn-secondary py-2.5 text-xs"
              disabled={wipingLoading}
            >
              Keep Logs
            </button>
            <button
              type="submit"
              className="py-2.5 rounded-xl font-bold bg-rose-500 text-white text-xs hover:bg-rose-600 active:scale-95 transition-all shadow-md"
              disabled={wipingLoading}
            >
              {wipingLoading ? 'Cleaning Logs...' : 'Yes, Wipe History'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Logs;
