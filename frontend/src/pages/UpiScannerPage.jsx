import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  Trash2, 
  Check, 
  AlertCircle, 
  Sparkles, 
  FileImage, 
  ShieldCheck, 
  HelpCircle,
  X,
  Plus,
  RefreshCw,
  FolderMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeAndRefresh } from '../context/ThemeAndRefreshContext';
import Select from '../components/ui/Select';
import DatePicker from '../components/ui/DatePicker';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const UpiScannerPage = () => {
  const { invalidateCache } = useThemeAndRefresh();
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // files queue
  const [currentScan, setCurrentScan] = useState(null); // currently scanning or previewing scan
  const [scanIndex, setScanIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Preview Form Fields
  const [previewData, setPreviewData] = useState({
    receipt_id: null,
    merchant_name: '',
    amount: '',
    category: 'Food',
    date: '',
    time: '12:00 PM',
    upi_id: '',
    transaction_id: '',
    bank_name: '',
    payment_status: 'Success',
    payment_app: 'Generic UPI',
    confidence_score: 95,
    needs_review: false,
    review_fields: [],
    is_duplicate: false,
    duplicate_reason: '',
    type: 'Expense'
  });

  const [categoriesList, setCategoriesList] = useState([]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions/categories/all`);
      setCategoriesList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle Ctrl+V Paste
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        setUploadQueue(prev => [...prev, ...files]);
        setSuccess(`Pasted ${files.length} screenshot(s) from clipboard.`);
      }
    };
    
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Process next screenshot in queue
  useEffect(() => {
    if (uploadQueue.length > 0 && !currentScan && !loading) {
      processFile(uploadQueue[0], 0);
    }
  }, [uploadQueue, currentScan, loading]);

  const processFile = async (file, index) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/receipts/scan-upi`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const data = res.data;
      setPreviewData({
        receipt_id: data.receipt_id,
        merchant_name: data.merchant || 'Unknown Recipient',
        amount: data.amount ? data.amount.toString() : '',
        category: data.category || 'Miscellaneous',
        date: data.date ? formatIsoDate(data.date) : new Date().toISOString().split('T')[0],
        time: data.time || '12:00 PM',
        upi_id: data.upi_id || '',
        transaction_id: data.transaction_id || '',
        bank_name: data.bank_name || 'UPI Linked Bank',
        payment_status: data.status || 'Success',
        payment_app: data.payment_app || 'Generic UPI',
        confidence_score: data.confidence_score || 90.0,
        needs_review: data.needs_review || false,
        review_fields: data.review_fields || [],
        is_duplicate: data.is_duplicate || false,
        duplicate_reason: data.duplicate_reason || '',
        type: data.type || 'Expense'
      });
      setCurrentScan(file);
      setScanIndex(index);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || `Failed to scan ${file.name}. Verify image type.`);
      // Remove failed file from queue
      setUploadQueue(prev => prev.slice(1));
    } finally {
      setLoading(false);
    }
  };

  const formatIsoDate = (dateStr) => {
    // Convert DD-MM-YYYY to YYYY-MM-DD for standard input date
    if (dateStr && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[2].length === 4) { // DD-MM-YYYY
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    return dateStr;
  };

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
      const files = Array.from(e.dataTransfer.files).filter(f => 
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        setUploadQueue(prev => [...prev, ...files]);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setUploadQueue(prev => [...prev, ...files]);
    }
  };

  const handleSaveTransaction = async () => {
    if (!previewData.amount || parseFloat(previewData.amount) <= 0) {
      setError("Please input a valid amount.");
      return;
    }
    if (!previewData.merchant_name) {
      setError("Please input a merchant name.");
      return;
    }

    setLoading(true);
    setError('');

    // Format date string for backend API endpoint (e.g. YYYY-MM-DD)
    const formattedDate = previewData.date;
    
    // Description containing metadata tags
    const desc = `UPI Payment Scan: ${previewData.payment_app} | Ref: ${previewData.transaction_id || 'N/A'}`;

    try {
      const params = new URLSearchParams();
      params.append('amount', previewData.amount);
      params.append('merchant_name', previewData.merchant_name);
      params.append('category_name', previewData.category);
      params.append('date', `${formattedDate}T12:00:00`);
      params.append('payment_method', 'UPI');
      params.append('description', desc);
      params.append('transaction_type', previewData.type || 'Expense');

      await axios.post(`${API_URL}/receipts/confirm/${previewData.receipt_id}?${params.toString()}`);
      setSuccess('Transaction registered successfully!');
      invalidateCache();
      
      // Advance the queue
      setUploadQueue(prev => prev.slice(1));
      setCurrentScan(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTransaction = () => {
    setUploadQueue(prev => prev.slice(1));
    setCurrentScan(null);
    setSuccess('Scan skipped.');
  };

  const handleFieldChange = (field, value) => {
    setPreviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">UPI Screenshot Scanner</h1>
        <p className="text-textSecondary mt-1">Upload screenshots from GPay, PhonePe, Paytm or any UPI payment to log transactions instantly</p>
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

      {/* 1. Drag & Drop Upload Zone */}
      {!currentScan && (
        <div className="space-y-4">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`h-72 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 bg-cardBg transition-all relative ${
              dragActive ? 'border-primary bg-primary/5' : 'border-borderColor hover:border-borderColor/80'
            }`}
          >
            <UploadCloud className="w-12 h-12 text-textMuted mb-3" />
            <p className="text-sm font-bold text-textPrimary">Drag and drop UPI screenshots here</p>
            <p className="text-xs text-textMuted mt-1 mb-4">Supports JPEG, PNG, WEBP up to 5MB</p>
            
            <label className="px-5 py-2.5 bg-primary hover:bg-primaryHover text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors">
              <span>Choose Files</span>
              <input 
                type="file" 
                multiple
                accept="image/jpeg,image/png,image/webp" 
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
            
            <span className="text-[10px] text-textMuted mt-4 flex items-center space-x-1">
              <span>💡 Tip: Or click anywhere and press </span>
              <kbd className="px-1.5 py-0.5 bg-background border border-borderColor rounded text-[9px] font-bold mx-1">Ctrl + V</kbd>
              <span> to paste a clipboard image</span>
            </span>
          </div>

          {/* Upload Queue Indicator */}
          {uploadQueue.length > 0 && (
            <div className="p-4 bg-background border border-borderColor rounded-2xl flex justify-between items-center text-xs">
              <span className="text-textSecondary font-semibold">
                Queue: <span className="text-textPrimary font-bold">{uploadQueue.length} screenshots</span> pending processing
              </span>
              {loading && (
                <div className="flex items-center space-x-2 text-primary font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Interactive Preview Confirmation Panel */}
      {currentScan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Screenshot Preview */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[520px]">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">Uploaded Screenshot</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {previewData.payment_app}
                </span>
              </div>
              <div className="bg-background border border-borderColor rounded-2xl overflow-hidden h-[420px] flex items-center justify-center relative">
                <img 
                  src={URL.createObjectURL(currentScan)} 
                  alt="UPI screenshot" 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
            
            <p className="text-[10px] text-textMuted text-center mt-2">
              Filename: {currentScan.name} ({(currentScan.size / 1024).toFixed(1)} KB)
            </p>
          </div>

          {/* Form Editor Details */}
          <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between h-[520px] overflow-y-auto">
            <div className="space-y-4">
              
              {/* Header metrics */}
              <div className="flex justify-between items-center border-b border-borderColor pb-3">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider">AI OCR Extraction</h4>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-bold text-textSecondary">Confidence:</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    previewData.confidence_score >= 80 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning animate-pulse'
                  }`}>
                    {previewData.confidence_score}%
                  </span>
                </div>
              </div>

              {/* Duplicate Banner */}
              {previewData.is_duplicate && (
                <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[11px] leading-relaxed flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Duplicate Transaction Alert</p>
                    <p className="mt-0.5 text-textSecondary">{previewData.duplicate_reason}</p>
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Recipient/Merchant</label>
                  <input 
                    type="text"
                    value={previewData.merchant_name}
                    onChange={(e) => handleFieldChange('merchant_name', e.target.value)}
                    className={`w-full h-10 px-3 bg-background border rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all ${
                      previewData.review_fields.includes('merchant') ? 'border-warning animate-pulse bg-warning/5' : 'border-borderColor'
                    }`}
                  />
                  {previewData.review_fields.includes('merchant') && (
                    <span className="text-[9px] text-warning font-bold mt-1 block">▲ Field flagged for manual verification</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input 
                    type="number"
                    value={previewData.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    className={`w-full h-10 px-3 bg-background border rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all ${
                      previewData.review_fields.includes('amount') ? 'border-warning animate-pulse bg-warning/5' : 'border-borderColor'
                    }`}
                  />
                  {previewData.review_fields.includes('amount') && (
                    <span className="text-[9px] text-warning font-bold mt-1 block">▲ Amount missing or unclear</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Transaction Type</label>
                    <Select
                      value={previewData.type}
                      onChange={(e) => handleFieldChange('type', e.target.value)}
                      size="sm"
                      options={['Expense', 'Income']}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Category</label>
                    <Select
                      value={previewData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      size="sm"
                      options={categoriesList.map(cat => ({ value: cat.name, label: cat.name }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Payment Date</label>
                    <DatePicker 
                      value={previewData.date}
                      onChange={(val) => handleFieldChange('date', val)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1.5">Payment Time</label>
                    <input 
                      type="text"
                      value={previewData.time}
                      onChange={(e) => handleFieldChange('time', e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-borderColor rounded-xl text-textPrimary text-xs focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] font-semibold text-textSecondary pt-2">
                  <div>🔗 UPI ID: <span className="text-textPrimary block font-bold mt-0.5">{previewData.upi_id || 'Not Detected'}</span></div>
                  <div>🆔 Trans ID/UTR: <span className="text-textPrimary block font-bold mt-0.5">{previewData.transaction_id || 'Not Detected'}</span></div>
                  <div>🏦 Bank Line: <span className="text-textPrimary block font-bold mt-0.5">{previewData.bank_name || 'Not Detected'}</span></div>
                  <div>🔌 Channel Status: <span className="text-textPrimary block font-bold mt-0.5">{previewData.payment_status}</span></div>
                </div>

              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex space-x-3 pt-4 border-t border-borderColor mt-6">
              <button 
                type="button"
                onClick={handleSkipTransaction}
                className="w-1/3 h-10 bg-hoverBg hover:bg-borderColor text-textPrimary font-bold rounded-xl border border-borderColor text-xs transition-colors"
              >
                Skip Scan
              </button>
              
              <button 
                type="button"
                onClick={handleSaveTransaction}
                className="w-2/3 h-10 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl shadow-md text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Save Transaction</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default UpiScannerPage;
