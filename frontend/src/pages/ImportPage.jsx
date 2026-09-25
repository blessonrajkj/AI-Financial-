import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  Calendar,
  X,
  ShieldCheck,
  CheckSquare,
  Square,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const CATEGORY_OPTIONS = [
  'Food', 'Groceries', 'Transportation', 'Healthcare', 'Entertainment', 
  'Education', 'Shopping', 'Bills', 'Recharge', 'Subscriptions', 
  'Investment', 'Salary', 'Other Income', 'Refunds', 'Cash Withdrawal', 'Utilities', 'Others'
];

const ImportPage = () => {
  const { invalidateCache } = useThemeAndRefresh();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [successSummary, setSuccessSummary] = useState(null);

  // Parsed States
  const [previewData, setPreviewData] = useState([]);
  const [previewMetrics, setPreviewMetrics] = useState({});
  const [invalidRows, setInvalidRows] = useState([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  // Interactive Table States
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, income, expense, duplicate

  // Strategy Configurations
  const [dupStrategy, setDupStrategy] = useState('skip'); // skip, replace, keep

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setPreviewData([]);
    setPreviewMetrics({});
    setInvalidRows([]);
    setDuplicatesCount(0);
    setSelectedIndices(new Set());
    setEditingIndex(null);
    setSuccessSummary(null);
    setError('');
    setProgress(0);
  };

  const parseFile = async (selectedFile) => {
    setFile(selectedFile);
    setError('');
    setLoading(true);
    setProgress(15);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setProgress(40);
      const res = await axios.post(`${API_URL}/transactions/upload-parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProgress(80);
      
      const parsedData = res.data.transactions || [];
      const invalid = res.data.invalid_rows || [];
      const summary = res.data.summary || {};
      
      setPreviewData(parsedData);
      setInvalidRows(invalid);
      setDuplicatesCount(summary.duplicate_count || 0);
      
      // Select all non-duplicate transactions by default
      const initialSelected = new Set();
      parsedData.forEach((t, idx) => {
        if (!t.is_duplicate) {
          initialSelected.add(idx);
        }
      });
      setSelectedIndices(initialSelected);

      setPreviewMetrics({
        total: summary.total || parsedData.length,
        total_income: summary.income_total || 0,
        total_expenses: summary.expense_total || 0,
        income_count: summary.income_count || 0,
        expense_count: summary.expense_count || 0,
        needs_review_count: summary.needs_review_count || parsedData.filter(t => t.needs_review).length || 0,
        detected_categories: summary.detected_categories || [],
        detected_accounts: summary.detected_accounts || [],
        bank: res.data.bank || 'Generic Statement',
        is_sbi: res.data.is_sbi || false,
        is_scanned: res.data.is_scanned || false,
        confidence_score: res.data.confidence_score || 92
      });
      
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process and parse statement file. Please verify file integrity.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  // Row Selection Controls
  const toggleSelectRow = (idx) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const selectAllRows = () => {
    const all = new Set(previewData.map((_, i) => i));
    setSelectedIndices(all);
  };

  const deselectAllRows = () => {
    setSelectedIndices(new Set());
  };

  const deleteRow = (idx) => {
    const updated = previewData.filter((_, i) => i !== idx);
    setPreviewData(updated);
    const nextSel = new Set();
    selectedIndices.forEach(i => {
      if (i < idx) nextSel.add(i);
      else if (i > idx) nextSel.add(i - 1);
    });
    setSelectedIndices(nextSel);
  };

  const handleCellEdit = (idx, field, value) => {
    const updated = [...previewData];
    updated[idx] = { ...updated[idx], [field]: value };
    setPreviewData(updated);
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) {
      setError("Please select at least one transaction row to import.");
      return;
    }

    setLoading(true);
    setProgress(10);
    setError('');

    // Filter only user-selected transactions
    const payloadTransactions = previewData.filter((_, idx) => selectedIndices.has(idx));

    try {
      setProgress(40);
      const res = await axios.post(`${API_URL}/transactions/bulk-import`, {
        transactions: payloadTransactions,
        duplicate_strategy: dupStrategy
      });
      
      setProgress(80);
      setSuccessSummary(res.data);
      setProgress(100);
      
      // Trigger App context refresh for instant dashboard & reports sync
      invalidateCache();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrorCsv = () => {
    if (invalidRows.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Row Number,Errors,Raw Data\n";
    invalidRows.forEach(row => {
      const dataStr = (row.data || []).map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",");
      csvContent += `${row.rowNum},"${(row.reasons || []).join(" | ")}",${dataStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_errors_${file ? file.name.replace(/\.[^/.]+$/, "") : "statement"}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filtered rows for preview rendering
  const filteredPreviewData = previewData.map((t, origIdx) => ({ ...t, origIdx })).filter(t => {
    if (filterType === 'income' && t.type !== 'income') return false;
    if (filterType === 'expense' && t.type !== 'expense') return false;
    if (filterType === 'duplicate' && !t.is_duplicate) return false;
    if (filterType === 'needs_review' && !t.needs_review) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchMerchant = (t.merchant || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchRef = (t.reference_number || '').toLowerCase().includes(q);
      const matchCategory = (t.category || '').toLowerCase().includes(q);
      return matchMerchant || matchDesc || matchRef || matchCategory;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Import Transactions</h1>
        <p className="text-textSecondary mt-1">Upload account statements, bank PDFs, or spreadsheets to automatically extract and sync transactions</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. FILE UPLOADER CONTAINER ── */}
      {!file && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`h-72 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            dragActive 
              ? 'border-primary bg-primary/5 scale-[0.99]' 
              : 'border-borderColor bg-cardBg hover:border-primary/40 hover:bg-hoverBg/10'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.pdf" 
            className="hidden" 
          />
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-textPrimary">Upload Bank Statement (SBI PDF, CSV, Excel)</h3>
          <p className="text-xs text-textSecondary mt-1.5 max-w-md text-center">
            Supports official SBI bank PDFs, credit card statements, and standard financial CSV exports
          </p>
          <button 
            type="button" 
            className="mt-5 px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>Select Statement File</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. UPLOAD & PARSE PROGRESS BAR ── */}
      {loading && progress > 0 && (
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-textSecondary">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span>Parsing and Normalizing Statement Transactions...</span>
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-background border border-borderColor rounded-full h-3 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── 3. SUCCESSFUL IMPORT SUMMARY ── */}
      {successSummary && (
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-2 animate-scale-up">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-textPrimary">Statement Import Complete!</h3>
            <p className="text-xs text-textSecondary mt-1">Transaction entries have been integrated into your PariView financial database.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Successfully Imported</span>
              <p className="text-2xl font-black text-success mt-1">{successSummary.imported}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Skipped</span>
              <p className="text-2xl font-black text-textPrimary mt-1">{successSummary.skipped}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Duplicates</span>
              <p className="text-2xl font-black text-warning mt-1">{successSummary.duplicates}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Errors</span>
              <p className="text-2xl font-black text-danger mt-1">{successSummary.errors}</p>
            </div>
          </div>

          <div className="flex justify-center space-x-3 pt-6 border-t border-borderColor">
            {invalidRows.length > 0 && (
              <button 
                onClick={handleDownloadErrorCsv}
                className="px-4 py-2 bg-danger/10 hover:bg-danger/15 text-danger text-xs font-bold rounded-xl transition-colors"
              >
                Download Error Report
              </button>
            )}
            <button 
              onClick={resetImporter}
              className="px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <span>Upload New Statement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 4. STATEMENT PREVIEW & AUTOMATIC FORM FILL ── */}
      {file && !successSummary && !loading && (
        <div className="space-y-6">

          {/* SBI STATEMENT DETECTION BADGER BANNER */}
          {previewMetrics.is_sbi ? (
            <div className="p-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-primary/10 border border-blue-500/30 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md flex-shrink-0">
                  SBI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-textPrimary">SBI Statement Detected</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider">
                      Auto-Parsed
                    </span>
                  </div>
                  <p className="text-xs text-textSecondary font-medium mt-0.5">
                    Extracted {previewMetrics.total} transactions using PariView SBI Statement Engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold text-textSecondary self-start md:self-auto flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-surface border border-borderColor flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Parser Confidence: <strong className="text-textPrimary">{previewMetrics.confidence_score}%</strong></span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-surface border border-borderColor">
                  OCR Used: <strong className="text-textPrimary">{previewMetrics.is_scanned ? "Yes" : "No"}</strong>
                </span>
              </div>
            </div>
          ) : (
            /* GENERIC STATEMENT TOP HEADER */
            <div className="flex justify-between items-center p-4 bg-cardBg border border-borderColor rounded-2xl flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  {file.name.endsWith('.pdf') ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-textPrimary truncate max-w-xs">{file.name}</h4>
                  <p className="text-[10px] text-textSecondary mt-0.5">{(file.size / 1024).toFixed(1)} KB · {previewMetrics.bank}</p>
                </div>
              </div>

              <button 
                onClick={resetImporter}
                className="p-1 rounded-full text-textSecondary hover:bg-hoverBg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* AGGREGATE METRICS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-cardBg border border-borderColor rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Transactions Found</span>
              <h3 className="text-2xl font-black text-textPrimary mt-1">{previewMetrics.total}</h3>
              <p className="text-[10px] text-textSecondary mt-1">
                {selectedIndices.size} selected
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Money In</span>
              <h3 className="text-2xl font-black text-success mt-1">₹{(previewMetrics.total_income || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-success font-bold mt-1">
                {previewMetrics.income_count} income entries
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Money Out</span>
              <h3 className="text-2xl font-black text-danger mt-1">₹{(previewMetrics.total_expenses || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-danger font-bold mt-1">
                {previewMetrics.expense_count} expense entries
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Possible Duplicates</span>
              <h3 className="text-2xl font-black text-warning mt-1">{duplicatesCount}</h3>
              <p className="text-[10px] text-textMuted font-medium mt-1">
                Strategy: {dupStrategy}
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-3xl p-4 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
              <span className="text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Needs Review</span>
              <h3 className={`text-2xl font-black mt-1 ${previewMetrics.needs_review_count > 0 ? 'text-amber-500' : 'text-textPrimary'}`}>
                {previewMetrics.needs_review_count || 0}
              </h3>
              <p className="text-[10px] text-textMuted font-medium mt-1">
                {invalidRows.length} format errors
              </p>
            </div>
          </div>

          {/* STRATEGY SELECTION & ACTION BAR */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-textPrimary">Duplicate Strategy</h4>
                <p className="text-[10px] text-textSecondary mt-0.5">Choose how PariView handles duplicate entries detected in your account:</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDupStrategy('skip')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'skip' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Skip Duplicates</span>
                  <span className="text-[9px] text-textMuted font-normal mt-1 block">Ignore duplicates</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setDupStrategy('replace')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'replace' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Overwrite Old</span>
                  <span className="text-[9px] text-textMuted font-normal mt-1 block">Delete & replace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDupStrategy('keep')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'keep' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Keep Both</span>
                  <span className="text-[9px] text-textMuted font-normal mt-1 block">Import anyway</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleImport}
                className="w-full h-12 bg-primary hover:bg-primaryHover text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="w-4.5 h-4.5" />
                <span>Import Transactions ({selectedIndices.size})</span>
              </button>
              {invalidRows.length > 0 && (
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold text-danger">⚠️ {invalidRows.length} rows failed format check. </span>
                  <button 
                    type="button"
                    onClick={handleDownloadErrorCsv}
                    className="text-[10px] font-black text-danger hover:underline"
                  >
                    Download report
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW TABLE WITH INLINE EDITS & SELECTION */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm overflow-hidden space-y-4">
            
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderColor">
              <div className="flex items-center gap-3">
                <h4 className="text-base font-extrabold text-textPrimary tracking-tight">Statement Preview Table</h4>
                <span className="text-xs font-bold text-textMuted bg-hoverBg px-2.5 py-1 rounded-full border border-borderColor">
                  {filteredPreviewData.length} rows shown
                </span>
              </div>

              {/* Table Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-textMuted absolute left-3 top-2.5 pointer-events-none" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search merchant, ref..."
                    className="h-8 pl-8 pr-3 bg-surface border border-borderColor rounded-xl text-xs text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-surface border border-borderColor rounded-xl p-0.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'income', label: 'Money In' },
                    { id: 'expense', label: 'Money Out' },
                    { id: 'duplicate', label: 'Duplicates' },
                    { id: 'needs_review', label: 'Needs Review' }
                  ].map((filterItem) => (
                    <button
                      key={filterItem.id}
                      type="button"
                      onClick={() => setFilterType(filterItem.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                        filterType === filterItem.id ? 'bg-primary text-white' : 'text-textMuted hover:text-textPrimary'
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selection Quick Buttons */}
            <div className="flex items-center justify-between text-xs font-bold text-textSecondary pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllRows}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={deselectAllRows}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </button>
              </div>

              <span className="text-[11px] text-textMuted font-medium">
                Tip: Click any field cell to edit values before importing
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-cardBg z-10">
                  <tr className="border-b border-borderColor text-textMuted uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-3 px-3 w-10 text-center">Sel</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Merchant</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Reference</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderColor/60">
                  {filteredPreviewData.map((t) => {
                    const idx = t.origIdx;
                    const isSelected = selectedIndices.has(idx);
                    const isEditing = editingIndex === idx;

                    return (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-hoverBg/40 opacity-75'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(idx)}
                            className="w-4 h-4 rounded border-borderColor text-primary focus:ring-primary/20 cursor-pointer"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 font-semibold text-textSecondary whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="date"
                              value={t.date}
                              onChange={(e) => handleCellEdit(idx, 'date', e.target.value)}
                              className="w-28 px-1.5 py-0.5 bg-background border rounded text-xs text-textPrimary"
                            />
                          ) : (
                            t.date
                          )}
                        </td>

                        {/* Merchant */}
                        <td className="py-2.5 px-3 font-bold text-textPrimary max-w-[140px] truncate">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={t.merchant || ''}
                              onChange={(e) => handleCellEdit(idx, 'merchant', e.target.value)}
                              className="w-full px-1.5 py-0.5 bg-background border rounded text-xs text-textPrimary"
                            />
                          ) : (
                            t.merchant
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3 text-textMuted max-w-[200px] truncate" title={t.description}>
                          {t.description}
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select 
                              value={t.type}
                              onChange={(e) => handleCellEdit(idx, 'type', e.target.value)}
                              className="px-1.5 py-0.5 bg-background border rounded text-xs text-textPrimary"
                            >
                              <option value="expense">Expense (Money Out)</option>
                              <option value="income">Income (Money In)</option>
                            </select>
                          ) : (
                            <div className="flex flex-col">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase w-fit ${
                                t.type === 'income' ? 'bg-success/15 text-success' : 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                              }`}>
                                {t.type === 'income' ? 'Income' : 'Expense'}
                              </span>
                              <span className="text-[9px] text-textMuted font-bold mt-0.5 pl-1">
                                {t.type === 'income' ? 'Money In' : 'Money Out'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right font-black font-numeric">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={t.amount}
                              onChange={(e) => handleCellEdit(idx, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-20 px-1.5 py-0.5 bg-background border rounded text-xs text-right text-textPrimary"
                            />
                          ) : (
                            <span className={t.type === 'income' ? 'text-success font-bold' : 'text-textPrimary font-bold'}>
                              {t.type === 'income' ? '+' : '−'}₹{t.amount?.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select 
                              value={t.category || 'Others'}
                              onChange={(e) => handleCellEdit(idx, 'category', e.target.value)}
                              className="px-1.5 py-0.5 bg-background border rounded text-xs text-textPrimary"
                            >
                              {CATEGORY_OPTIONS.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-background border border-borderColor text-[10px] font-semibold text-textSecondary">
                              {t.category || 'Others'}
                            </span>
                          )}
                        </td>

                        {/* Reference Number */}
                        <td className="py-2.5 px-3 text-textMuted font-numeric text-[11px]">
                          {t.reference_number || t.transaction_id || '—'}
                        </td>

                        {/* Balance */}
                        <td className="py-2.5 px-3 text-right font-numeric text-textMuted text-[11px]">
                          {t.balance != null ? `₹${t.balance.toLocaleString('en-IN')}` : '—'}
                        </td>

                        {/* Conflict Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {t.needs_review ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] uppercase rounded-full" title={t.review_reason}>
                              Needs Review
                            </span>
                          ) : t.is_duplicate ? (
                            <span className="px-2 py-0.5 bg-warning/15 text-warning font-extrabold text-[9px] uppercase rounded-full">
                              Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-success/15 text-success font-extrabold text-[9px] uppercase rounded-full">
                              Ready to Sync
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="p-1 text-textMuted hover:text-primary transition-colors"
                              title={isEditing ? "Save row" : "Edit row"}
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5 text-success" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(idx)}
                              className="p-1 text-textMuted hover:text-danger transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default ImportPage;
