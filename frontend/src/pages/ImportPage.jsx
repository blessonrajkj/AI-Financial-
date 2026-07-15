import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
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
  X
} from 'lucide-react';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const AUTO_CATEGORIES = [
  { name: 'Food', keywords: ['swiggy', 'zomato', 'restaurant', 'burger', 'mcdonald', 'starbucks', 'cafe', 'pizza', 'eats', 'food'] },
  { name: 'Groceries', keywords: ['supermarket', 'mart', 'grocer', 'blinkit', 'zepto', 'bigbasket', 'dmart', 'reliance retail'] },
  { name: 'Transportation', keywords: ['uber', 'ola', 'metro', 'taxi', 'railway', 'irctc', 'cab', 'rapido'] },
  { name: 'Healthcare', keywords: ['hospital', 'pharmacy', 'medical', 'doctor', 'apollo', 'lab', 'clinic', 'dentist'] },
  { name: 'Entertainment', keywords: ['netflix', 'spotify', 'prime video', 'youtube premium', 'theatre', 'cinema', 'bookmyshow', 'disney'] },
  { name: 'Education', keywords: ['udemy', 'coursera', 'college', 'school', 'tuition', 'books', 'stationery'] },
  { name: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'shopping', 'mall', 'clothing', 'apparel'] },
  { name: 'Bills', keywords: ['electricity', 'water bill', 'gas bill', 'wifi', 'broadband', 'telecom', 'jio', 'airtel', 'bsnl'] },
  { name: 'Recharge', keywords: ['recharge', 'prepaid', 'dth', 'vodafone', 'paytm recharge'] },
  { name: 'Subscriptions', keywords: ['aws', 'github', 'zoom', 'openai', 'midjourney', 'google cloud', 'heroku'] },
  { name: 'Investment', keywords: ['zerodha', 'groww', 'mutual fund', 'stock', 'invest', 'bonds', 'sip'] }
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
  const [rawRows, setRawRows] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [previewMetrics, setPreviewMetrics] = useState({});
  const [invalidRows, setInvalidRows] = useState([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

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
    setRawRows([]);
    setDetectedColumns({});
    setPreviewData([]);
    setPreviewMetrics({});
    setInvalidRows([]);
    setDuplicatesCount(0);
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
      
      const parsedData = res.data.transactions;
      const invalid = res.data.invalid_rows || [];
      const summary = res.data.summary;
      
      setPreviewData(parsedData);
      setInvalidRows(invalid);
      setDuplicatesCount(summary.duplicate_count);
      
      setPreviewMetrics({
        total: summary.total,
        total_income: summary.income_total,
        total_expenses: summary.expense_total,
        detected_categories: summary.detected_categories || [],
        detected_accounts: summary.detected_accounts || [],
        bank: res.data.bank || 'Generic',
        is_scanned: res.data.is_scanned || false
      });
      
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process and parse file. Please upload a valid CSV, Excel, or PDF bank statement.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setProgress(10);
    setError('');

    try {
      setProgress(40);
      const res = await axios.post(`${API_URL}/transactions/bulk-import`, {
        transactions: previewData,
        duplicate_strategy: dupStrategy
      });
      
      setProgress(80);
      setSuccessSummary(res.data);
      setProgress(100);
      
      // Trigger App context refresh for dashboard update
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

    let csvContent = "data:text/csv;charset=utf-8,Row Number,Errors,Raw Row Data\n";
    invalidRows.forEach(row => {
      const dataStr = row.data.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",");
      csvContent += `${row.rowNum},"${row.reasons.join(" | ")}",${dataStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import_errors_${file.name.replace(/\.[^/.]+$/, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Import Transactions</h1>
        <p className="text-textSecondary mt-1">Upload account statements, bank exports, or user spreadsheets to instantly sync balances</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. File Uploader Container */}
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
              : 'border-borderColor bg-cardBg hover:border-borderColor/80 hover:bg-hoverBg/10'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.pdf" 
            className="hidden" 
          />
          <UploadCloud className={`w-14 h-14 ${dragActive ? 'text-primary' : 'text-textMuted'} mb-4`} />
          <h3 className="text-lg font-bold text-textPrimary">Drag and drop bank statement files</h3>
          <p className="text-xs text-textSecondary mt-2">Supports XLS, XLSX, CSV, and PDF bank, UPI, and credit card statements</p>
          <button 
            type="button" 
            className="mt-6 px-5 py-2.5 bg-background border border-borderColor rounded-xl text-textSecondary text-sm font-bold shadow-sm hover:text-textPrimary hover:bg-hoverBg transition-colors"
          >
            Select Statement File
          </button>
        </div>
      )}

      {/* 2. Upload Progress Bar */}
      {loading && progress > 0 && (
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-textSecondary">
            <span>Executing Sync Operations...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-background border border-borderColor rounded-full h-3 overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {/* 3. Successful Import Summary */}
      {successSummary && (
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto mb-2 animate-scale-up">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-textPrimary">Import Sync Completed!</h3>
            <p className="text-xs text-textSecondary mt-1">Transaction entries have been successfully integrated into your ledger db</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto pt-4">
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Imported</span>
              <p className="text-2xl font-black text-success mt-1">{successSummary.imported}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Skipped</span>
              <p className="text-2xl font-black text-textPrimary mt-1">{successSummary.skipped}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Duplicates</span>
              <p className="text-2xl font-black text-warning mt-1">{successSummary.duplicates}</p>
            </div>
            <div className="p-4 bg-background border border-borderColor rounded-2xl">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Failed Rows</span>
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
              className="px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              Upload New Statement
            </button>
          </div>
        </div>
      )}

      {/* 4. Sheet Preview, Column Validation, Strategy Configuration */}
      {file && !successSummary && !loading && (
        <div className="space-y-6">
          {/* Top summary header */}
          <div className="flex justify-between items-center p-4 bg-cardBg border border-borderColor rounded-2xl flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                {file.name.endsWith('.pdf') ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-textPrimary truncate max-w-xs">{file.name}</h4>
                <p className="text-[10px] text-textSecondary mt-0.5">{(file.size / 1024).toFixed(1)} KB statement loaded</p>
              </div>
            </div>

            <button 
              onClick={resetImporter}
              className="p-1 rounded-full text-textSecondary hover:bg-hoverBg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Import Meta & Detected Accounts/Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-textSecondary mb-3">Detected Accounts / Banks</h4>
              <div className="flex flex-wrap gap-2">
                {previewMetrics.detected_accounts?.length > 0 ? (
                  previewMetrics.detected_accounts.map((acc, index) => (
                    <span key={index} className="px-3.5 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 animate-pulse" />
                      <span>{acc}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-textMuted font-semibold">No accounts detected</span>
                )}
              </div>
            </div>
            
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-textSecondary mb-3">Detected Categories</h4>
              <div className="flex flex-wrap gap-2">
                {previewMetrics.detected_categories?.length > 0 ? (
                  previewMetrics.detected_categories.map((cat, index) => (
                    <span key={index} className="px-3.5 py-1.5 rounded-2xl bg-success/10 border border-success/20 text-xs font-bold text-success flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>{cat}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-textMuted font-semibold">No categories detected</span>
                )}
              </div>
            </div>
          </div>

          {/* Aggregate Metrics panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Total Transactions</span>
              <h3 className="text-xl font-black text-textPrimary mt-1">{previewMetrics.total}</h3>
              <p className="text-[10px] text-textSecondary mt-1">Total transactions logged</p>
            </div>
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Total Credit (Inflow)</span>
              <h3 className="text-xl font-black text-success mt-1">₹{(previewMetrics.total_income || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-success font-bold mt-1">Total income parsed</p>
            </div>
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Total Debit (Outflow)</span>
              <h3 className="text-xl font-black text-danger mt-1">₹{(previewMetrics.total_expenses || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-danger font-bold mt-1">Total expenses parsed</p>
            </div>
            <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">Institution & Type</span>
              <h3 className="text-sm font-black text-textPrimary mt-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-textMuted" />
                <span>{previewMetrics.bank}</span>
              </h3>
              <p className="text-[10px] text-textSecondary mt-1">
                {previewMetrics.is_scanned ? "AI OCR Scanned PDF" : "Digital Selectable PDF"}
              </p>
            </div>
          </div>

          {/* Strategy selection panel */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-textPrimary">Duplicate Checking Strategy</h4>
                <p className="text-[10px] text-textSecondary mt-0.5">Found **{duplicatesCount}** potential duplicates. Select how to resolve them:</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setDupStrategy('skip')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'skip' 
                      ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Skip Duplicates</span>
                  <span className="text-[9px] text-textSecondary font-normal mt-1 block">Ignore duplicates</span>
                </button>
                
                <button
                  onClick={() => setDupStrategy('replace')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'replace' 
                      ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Overwrite Old</span>
                  <span className="text-[9px] text-textSecondary font-normal mt-1 block">Delete & replace</span>
                </button>

                <button
                  onClick={() => setDupStrategy('keep')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    dupStrategy === 'keep' 
                      ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-background border-borderColor text-textSecondary hover:border-borderColor/80'
                  }`}
                >
                  <span className="text-xs block">Keep Both</span>
                  <span className="text-[9px] text-textSecondary font-normal mt-1 block">Import duplicate</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                onClick={handleImport}
                className="w-full h-12 bg-primary hover:bg-primaryHover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                <span>Confirm Bulk Import</span>
              </button>
              {invalidRows.length > 0 && (
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold text-danger">⚠️ {invalidRows.length} rows have formatting errors. </span>
                  <button 
                    onClick={handleDownloadErrorCsv}
                    className="text-[10px] font-black text-danger hover:underline"
                  >
                    Download report
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview grid table */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col justify-between">
            <h4 className="text-sm font-bold text-textPrimary mb-4">Statement Import Preview</h4>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderColor text-textSecondary font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Merchant / Narration</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Conflict Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((t, idx) => (
                    <tr key={idx} className="border-b border-borderColor/60 hover:bg-hoverBg/40 transition-colors">
                      <td className="py-3 px-3 text-textSecondary">
                        {new Date(t.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      </td>
                      <td className="py-3 px-3 font-semibold text-textPrimary max-w-[200px] truncate">{t.merchant}</td>
                      <td className="py-3 px-3 capitalize">
                        <span className="px-2.5 py-0.5 rounded-full bg-background border border-borderColor text-[10px] text-textSecondary">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-textSecondary">{t.payment_method}</td>
                      <td className={`py-3 px-3 text-right font-bold ${t.type === 'income' ? 'text-success' : 'text-textPrimary'}`}>
                        {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {t.is_duplicate ? (
                          <span className="px-2 py-0.5 bg-warning/15 text-warning font-bold text-[10px] rounded-full inline-block">
                            Duplicate Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-success/15 text-success font-bold text-[10px] rounded-full inline-block">
                            Ready to Sync
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
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
