import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Search, 
  SlidersHorizontal, 
  TrendingUp, 
  Calendar, 
  Coins, 
  Activity, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Bell, 
  Download,
  Info,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const SCHEMES = [
  { id: 'ppf', name: 'Public Provident Fund (PPF)', rate: '7.1%', lockIn: '15 Years', risk: 'Sovereign / Low', tax: 'Yes (EEE)', desc: 'Long-term tax-free savings backed by Central Gov.' },
  { id: 'ssy', name: 'Sukanya Samriddhi Yojana (SSY)', rate: '8.2%', lockIn: '21 Years (Child)', risk: 'Sovereign / Low', tax: 'Yes', desc: 'Dedicated savings scheme for girl child education and marriage.' },
  { id: 'nsc', name: 'National Savings Certificate (NSC)', rate: '7.7%', lockIn: '5 Years', risk: 'Sovereign / Low', tax: 'Yes', desc: 'Secure medium-term savings certificate with income tax benefit.' },
  { id: 'kvp', name: 'Kisan Vikas Patra (KVP)', rate: '7.5%', lockIn: '115 Months (Doubles)', risk: 'Sovereign / Low', tax: 'No', desc: 'Doubles your lumpsum investment in 115 months.' },
  { id: 'mis', name: 'Monthly Income Scheme (MIS)', rate: '7.4%', lockIn: '5 Years', risk: 'Sovereign / Low', tax: 'No', desc: 'Get guaranteed monthly interest payouts on lumpsum deposit.' },
  { id: 'scss', name: 'Senior Citizen Savings Scheme (SCSS)', rate: '8.2%', lockIn: '5 Years', risk: 'Sovereign / Low', tax: 'Yes', desc: 'Quarterly payout savings scheme for retirees aged 60+.' },
  { id: 'rd', name: 'Recurring Deposit (RD)', rate: '6.7%', lockIn: '5 Years', risk: 'Sovereign / Low', tax: 'No', desc: 'Systematic monthly savings plan with sovereign interest rate.' },
  { id: 'td', name: 'Time Deposit (TD)', rate: '6.9% - 7.5%', lockIn: '1 to 5 Years', risk: 'Sovereign / Low', tax: 'Yes (5 Yr)', desc: 'Post Office Fixed Deposit option for flexible tenures.' },
  { id: 'savings', name: 'Post Office Savings Account', rate: '4.0%', lockIn: 'None', risk: 'Sovereign / Low', tax: 'Yes (Up to 10k)', desc: 'Sovereign transaction account with netbanking support.' },
  { id: 'mssc', name: 'Mahila Samman Savings Certificate (MSSC)', rate: '7.5%', lockIn: '2 Years', risk: 'Sovereign / Low', tax: 'No', desc: 'Exclusive savings certificate for women and girl children.' }
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#84CC16'];

const IndiaPostModal = ({ isOpen, onClose, onRefreshParent }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, schemes, portfolio
  const [expandedId, setExpandedId] = useState(null);
  
  // Database States
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState({ metrics: {}, portfolio_allocation: [], upcoming_maturities: [] });
  const [insights, setInsights] = useState({ insights: [], reminders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All'); // All, Active, Matured, Maturing Soon
  const [sortField, setSortField] = useState('date'); // date, amount
  const [sortOrder, setSortOrder] = useState('desc');

  // Nested Investment Modal States
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  
  // Form fields
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState('One Time');
  const [nominee, setNominee] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [notes, setNotes] = useState('');
  const [invStatus, setInvStatus] = useState('Active');
  const [editingId, setEditingId] = useState(null);

  const fetchPostInvestments = async () => {
    setLoading(true);
    try {
      const [invsRes, sumRes, insRes] = await Promise.all([
        axios.get(`${API_URL}/india-post-investments?t=${Date.now()}`),
        axios.get(`${API_URL}/india-post-investments/summary?t=${Date.now()}`),
        axios.get(`${API_URL}/india-post-investments/ai-insights?t=${Date.now()}`)
      ]);
      setInvestments(invsRes.data);
      setSummary(sumRes.data);
      setInsights(insRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch India Post investments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPostInvestments();
    }
  }, [isOpen]);

  const handleOpenInvest = (scheme) => {
    setSelectedScheme(scheme);
    setEditingId(null);
    setAmount('');
    
    // Autofill defaults based on scheme
    let defRate = 7.1;
    let defYears = 5;
    let defFreq = "One Time";

    if (scheme.id === 'ppf') { defRate = 7.1; defYears = 15; }
    else if (scheme.id === 'ssy') { defRate = 8.2; defYears = 21; }
    else if (scheme.id === 'nsc') { defRate = 7.7; defYears = 5; }
    else if (scheme.id === 'kvp') { defRate = 7.5; defYears = 9.5; }
    else if (scheme.id === 'mis') { defRate = 7.4; defYears = 5; }
    else if (scheme.id === 'scss') { defRate = 8.2; defYears = 5; }
    else if (scheme.id === 'rd') { defRate = 6.7; defYears = 5; defFreq = "Monthly"; }
    else if (scheme.id === 'td') { defRate = 7.5; defYears = 5; }
    else if (scheme.id === 'savings') { defRate = 4.0; defYears = 10; }
    else if (scheme.id === 'mssc') { defRate = 7.5; defYears = 2; }

    setInterestRate(defRate.toString());
    setFrequency(defFreq);
    
    // Auto maturity date offset
    const d = new Date();
    d.setFullYear(d.getFullYear() + Math.ceil(defYears));
    setMaturityDate(d.toISOString().split('T')[0]);
    setInvestmentDate(new Date().toISOString().split('T')[0]);

    setNominee('');
    setAccountNumber('');
    setBranchName('');
    setNotes('');
    setInvStatus('Active');
    setShowInvestModal(true);
  };

  const handleOpenEdit = (inv) => {
    setEditingId(inv.id);
    setSelectedScheme(SCHEMES.find(s => s.name === inv.scheme_name) || { name: inv.scheme_name, id: 'custom' });
    setAmount(inv.amount.toString());
    setInterestRate(inv.interest_rate.toString());
    setInvestmentDate(inv.investment_date.split('T')[0]);
    setMaturityDate(inv.maturity_date.split('T')[0]);
    setFrequency(inv.frequency);
    setNominee(inv.nominee || '');
    setAccountNumber(inv.account_number || '');
    setBranchName(inv.branch_name || '');
    setNotes(inv.notes || '');
    setInvStatus(inv.status);
    setShowInvestModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      scheme_name: selectedScheme.name,
      amount: parseFloat(amount),
      interest_rate: parseFloat(interestRate),
      investment_date: investmentDate + 'T12:00:00',
      maturity_date: maturityDate + 'T12:00:00',
      frequency: frequency,
      nominee: nominee || null,
      account_number: accountNumber || null,
      branch_name: branchName || null,
      notes: notes || null,
      status: invStatus
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}/india-post-investments/${editingId}`, payload);
        setSuccess('Investment entry modified successfully.');
      } else {
        await axios.post(`${API_URL}/india-post-investments`, payload);
        setSuccess('India Post investment created successfully.');
      }
      setShowInvestModal(false);
      fetchPostInvestments();
      onRefreshParent(); // Trigger refresh of main dashboard
    } catch (err) {
      console.error(err);
      setError('Failed to save investment.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investment record?')) return;
    setError('');
    setSuccess('');
    try {
      await axios.delete(`${API_URL}/india-post-investments/${id}`);
      setSuccess('Record deleted successfully.');
      fetchPostInvestments();
      onRefreshParent();
    } catch (err) {
      console.error(err);
      setError('Failed to delete investment.');
    }
  };

  // Client-side Exports
  const handleExportCSV = () => {
    const csvHeaders = ['ID', 'Scheme Name', 'Amount (Rs)', 'Rate (%)', 'Start Date', 'Maturity Date', 'Nominee', 'Account Number', 'Branch', 'Status'];
    const csvRows = investments.map(i => [
      i.id,
      i.scheme_name,
      i.amount,
      i.interest_rate,
      i.investment_date.split('T')[0],
      i.maturity_date.split('T')[0],
      i.nominee || '-',
      i.account_number || '-',
      i.branch_name || '-',
      i.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IndiaPost_Investments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter & Search Implementation
  const filteredInvestments = investments.filter(i => {
    const matchesSearch = 
      i.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.nominee && i.nominee.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.account_number && i.account_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (i.branch_name && i.branch_name.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (filterStatus === 'Active') matchesStatus = i.status === 'Active';
    else if (filterStatus === 'Matured') matchesStatus = i.status === 'Matured';
    else if (filterStatus === 'Maturing Soon') {
      const days = (new Date(i.maturity_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      matchesStatus = i.status === 'Active' && days > 0 && days <= 90;
    }

    return matchesSearch && matchesStatus;
  });

  filteredInvestments.sort((a, b) => {
    let fieldA = sortField === 'amount' ? a.amount : new Date(a.investment_date).getTime();
    let fieldB = sortField === 'amount' ? b.amount : new Date(b.investment_date).getTime();
    return sortOrder === 'desc' ? fieldB - fieldA : fieldA - fieldB;
  });

  const getSchemeDetails = (inv) => {
    const rate = inv.interest_rate / 100;
    const now = new Date();
    const invDate = new Date(inv.investment_date);
    const matDate = new Date(inv.maturity_date);
    
    const yearsPassed = Math.max(0, (now - invDate) / (1000 * 60 * 60 * 24 * 365.25));
    const monthsPassed = Math.max(0, (now - invDate) / (1000 * 60 * 60 * 24 * 30.4375));
    const quartersPassed = Math.floor(monthsPassed / 3);
    
    const name = inv.scheme_name.toLowerCase();

    // 1. PPF
    if (name.includes('public provident fund') || name.includes('ppf')) {
      const yearlyContrib = inv.frequency === 'Monthly' ? inv.amount * 12 : inv.amount;
      const limitRemaining = Math.max(0, 150000 - yearlyContrib);
      const interestEarned = inv.amount * ((1 + rate) ** yearsPassed) - inv.amount;
      const estMaturityVal = inv.amount * ((1 + rate) ** 15);
      const yearsRemaining = Math.max(0, 15 - yearsPassed);

      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Current Balance: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>📈 Yearly Contribution: <span className="font-bold text-textPrimary">₹{yearlyContrib.toLocaleString()}</span></div>
          <div>🛡️ Remaining Sec 80C Limit: <span className="font-bold text-success">₹{limitRemaining.toLocaleString()}</span></div>
          <div>🪙 Interest Accrued: <span className="font-bold text-success">₹{interestEarned.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>💎 Estimated Maturity Value: <span className="font-bold text-primary">₹{estMaturityVal.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>⏳ Years Remaining: <span className="font-bold text-textPrimary">{yearsRemaining.toFixed(1)} Years</span></div>
        </div>
      );
    }

    // 2. SSY
    if (name.includes('sukanya') || name.includes('ssy')) {
      const yearlyDeposit = inv.frequency === 'Monthly' ? inv.amount * 12 : inv.amount;
      const estMaturityVal = inv.amount * ((1 + rate) ** 21);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>👧 Child Name: <span className="font-bold text-textPrimary">{inv.nominee || 'Unspecified'}</span></div>
          <div>💰 Current Balance: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>📈 Yearly Deposit: <span className="font-bold text-textPrimary">₹{yearlyDeposit.toLocaleString()}</span></div>
          <div>💎 Estimated Maturity Value: <span className="font-bold text-primary">₹{estMaturityVal.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>👵 Age Eligibility: <span className="font-bold text-textPrimary">Under 10 Years at Opening</span></div>
        </div>
      );
    }

    // 3. MIS
    if (name.includes('monthly income') || name.includes('mis')) {
      const monthlyInt = inv.amount * (inv.interest_rate / 1200);
      const interestRec = monthlyInt * Math.floor(monthsPassed);
      const estTotalInterest = monthlyInt * 60; // 5 Years tenure
      const nextPayout = new Date(invDate);
      nextPayout.setMonth(nextPayout.getMonth() + Math.ceil(monthsPassed));
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Investment Amount: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>💵 Monthly Payout: <span className="font-bold text-success">₹{monthlyInt.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>🪙 Interest Received: <span className="font-bold text-textPrimary">₹{interestRec.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>📅 Next Interest Payout: <span className="font-bold text-primary">{nextPayout.toLocaleDateString()}</span></div>
          <div>⏳ Maturity Date: <span className="font-bold text-textPrimary">{matDate.toLocaleDateString()}</span></div>
          <div>📈 Estimated Total Interest: <span className="font-bold text-primary">₹{estTotalInterest.toLocaleString()}</span></div>
        </div>
      );
    }

    // 4. NSC
    if (name.includes('national savings') || name.includes('nsc')) {
      const estMaturityVal = inv.amount * ((1 + rate) ** 5);
      const interestEarned = estMaturityVal - inv.amount;
      const yearsRemaining = Math.max(0, 5 - yearsPassed);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Principal: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>🪙 Interest Accrued: <span className="font-bold text-success">₹{interestEarned.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>💎 Maturity Value: <span className="font-bold text-primary">₹{estMaturityVal.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>⏳ Years Remaining: <span className="font-bold text-textPrimary">{yearsRemaining.toFixed(1)} Years</span></div>
        </div>
      );
    }

    // 5. KVP
    if (name.includes('kisan') || name.includes('kvp')) {
      const doubleDate = new Date(invDate);
      doubleDate.setMonth(doubleDate.getMonth() + 115);
      const curValue = inv.amount * ((1 + rate) ** yearsPassed);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Investment: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>📅 Est. Doubling Date: <span className="font-bold text-primary">{doubleDate.toLocaleDateString()} (115 Months)</span></div>
          <div>📈 Current Est. Value: <span className="font-bold text-success">₹{curValue.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
        </div>
      );
    }

    // 6. SCSS
    if (name.includes('senior citizen') || name.includes('scss')) {
      const quarterlyInt = inv.amount * (inv.interest_rate / 400);
      const interestRec = quarterlyInt * quartersPassed;
      const nextPayout = new Date(invDate);
      nextPayout.setMonth(nextPayout.getMonth() + (quartersPassed + 1) * 3);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💵 Quarterly Interest Payout: <span className="font-bold text-success">₹{quarterlyInt.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>🪙 Interest Earned: <span className="font-bold text-textPrimary">₹{interestRec.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>📅 Next Payout Date: <span className="font-bold text-primary">{nextPayout.toLocaleDateString()}</span></div>
          <div>⏳ Maturity Date: <span className="font-bold text-textPrimary">{matDate.toLocaleDateString()}</span></div>
        </div>
      );
    }

    // 7. RD
    if (name.includes('recurring') || name.includes('rd')) {
      const totalCont = inv.amount * Math.floor(monthsPassed);
      const remainingMonths = Math.max(0, 60 - Math.floor(monthsPassed));
      const totalRDInvestment = inv.amount * 60;
      const rdInterest = totalRDInvestment * (inv.interest_rate / 200) * 2.5;
      const maturityValue = totalRDInvestment + rdInterest;
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💵 Monthly Deposit: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>💰 Current Total Deposits: <span className="font-bold text-textPrimary">₹{totalCont.toLocaleString()}</span></div>
          <div>🪙 Est. Interest Earned: <span className="font-bold text-success">₹{(rdInterest * (monthsPassed/60)).toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>💎 Est. Maturity Value: <span className="font-bold text-primary">₹{maturityValue.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>⏳ Remaining Months: <span className="font-bold text-textPrimary">{remainingMonths} Months</span></div>
        </div>
      );
    }

    // 8. Time Deposit (TD)
    if (name.includes('time deposit') || name.includes('td')) {
      const curValue = inv.amount * ((1 + rate) ** yearsPassed);
      const interest = curValue - inv.amount;
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Deposit Amount: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>🪙 Interest Accrued: <span className="font-bold text-success">₹{interest.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>📈 Current Value: <span className="font-bold text-success">₹{curValue.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>⏳ Maturity Date: <span className="font-bold text-textPrimary">{matDate.toLocaleDateString()}</span></div>
        </div>
      );
    }

    // 9. Savings Account
    if (name.includes('savings')) {
      const interestEarned = inv.amount * rate * yearsPassed;
      const lastCredit = new Date();
      lastCredit.setMonth(lastCredit.getMonth() > 8 ? 8 : 2);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Current Balance: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>🪙 Interest Earned: <span className="font-bold text-success">₹{interestEarned.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>📅 Last Interest Credit: <span className="font-bold text-textPrimary">{lastCredit.toLocaleDateString()}</span></div>
        </div>
      );
    }

    // 10. MSSC
    if (name.includes('mahila') || name.includes('mssc')) {
      const estMaturityVal = inv.amount * ((1 + rate) ** 2);
      const interest = estMaturityVal - inv.amount;
      const yearsRemaining = Math.max(0, 2 - yearsPassed);
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
          <div>💰 Deposit Amount: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
          <div>🪙 Interest Accrued: <span className="font-bold text-success">₹{interest.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>💎 Maturity Value: <span className="font-bold text-primary">₹{estMaturityVal.toLocaleString(undefined, {maximumFractionDigits: 1})}</span></div>
          <div>⏳ Years Remaining: <span className="font-bold text-textPrimary">{yearsRemaining.toFixed(1)} Years</span></div>
        </div>
      );
    }

    // Custom/Fallback
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-hoverBg/50 border border-borderColor rounded-xl text-[11px] mt-2">
        <div>💰 Principal: <span className="font-bold text-textPrimary">₹{inv.amount.toLocaleString()}</span></div>
        <div>📈 Rate: <span className="font-bold text-textPrimary">{inv.interest_rate}%</span></div>
        <div>⏳ Maturity Date: <span className="font-bold text-textPrimary">{matDate.toLocaleDateString()}</span></div>
      </div>
    );
  };

  if (!isOpen) return null;

  const metrics = summary.metrics || {};
  const alloc = summary.portfolio_allocation || [];
  const upcoming = summary.upcoming_maturities || [];

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cardBg border border-borderColor rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden relative animate-scale-up">
        
        {/* Header toolbar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-borderColor bg-background/30">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📮</span>
            <div>
              <h2 className="text-xl font-black text-textPrimary">India Post Investment Center</h2>
              <p className="text-[10px] text-textSecondary mt-0.5">Sovereign-backed small savings and pension schemes organizer</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={handlePrint}
              className="p-2 text-textSecondary hover:bg-hoverBg rounded-lg transition-colors"
              title="Print PDF Report"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handleExportCSV}
              className="p-2 text-textSecondary hover:bg-hoverBg rounded-lg transition-colors"
              title="Export CSV Ledger"
            >
              <FileSpreadsheetIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-textSecondary hover:bg-hoverBg rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 border-b border-borderColor bg-background/10 space-x-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-primary text-primary font-black' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('schemes')}
            className={`py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'schemes' ? 'border-primary text-primary font-black' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
          >
            Postal Schemes Directory
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`py-3 text-xs font-bold transition-all border-b-2 ${activeTab === 'portfolio' ? 'border-primary text-primary font-black' : 'border-transparent text-textSecondary hover:text-textPrimary'}`}
          >
            My Holdings Ledger ({investments.length})
          </button>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* TAB A: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Summary statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background/40 border border-borderColor rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Total India Post Investment</span>
                  <h3 className="text-xl font-black text-textPrimary mt-1">₹{(metrics.total_invested || 0).toLocaleString()}</h3>
                  <span className="text-[9px] text-textMuted mt-1 block">Active sovereign contracts</span>
                </div>

                <div className="bg-background/40 border border-borderColor rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Estimated Returns</span>
                  <h3 className="text-xl font-black text-success mt-1">₹{(metrics.estimated_returns || 0).toLocaleString(undefined, {maximumFractionDigits: 1})}</h3>
                  <span className="text-[9px] text-success font-bold mt-1 block">Accrued interest earnings</span>
                </div>

                <div className="bg-background/40 border border-borderColor rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Monthly Interest Equivalent</span>
                  <h3 className="text-xl font-black text-primary mt-1">₹{(metrics.monthly_interest || 0).toLocaleString(undefined, {maximumFractionDigits: 1})}</h3>
                  <span className="text-[9px] text-textMuted mt-1 block">From MIS / SCSS yields</span>
                </div>

                <div className="bg-background/40 border border-borderColor rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Matured Schemes</span>
                  <h3 className="text-xl font-black text-warning mt-1">₹{(metrics.total_matured || 0).toLocaleString()}</h3>
                  <span className="text-[9px] text-textMuted mt-1 block">{metrics.matured_schemes_count || 0} expired contracts</span>
                </div>
              </div>

              {/* Bento Grid: Charts & Allocation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Allocation Pie Chart */}
                <div className="bg-background/40 border border-borderColor rounded-3xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-3">Portfolio Allocation</h4>
                  {alloc.length > 0 ? (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={alloc}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {alloc.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-1 mt-2 text-[9px] font-semibold text-textSecondary">
                        {alloc.map((item, idx) => (
                          <div key={item.name} className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="truncate">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-textMuted text-xs">
                      No active investments allocated
                    </div>
                  )}
                </div>

                {/* Returns projection bar chart */}
                <div className="bg-background/40 border border-borderColor rounded-3xl p-5 shadow-sm md:col-span-2 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-2">Interest Yields Forecast</h4>
                  {investments.length > 0 ? (
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={investments}>
                          <XAxis dataKey="scheme_name" tick={false} />
                          <YAxis />
                          <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                          <Bar dataKey="amount" fill="#3B82F6" name="Invested Amount" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-textMuted text-xs">
                      Holdings chart details appear when logged
                    </div>
                  )}
                </div>
              </div>

              {/* Bento Grid Part 2: AI Insights & Reminders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AI Insights */}
                <div className="bg-background/40 border border-borderColor rounded-3xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Postal RAG AI Insights</span>
                  </h4>
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {insights.insights && insights.insights.map((ins, idx) => (
                      <div key={idx} className="flex items-start space-x-2 p-2.5 rounded-xl bg-hoverBg border border-borderColor/40">
                        <Info className="w-4.5 h-4.5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-textSecondary leading-relaxed">{ins.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reminders & Maturities */}
                <div className="bg-background/40 border border-borderColor rounded-3xl p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <Bell className="w-4 h-4 text-warning" />
                    <span>Upcoming Reminders</span>
                  </h4>
                  <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                    {insights.reminders && insights.reminders.map((rem, idx) => (
                      <div key={idx} className="flex items-start space-x-2 p-2.5 rounded-xl bg-warning/5 border border-warning/10 text-warning">
                        <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold">{rem.title}</p>
                          <p className="text-[10px] text-textSecondary mt-0.5">{rem.message}</p>
                        </div>
                      </div>
                    ))}
                    {upcoming.length > 0 && upcoming.map((up) => (
                      <div key={up.id} className="flex items-start space-x-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                        <Calendar className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold">{up.scheme_name} Maturing</p>
                          <p className="text-[10px] text-textSecondary mt-0.5">
                            Matures in {up.days_remaining} days (₹{up.amount.toLocaleString()})
                          </p>
                        </div>
                      </div>
                    ))}
                    {upcoming.length === 0 && (!insights.reminders || insights.reminders.length === 0) && (
                      <div className="h-32 flex items-center justify-center text-xs text-textMuted">
                        No upcoming reminders found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: Schemes Directory */}
          {activeTab === 'schemes' && (
            <div className="space-y-6">
              
              {/* Search schemes bar */}
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-textMuted absolute left-4 top-3.5" />
                <input 
                  type="text" 
                  placeholder="Search government schemes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-sm text-textPrimary focus:outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SCHEMES.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((scheme) => (
                  <div key={scheme.id} className="bg-background/40 border border-borderColor hover:border-borderColor/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[280px] transition-all">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-2xl">📮</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                          {scheme.rate}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-textPrimary mt-3 truncate">{scheme.name}</h4>
                      <p className="text-[10px] text-textSecondary mt-1 leading-relaxed line-clamp-2">{scheme.desc}</p>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold text-textSecondary">
                        <div>🔒 Lock-in: <span className="text-textPrimary">{scheme.lockIn}</span></div>
                        <div>⚖️ Risk: <span className="text-textPrimary">{scheme.risk}</span></div>
                        <div>🛡️ Section 80C: <span className="text-textPrimary">{scheme.tax}</span></div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4 border-t border-borderColor/40 mt-4">
                      <a 
                        href="https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx" 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-1/2 h-9 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor text-center leading-9 text-xs transition-colors"
                      >
                        Learn More
                      </a>
                      <button 
                        onClick={() => handleOpenInvest(scheme)}
                        className="w-1/2 h-9 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md text-xs transition-colors"
                      >
                        Invest
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB C: Holdings Ledger */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              
              {/* Filter Toolbar */}
              <div className="bg-background/40 border border-borderColor rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="relative w-full md:max-w-xs">
                  <Search className="w-4 h-4 text-textMuted absolute left-4 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Search nominee, branch, account number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-background border border-borderColor rounded-xl text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-11 px-3 bg-background border border-borderColor rounded-xl text-xs text-textPrimary focus:outline-none focus:border-primary w-full md:w-36"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Matured">Matured</option>
                    <option value="Maturing Soon">Maturing Soon</option>
                  </select>

                  <select 
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="h-11 px-3 bg-background border border-borderColor rounded-xl text-xs text-textPrimary focus:outline-none focus:border-primary w-full md:w-36"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                  </select>
                </div>
              </div>

              {/* Table Ledger list */}
              {filteredInvestments.length > 0 ? (
                <div className="bg-background/40 border border-borderColor rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-borderColor bg-background/30 text-textSecondary font-bold">
                        <th className="py-2.5 px-4 w-10"></th>
                        <th className="py-2.5 px-4">Scheme Name</th>
                        <th className="py-2.5 px-4 text-right">Principal</th>
                        <th className="py-2.5 px-4 text-center">Rate</th>
                        <th className="py-2.5 px-4">Nominee / Post Office</th>
                        <th className="py-2.5 px-4">Start / Maturity</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvestments.map((inv) => {
                        const isExpanded = expandedId === inv.id;
                        return (
                          <React.Fragment key={inv.id}>
                            <tr className="border-b border-borderColor/50 hover:bg-hoverBg/20 transition-colors">
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                                  className="text-textSecondary hover:text-textPrimary font-bold text-xs"
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-textPrimary">{inv.scheme_name}</p>
                                <p className="text-[9px] text-textSecondary mt-0.5">A/C: {inv.account_number || '-'}</p>
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-textPrimary">₹{inv.amount.toLocaleString()}</td>
                              <td className="py-3.5 px-4 text-center font-semibold text-textSecondary">{inv.interest_rate}%</td>
                              <td className="py-3.5 px-4 text-textSecondary">
                                <p className="font-bold">{inv.nominee ? `Nominee: ${inv.nominee}` : 'No Nominee'}</p>
                                <p className="text-[9px]">{inv.branch_name || '-'}</p>
                              </td>
                              <td className="py-3.5 px-4 text-textSecondary">
                                <p>{new Date(inv.investment_date).toLocaleDateString()}</p>
                                <p className="text-[9px]">{new Date(inv.maturity_date).toLocaleDateString()} ({inv.frequency})</p>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                  inv.status === 'Active' ? 'bg-success/15 text-success' : 'bg-textMuted/20 text-textMuted'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex justify-center space-x-1">
                                  <button 
                                    onClick={() => handleOpenEdit(inv)}
                                    className="p-1 hover:bg-hoverBg text-textSecondary rounded transition-colors"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(inv.id)}
                                    className="p-1 hover:bg-danger/10 text-danger rounded transition-colors"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-hoverBg/10">
                                <td colSpan={8} className="p-4">
                                  <h5 className="text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2">📋 Scheme Live Projection & Details</h5>
                                  {getSchemeDetails(inv)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-3xl bg-background/20">
                  <Coins className="w-8 h-8 text-textMuted mb-2" />
                  <p className="text-xs font-semibold">No India Post investments match search criteria</p>
                  <p className="text-[9px] text-textMuted mt-0.5">Click "Postal Schemes Directory" tab to register your first holding</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested Save/Edit Investment Modal */}
      {showInvestModal && selectedScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-cardBg border border-borderColor rounded-3xl p-6 shadow-xl relative animate-scale-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-bold text-textPrimary">
                {editingId ? 'Edit India Post Holding' : `Invest in ${selectedScheme.name}`}
              </h3>
              <button 
                onClick={() => setShowInvestModal(false)}
                className="p-1 rounded-full text-textSecondary hover:bg-hoverBg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Investment Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Interest Rate (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Investment Date</label>
                  <input 
                    type="date" 
                    required
                    value={investmentDate}
                    onChange={(e) => setInvestmentDate(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Maturity Date</label>
                  <input 
                    type="date" 
                    required
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Frequency</label>
                  <select 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="One Time">One Time</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Account Number (Opt)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 10245089"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Nominee Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Spouse, Child"
                    value={nominee}
                    onChange={(e) => setNominee(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Branch Post Office</label>
                  <input 
                    type="text" 
                    placeholder="e.g. GPO New Delhi"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Nominee / Scheme Status</label>
                <select 
                  value={invStatus}
                  onChange={(e) => setInvStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Matured">Matured</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Document folder 1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-borderColor">
                <button 
                  type="button"
                  onClick={() => setShowInvestModal(false)}
                  className="w-1/2 h-10 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 h-10 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md text-xs transition-colors"
                >
                  Save Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// SVG FileSpreadsheet helper icon local fallback
const FileSpreadsheetIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
  </svg>
);

export default IndiaPostModal;
