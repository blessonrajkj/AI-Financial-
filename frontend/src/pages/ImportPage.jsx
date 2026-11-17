import React, { useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Check, 
  Edit2, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  Search, 
  CheckSquare, 
  Square,
  Download
} from 'lucide-react';
import CategorySelect, { SubcategorySelect } from '../components/ui/CategorySelect';
import Select from '../components/ui/Select';
import { EXPENSE_TAXONOMY, INCOME_CATEGORIES, TRANSFER_CATEGORIES } from '../utils/taxonomy';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const ImportPage = () => {
  const { invalidateCache } = useThemeAndRefresh();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Parsed Statement State
  const [batchId, setBatchId] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [invalidRows, setInvalidRows] = useState([]);
  const [dupStrategy, setDupStrategy] = useState('skip'); // skip, replace, keep
  const [previewMetrics, setPreviewMetrics] = useState({
    total: 0,
    total_income: 0,
    total_expenses: 0,
    income_count: 0,
    expense_count: 0,
    bank: 'General Bank',
    is_sbi: false,
    confidence_score: 100,
    is_scanned: false,
    needs_review_count: 0
  });

  // Table Filter & Search State
  const [filterType, setFilterType] = useState('all'); // all, income, expense, duplicate, needs_review
  const [searchQuery, setSearchQuery] = useState('');

  // Final Import Success Summary
  const [successSummary, setSuccessSummary] = useState(null);

  const fileInputRef = useRef(null);

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (uploadedFile) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf'
    ];
    
    const isExtValid = uploadedFile.name.match(/\.(xlsx|xls|csv|pdf)$/i);
    if (!validTypes.includes(uploadedFile.type) && !isExtValid) {
      setError('Unsupported file type. Please upload an SBI Bank PDF statement, CSV, or Excel spreadsheet.');
      return;
    }

    setFile(uploadedFile);
    setError('');
    setSuccessSummary(null);
    setLoading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      setProgress(50);
      const res = await axios.post(`${API_URL}/transactions/upload-parse`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded * 70) / evt.total);
            setProgress(Math.max(20, pct));
          }
        }
      });

      setProgress(90);
      const data = res.data;
      setBatchId(data.batch_id || null);
      
      const parsedItems = data.transactions || data.preview || [];
      const summary = data.summary || {};
      const dupCount = summary.duplicate_count ?? data.duplicates_count ?? 0;
      const invalid = data.invalid_rows || [];

      setPreviewData(parsedItems);
      setDuplicatesCount(dupCount);
      setInvalidRows(invalid);

      // Default select all non-duplicate & valid rows
      const validSet = new Set();
      parsedItems.forEach((t, idx) => {
        if (!t.is_duplicate) {
          validSet.add(idx);
        }
      });
      setSelectedIndices(validSet);
      
      setPreviewMetrics({
        total: summary.total || data.total_extracted || parsedItems.length,
        total_income: summary.income_total ?? data.total_income ?? 0,
        total_expenses: summary.expense_total ?? data.total_expenses ?? 0,
        income_count: summary.income_count ?? data.income_count ?? 0,
        expense_count: summary.expense_count ?? data.expense_count ?? 0,
        bank: data.bank || data.bank_name || 'Bank Statement',
        is_sbi: data.is_sbi ?? data.is_sbi_statement ?? false,
        confidence_score: data.confidence_score || 98,
        is_scanned: data.is_scanned ?? data.is_scanned_pdf ?? false,
        needs_review_count: summary.needs_review_count ?? data.needs_review_count ?? 0
      });

      setProgress(100);
    } catch (err) {
      console.error("Statement parse error:", err);
      let msg = 'Failed to parse statement. Please verify file format and try again.';
      if (err.response?.status === 404) {
        msg = 'Statement parsing endpoint not found on server (404). Please verify backend connection.';
      } else if (err.response?.status === 413) {
        msg = 'The uploaded file exceeds the maximum allowed size. Please upload a smaller file.';
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        msg = 'Session expired. Please log in again to import statements.';
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          msg = detail === 'Not Found' ? 'Statement parse endpoint not found on server.' : detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map(d => typeof d === 'string' ? d : (d.msg || JSON.stringify(d))).join(' | ');
        } else if (typeof detail === 'object') {
          msg = JSON.stringify(detail);
        }
      }
      setError(msg);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRow = (index) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const selectAllRows = () => {
    const next = new Set();
    previewData.forEach((_, idx) => next.add(idx));
    setSelectedIndices(next);
  };

  const deselectAllRows = () => {
    setSelectedIndices(new Set());
  };

  const handleCellEdit = (index, field, value) => {
    const updated = [...previewData];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewData(updated);
  };

  const deleteRow = (index) => {
    const updated = previewData.filter((_, idx) => idx !== index);
    setPreviewData(updated);
    const next = new Set();
    selectedIndices.forEach(idx => {
      if (idx < index) next.add(idx);
      else if (idx > index) next.add(idx - 1);
    });
    setSelectedIndices(next);
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) {
      setError('Please select at least one transaction to import.');
      return;
    }

    setLoading(true);
    setError('');

    const transactionsToCommit = previewData
      .filter((_, idx) => selectedIndices.has(idx))
      .map(t => ({
        ...t,
        amount: parseFloat(t.amount) || 0,
        merchant: t.merchant || 'Uncategorized',
        description: t.description || t.merchant || 'Statement Entry',
        type: t.type || 'expense',
        category: t.category || 'Food & Dining',
        subcategory: t.subcategory || 'Uncategorized',
        reference_number: t.reference_number || t.transaction_id || '',
        balance: t.balance != null ? parseFloat(t.balance) : null
      }));

    try {
      const payload = {
        transactions: transactionsToCommit,
        duplicate_strategy: dupStrategy
      };

      const res = await axios.post(`${API_URL}/transactions/bulk-import`, payload);
      setSuccessSummary(res.data);
      setPreviewData([]);
      setSelectedIndices(new Set());
      invalidateCache();
    } catch (err) {
      console.error("Bulk import error:", err);
      let msg = 'Failed to import transactions to database.';
      if (err.response?.status === 404) {
        msg = 'Transaction import endpoint not found on server (404). Please verify backend connection.';
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          msg = detail === 'Not Found' ? 'Transaction bulk-import endpoint not found on server.' : detail;
        } else if (Array.isArray(detail)) {
          msg = detail.map(d => typeof d === 'string' ? d : (d.msg || JSON.stringify(d))).join(' | ');
        } else if (typeof detail === 'object') {
          msg = JSON.stringify(detail);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setBatchId(null);
    setPreviewData([]);
    setSelectedIndices(new Set());
    setSuccessSummary(null);
    setError('');
    setProgress(0);
  };

  const handleDownloadErrorCsv = () => {
    if (invalidRows.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Row,Errors,Original Text\n";
    invalidRows.forEach(row => {
      const dataStr = (row.raw_text || "").replace(/"/g, '""');
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
  const filteredPreviewData = useMemo(() => {
    return previewData.map((t, origIdx) => ({ ...t, origIdx })).filter(t => {
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
  }, [previewData, filterType, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-textPrimary leading-tight mb-1">
          Import Transactions
        </h1>
        <p className="text-xs sm:text-sm text-textSecondary max-w-full leading-relaxed">
          Upload bank statements or spreadsheets to automatically import transactions.
        </p>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-danger/10 border border-danger/20 text-danger text-xs sm:text-sm font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-danger/20 rounded-lg text-xs">×</button>
        </div>
      )}

      {/* ── 1. COMPACT MOBILE-FIRST FILE UPLOADER CONTAINER ── */}
      {!file && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full p-5 sm:p-8 border-2 border-dashed rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
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
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-xs shrink-0">
            <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <h3 className="text-lg sm:text-xl font-extrabold text-textPrimary text-center tracking-tight">
            Upload Bank Statement
          </h3>

          <div className="mt-1 mb-2 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">
            SBI PDF • CSV • Excel
          </div>

          <p className="text-xs sm:text-sm text-textSecondary text-center max-w-sm leading-relaxed">
            Upload your bank statement to automatically extract and sync transactions.
          </p>

          <p className="text-[11px] text-textMuted text-center mt-1">
            Supports SBI PDFs, CSV and Excel files.
          </p>

          <button 
            type="button" 
            className="mt-4 w-full max-w-[280px] sm:w-auto min-h-[48px] px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Select Statement File</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. UPLOAD & PARSE PROGRESS BAR ── */}
      {loading && progress > 0 && (
        <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-textSecondary">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
              <span className="truncate">Parsing & Normalizing Statement Transactions...</span>
            </span>
            <span className="font-numeric">{progress}%</span>
          </div>
          <div className="w-full bg-background border border-borderColor rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── 3. SUCCESSFUL IMPORT SUMMARY ── */}
      {successSummary && (
        <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xs text-center space-y-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-1 animate-scale-up">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-textPrimary">Statement Import Complete!</h3>
            <p className="text-xs text-textSecondary mt-1">Transaction entries have been integrated into your PariView financial database.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-2xl mx-auto pt-1">
            <div className="p-3 sm:p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Imported</span>
              <p className="text-xl sm:text-2xl font-black text-success mt-1 font-numeric">{successSummary.imported}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Skipped</span>
              <p className="text-xl sm:text-2xl font-black text-textPrimary mt-1 font-numeric">{successSummary.skipped}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Duplicates</span>
              <p className="text-xl sm:text-2xl font-black text-warning mt-1 font-numeric">{successSummary.duplicates}</p>
            </div>
            <div className="p-3 sm:p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Errors</span>
              <p className="text-xl sm:text-2xl font-black text-danger mt-1 font-numeric">{successSummary.errors}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3 pt-4 border-t border-borderColor">
            {invalidRows.length > 0 && (
              <button 
                onClick={handleDownloadErrorCsv}
                className="w-full sm:w-auto px-4 py-2.5 bg-danger/10 hover:bg-danger/15 text-danger text-xs font-bold rounded-xl transition-colors min-h-[44px]"
              >
                Download Error Report
              </button>
            )}
            <button 
              onClick={resetImporter}
              className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Upload New Statement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 4. STATEMENT PREVIEW & AUTOMATIC FORM FILL ── */}
      {file && !successSummary && !loading && (
        <div className="space-y-4 sm:space-y-6">

          {/* SBI STATEMENT DETECTION BADGER BANNER */}
          {previewMetrics.is_sbi ? (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-primary/10 border border-blue-500/30 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-xs shrink-0">
                  SBI
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-textPrimary">SBI Statement Detected</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold text-[9px] uppercase tracking-wider">
                      Auto-Parsed
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-textSecondary font-medium mt-0.5">
                    Extracted {previewMetrics.total} transactions using PariView SBI Statement Engine.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-textSecondary self-start md:self-auto flex-wrap">
                <span className="px-2.5 py-1 rounded-xl bg-surface border border-borderColor flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  <span>Parser Confidence: <strong className="text-textPrimary">{previewMetrics.confidence_score}%</strong></span>
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-surface border border-borderColor text-[11px]">
                  OCR Used: <strong className="text-textPrimary">{previewMetrics.is_scanned ? "Yes" : "No"}</strong>
                </span>
              </div>
            </div>
          ) : (
            /* GENERIC STATEMENT TOP HEADER */
            <div className="flex justify-between items-start sm:items-center p-3.5 sm:p-4 bg-cardBg border border-borderColor rounded-2xl flex-col sm:flex-row gap-3">
              <div className="flex items-center space-x-3 truncate w-full sm:w-auto">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                  {file.name.endsWith('.pdf') ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                </div>
                <div className="truncate">
                  <h4 className="text-xs sm:text-sm font-bold text-textPrimary truncate">{file.name}</h4>
                  <p className="text-[10px] sm:text-xs text-textSecondary mt-0.5 font-numeric">{(file.size / 1024).toFixed(1)} KB · {previewMetrics.bank}</p>
                </div>
              </div>

              <button 
                onClick={resetImporter}
                className="w-full sm:w-auto py-2 px-3 bg-hoverBg hover:bg-borderColor text-textPrimary text-xs font-bold rounded-xl border border-borderColor transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Change File</span>
              </button>
            </div>
          )}

          {/* AGGREGATE METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Found</span>
              <h3 className="text-xl sm:text-2xl font-black text-textPrimary mt-0.5 font-numeric">{previewMetrics.total}</h3>
              <p className="text-[10px] text-textSecondary mt-0.5 font-numeric">
                {selectedIndices.size} selected
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Money In</span>
              <h3 className="text-xl sm:text-2xl font-black text-success mt-0.5 font-numeric">₹{(previewMetrics.total_income || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-success font-bold mt-0.5 font-numeric">
                {previewMetrics.income_count} entries
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Money Out</span>
              <h3 className="text-xl sm:text-2xl font-black text-danger mt-0.5 font-numeric">₹{(previewMetrics.total_expenses || 0).toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-danger font-bold mt-0.5 font-numeric">
                {previewMetrics.expense_count} entries
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Duplicates</span>
              <h3 className="text-xl sm:text-2xl font-black text-warning mt-0.5 font-numeric">{duplicatesCount}</h3>
              <p className="text-[10px] text-textMuted font-medium mt-0.5">
                Strategy: {dupStrategy}
              </p>
            </div>

            <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-textMuted uppercase tracking-wider block">Needs Review</span>
              <h3 className={`text-xl sm:text-2xl font-black mt-0.5 font-numeric ${previewMetrics.needs_review_count > 0 ? 'text-amber-500' : 'text-textPrimary'}`}>
                {previewMetrics.needs_review_count || 0}
              </h3>
              <p className="text-[10px] text-textMuted font-medium mt-0.5 font-numeric">
                {invalidRows.length} errors
              </p>
            </div>
          </div>

          {/* STRATEGY SELECTION & ACTION BAR */}
          <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="md:col-span-2 space-y-3">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-textPrimary">Duplicate Strategy</h4>
                <p className="text-[10px] text-textSecondary mt-0.5">Choose how PariView handles duplicate entries detected in your account:</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDupStrategy('skip')}
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all min-h-[44px] ${
                    dupStrategy === 'skip' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs block font-extrabold">Skip</span>
                  <span className="text-[9px] text-textMuted font-normal mt-0.5 block hidden sm:block">Ignore duplicates</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setDupStrategy('replace')}
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all min-h-[44px] ${
                    dupStrategy === 'replace' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs block font-extrabold">Overwrite</span>
                  <span className="text-[9px] text-textMuted font-normal mt-0.5 block hidden sm:block">Delete & replace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDupStrategy('keep')}
                  className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all min-h-[44px] ${
                    dupStrategy === 'keep' 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs block font-extrabold">Keep Both</span>
                  <span className="text-[9px] text-textMuted font-normal mt-0.5 block hidden sm:block">Import anyway</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleImport}
                className="w-full min-h-[48px] bg-primary hover:bg-primaryHover text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Import Transactions ({selectedIndices.size})</span>
              </button>
              {invalidRows.length > 0 && (
                <div className="mt-2 text-center">
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
          <div className="bg-cardBg border border-borderColor rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 max-w-full overflow-hidden">
            
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderColor">
              <div className="flex items-center gap-2 sm:gap-3">
                <h4 className="text-sm sm:text-base font-extrabold text-textPrimary tracking-tight">Statement Preview</h4>
                <span className="text-[10px] sm:text-xs font-bold text-textMuted bg-hoverBg px-2 py-0.5 rounded-full border border-borderColor font-numeric">
                  {filteredPreviewData.length} rows
                </span>
              </div>

              {/* Table Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-auto">
                  <Search className="w-3.5 h-3.5 text-textMuted absolute left-3 top-2.5 pointer-events-none" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search merchant..."
                    className="h-8 w-full sm:w-40 pl-8 pr-3 bg-surface border border-borderColor rounded-xl text-xs text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-surface border border-borderColor rounded-xl p-0.5 overflow-x-auto max-w-full">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'income', label: 'Money In' },
                    { id: 'expense', label: 'Money Out' },
                    { id: 'duplicate', label: 'Dupes' },
                    { id: 'needs_review', label: 'Review' }
                  ].map((filterItem) => (
                    <button
                      key={filterItem.id}
                      type="button"
                      onClick={() => setFilterType(filterItem.id)}
                      className={`px-2 py-1 text-[9px] sm:text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all whitespace-nowrap ${
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
            <div className="flex items-center justify-between text-xs font-bold text-textSecondary pt-0.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllRows}
                  className="hover:text-primary transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All</span>
                </button>
                <button
                  type="button"
                  onClick={deselectAllRows}
                  className="hover:text-primary transition-colors flex items-center gap-1 min-h-[44px] sm:min-h-0"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Deselect All</span>
                </button>
              </div>

              <span className="text-[10px] text-textMuted font-medium hidden sm:inline">
                Click any cell to edit details before importing
              </span>
            </div>

            {/* Mobile Card Preview List (< md) */}
            <div className="block md:hidden space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {filteredPreviewData.map((t) => {
                const idx = t.origIdx;
                const isSelected = selectedIndices.has(idx);
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-primary/5 border-primary/30 shadow-xs'
                        : 'bg-surface/60 border-borderColor/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(idx)}
                          className="mt-0.5 rounded border-borderColor text-primary focus:ring-primary w-4 h-4 cursor-pointer flex-shrink-0 min-h-[20px]"
                        />
                        <div className="min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              value={t.merchant || ''}
                              onChange={(e) => handleCellEdit(idx, 'merchant', e.target.value)}
                              className="w-full px-2 py-1 bg-background border rounded-lg text-xs text-textPrimary font-bold"
                              placeholder="Merchant"
                            />
                          ) : (
                            <p className="font-bold text-textPrimary text-xs truncate">
                              {t.merchant || 'Uncategorized'}
                            </p>
                          )}
                          <p className="text-[10px] text-textMuted font-normal truncate mt-0.5">
                            {t.description || 'No description'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isEditing ? (
                          <input
                            type="number"
                            value={t.amount}
                            onChange={(e) => handleCellEdit(idx, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-20 px-1.5 py-1 bg-background border rounded-lg text-xs text-right text-textPrimary font-bold font-numeric"
                          />
                        ) : (
                          <span className={`text-xs font-black font-numeric ${t.type === 'income' ? 'text-success' : 'text-textPrimary'}`}>
                            {t.type === 'income' ? '+' : '−'}₹{(t.amount || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="block text-[9px] text-textMuted font-numeric mt-0.5">{t.date}</span>
                      </div>
                    </div>

                    {/* Category & Status Row */}
                    <div className="space-y-1.5 pt-2 border-t border-borderColor/40">
                      <div className="grid grid-cols-2 gap-2">
                        <CategorySelect
                          value={t.category || 'Food & Dining'}
                          onChange={(newCat) => {
                            handleCellEdit(idx, 'category', newCat);
                            const defaultSub = EXPENSE_TAXONOMY[newCat] ? EXPENSE_TAXONOMY[newCat][0] : 'Uncategorized';
                            handleCellEdit(idx, 'subcategory', defaultSub);
                          }}
                          options={t.type === 'income' ? ['Income'] : t.type === 'transfer' ? ['Cash & Transfers'] : Object.keys(EXPENSE_TAXONOMY)}
                          size="sm"
                        />
                        <SubcategorySelect
                          category={t.category || 'Food & Dining'}
                          value={t.subcategory || 'Uncategorized'}
                          onChange={(newSub) => handleCellEdit(idx, 'subcategory', newSub)}
                          subcategories={
                            t.type === 'income'
                              ? INCOME_CATEGORIES
                              : t.type === 'transfer'
                              ? TRANSFER_CATEGORIES
                              : (EXPENSE_TAXONOMY[t.category] || ['Uncategorized'])
                          }
                          size="sm"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            t.type === 'income' ? 'bg-success/15 text-success' : 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                          }`}>
                            {t.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                          {t.needs_review ? (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] uppercase rounded-full">
                              Review
                            </span>
                          ) : t.is_duplicate ? (
                            <span className="px-2 py-0.5 bg-warning/15 text-warning font-extrabold text-[9px] uppercase rounded-full">
                              Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-success/15 text-success font-extrabold text-[9px] uppercase rounded-full">
                              Ready
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-textMuted hover:text-primary transition-colors"
                            title={isEditing ? "Save row" : "Edit row"}
                          >
                            {isEditing ? <Check className="w-3.5 h-3.5 text-success" /> : <Edit2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-textMuted hover:text-danger transition-colors"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto max-h-[420px] overflow-y-auto border border-borderColor/60 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-cardBg z-10">
                  <tr className="border-b border-borderColor text-textMuted uppercase tracking-wider font-extrabold text-[10px]">
                    <th className="py-3 px-3 w-10 text-center">Sel</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Merchant</th>
                    <th className="py-3 px-3">Description</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Subcategory</th>
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
                            className="w-4 h-4 rounded border-borderColor text-primary focus:ring-primary/20 cursor-pointer min-h-[24px]"
                          />
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 font-semibold text-textSecondary whitespace-nowrap font-numeric">
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
                        <td className="py-2.5 px-3 text-textMuted max-w-[180px] truncate" title={t.description}>
                          {t.description}
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <Select 
                              value={t.type}
                              onChange={(e) => handleCellEdit(idx, 'type', e.target.value)}
                              size="sm"
                              minWidth="w-40"
                              options={[
                                { value: 'expense', label: 'Expense (Money Out)' },
                                { value: 'income', label: 'Income (Money In)' }
                              ]}
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase w-fit ${
                                t.type === 'income' ? 'bg-success/15 text-success' : 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                              }`}>
                                {t.type === 'income' ? 'Income' : 'Expense'}
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

                        {/* Main Category */}
                        <td className="py-2.5 px-3 min-w-[130px]">
                          <CategorySelect 
                            value={t.category || 'Food & Dining'}
                            onChange={(newCat) => {
                              handleCellEdit(idx, 'category', newCat);
                              const defaultSub = EXPENSE_TAXONOMY[newCat] ? EXPENSE_TAXONOMY[newCat][0] : 'Uncategorized';
                              handleCellEdit(idx, 'subcategory', defaultSub);
                            }}
                            options={t.type === 'income' ? ['Income'] : t.type === 'transfer' ? ['Cash & Transfers'] : Object.keys(EXPENSE_TAXONOMY)}
                            size="sm"
                          />
                        </td>

                        {/* Subcategory */}
                        <td className="py-2.5 px-3 min-w-[130px]">
                          <SubcategorySelect
                            category={t.category || 'Food & Dining'}
                            value={t.subcategory || 'Uncategorized'}
                            onChange={(newSub) => handleCellEdit(idx, 'subcategory', newSub)}
                            subcategories={
                              t.type === 'income'
                                ? INCOME_CATEGORIES
                                : t.type === 'transfer'
                                ? TRANSFER_CATEGORIES
                                : (EXPENSE_TAXONOMY[t.category] || ['Uncategorized'])
                            }
                            size="sm"
                          />
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
                              Review
                            </span>
                          ) : t.is_duplicate ? (
                            <span className="px-2 py-0.5 bg-warning/15 text-warning font-extrabold text-[9px] uppercase rounded-full">
                              Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-success/15 text-success font-extrabold text-[9px] uppercase rounded-full">
                              Ready
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingIndex(isEditing ? null : idx)}
                              className="p-1 text-textMuted hover:text-primary transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title={isEditing ? "Save row" : "Edit row"}
                            >
                              {isEditing ? <Check className="w-3.5 h-3.5 text-success" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(idx)}
                              className="p-1 text-textMuted hover:text-danger transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
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
