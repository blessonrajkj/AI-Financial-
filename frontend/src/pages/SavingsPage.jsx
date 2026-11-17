import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle, 
  Calendar, 
  Coins, 
  TrendingUp, 
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const SavingsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Contribution quick-adjust state
  const [showContribModal, setShowContribModal] = useState(false);
  const [contribGoal, setContribGoal] = useState(null);
  const [contribAmount, setContribAmount] = useState('');

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API_URL}/savings?t=${Date.now()}`);
      setGoals(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch savings goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenAdd = () => {
    setEditingGoalId(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate(new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]); // 6 months from now default
    setShowModal(true);
  };

  const handleOpenEdit = (g) => {
    setEditingGoalId(g.id);
    setName(g.name);
    setTargetAmount(g.target_amount);
    setCurrentAmount(g.current_amount);
    setTargetDate(g.target_date.split('T')[0]);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        target_date: targetDate + 'T12:00:00'
      };

      if (editingGoalId) {
        await axios.put(`${API_URL}/savings/${editingGoalId}`, payload);
        setSuccess('Savings Goal updated successfully!');
      } else {
        await axios.post(`${API_URL}/savings`, payload);
        setSuccess('Savings Goal created successfully!');
      }

      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setShowModal(false);
      fetchGoals();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save savings goal.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribSubmit = async (e) => {
    e.preventDefault();
    if (!contribGoal) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const newAmount = contribGoal.current_amount + parseFloat(contribAmount);
      await axios.put(`${API_URL}/savings/${contribGoal.id}`, {
        current_amount: newAmount
      });
      setSuccess(`Added ₹${contribAmount} to ${contribGoal.name}!`);
      setShowContribModal(false);
      setContribAmount('');
      fetchGoals();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to add contribution.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/savings/${id}`);
      setSuccess('Savings goal deleted successfully!');
      fetchGoals();
    } catch (err) {
      console.error(err);
      setError('Failed to delete savings goal.');
    }
  };

  // Stats summaries
  const totalSaved = goals.reduce((acc, curr) => acc + curr.current_amount, 0);
  const totalTarget = goals.reduce((acc, curr) => acc + curr.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="doppel-shell relative overflow-hidden">
        <div className="glow-orb-primary -top-20 -left-20 w-80 h-80" />
        <div className="doppel-core px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="eyebrow-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Wealth Vault
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-textPrimary">Savings & Milestones</h1>
            <p className="text-xs text-textMuted mt-1 font-medium">Plan, track, and run AI predictive simulations for long-term target milestones</p>
          </div>

          <button 
            onClick={handleOpenAdd}
            className="btn-island group self-start md:self-auto"
          >
            <span>New Goal</span>
            <span className="btn-island-icon">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold flex items-center space-x-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Total Saved Balance</span>
              <span className="p-2 bg-success/10 text-success rounded-xl border border-success/20"><Coins className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">₹{totalSaved.toLocaleString()}</h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Across {goals.length} active savings plans</p>
            </div>
          </div>
        </div>

        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Overall Progress</span>
              <span className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20"><TrendingUp className="w-4 h-4" /></span>
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">{overallProgress.toFixed(1)}%</h3>
                <span className="text-[11px] text-textMuted font-medium">of target ₹{totalTarget.toLocaleString()}</span>
              </div>
              <div className="w-full bg-borderColor/60 rounded-full h-2 mt-2.5 overflow-hidden p-0.5">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-500 shadow-primary-glow" 
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="doppel-shell h-36">
          <div className="doppel-core p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="eyebrow-badge !px-2 !py-0.5">Pending Target Reserve</span>
              <span className="p-2 bg-warning/10 text-warning rounded-xl border border-warning/20"><Target className="w-4 h-4" /></span>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-textPrimary font-numeric tracking-tight">₹{Math.max(totalTarget - totalSaved, 0).toLocaleString()}</h3>
              <p className="text-[11px] text-textMuted font-medium mt-1">Needed to fulfill all set milestones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g) => {
            const dateObj = new Date(g.target_date);
            const formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            
            const currentAmt = g.current_amount || 0;
            const targetAmt = g.target_amount || 0;
            const remainingAmt = g.remaining_amount ?? g.remaining ?? Math.max(targetAmt - currentAmt, 0);
            const pctCompleted = g.percentage_completed ?? g.progress_percentage ?? (targetAmt > 0 ? (currentAmt / targetAmt) * 100 : 0);
            const isCompleted = remainingAmt <= 0;

            return (
              <div 
                key={g.id} 
                className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm relative flex flex-col justify-between"
              >
                <div>
                  {/* Goal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base sm:text-lg font-bold text-textPrimary truncate">{g.name}</h4>
                      <p className="text-xs text-textSecondary flex items-center space-x-1.5 mt-0.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-textMuted shrink-0" />
                        <span>Target: {formattedDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 self-start sm:self-auto">
                      <button 
                        onClick={() => {
                          setContribGoal(g);
                          setContribAmount('');
                          setShowContribModal(true);
                        }}
                        className="px-3 py-1.5 min-h-[36px] bg-success/15 hover:bg-success/20 text-success text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <span>+ Deposit</span>
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(g)}
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-textSecondary hover:bg-hoverBg rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(g.id)}
                        className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-textMuted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing Values */}
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-xs font-semibold text-textSecondary">Amount Saved</span>
                      <p className="text-xl font-extrabold text-textPrimary">₹{currentAmt.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-textSecondary">Target Goal</span>
                      <p className="text-xl font-extrabold text-textPrimary">₹{targetAmt.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-background border border-borderColor rounded-full h-3 overflow-hidden mb-4 relative">
                    <div 
                      className={`h-full transition-all duration-500 ${isCompleted ? 'bg-success' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(pctCompleted, 100)}%` }}
                    ></div>
                  </div>

                  {/* Percentage & Remaining details */}
                  <div className="flex justify-between items-center text-xs font-bold mb-4">
                    <span className={`px-2 py-0.5 rounded-full ${isCompleted ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
                      {pctCompleted.toFixed(1)}% Completed
                    </span>
                    <span className="text-textSecondary">
                      {isCompleted ? 'Target achieved!' : `₹${remainingAmt.toLocaleString()} Remaining`}
                    </span>
                  </div>
                </div>

                {/* AI Predictive Insight Panel */}
                <div className="mt-2 p-3.5 bg-background border border-borderColor rounded-2xl flex items-start space-x-2.5">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-xl flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-primary tracking-wider">AI Forecast Insights</h5>
                    <p className="text-xs font-medium text-textPrimary mt-0.5 leading-relaxed">
                      {g.ai_prediction}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-3xl bg-cardBg">
          <Target className="w-10 h-10 text-textMuted mb-2" />
          <p className="text-sm font-semibold">No active savings targets found</p>
          <p className="text-xs text-textMuted mt-1">Set a savings goal to start tracking progress towards your dreams</p>
        </div>
      )}

      {/* Set / Edit Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingGoalId ? 'Edit Savings Goal' : 'Create Savings Goal'}
        subtitle={editingGoalId ? 'Update target details' : 'Set up a new target to track savings progress'}
        icon={Target}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Goal Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. New Electric Car Fund, Down Payment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Target Amount (₹)</label>
              <input 
                type="number" 
                required
                placeholder="100000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Current Saved (₹)</label>
              <input 
                type="number" 
                required
                placeholder="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Target Achievement Date</label>
            <input 
              type="date" 
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-borderColor shrink-0">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-2/3 min-h-[48px] bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center"
            >
              Save Goal
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribution Quick Deposit Modal */}
      <Modal
        isOpen={showContribModal}
        onClose={() => {
          setShowContribModal(false);
          setContribGoal(null);
        }}
        title="Make Deposit"
        subtitle={contribGoal ? `Adding savings contribution to ${contribGoal.name}` : 'Add savings contribution'}
        icon={Coins}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAddContribSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Deposit Amount (₹)</label>
            <input 
              type="number" 
              required
              autoFocus
              placeholder="5000"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className="w-full h-12 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm font-bold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-borderColor shrink-0">
            <button 
              type="button"
              onClick={() => {
                setShowContribModal(false);
                setContribGoal(null);
              }}
              className="w-1/3 min-h-[48px] bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor transition-colors text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="w-2/3 min-h-[48px] bg-success hover:bg-success/90 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center"
            >
              Confirm Deposit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SavingsPage;
