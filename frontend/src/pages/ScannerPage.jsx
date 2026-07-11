import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, Sparkles, Check, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const ScannerPage = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for manual correction
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  // Metadata lists
  const [categoriesList, setCategoriesList] = useState([]);
  const [merchantsList, setMerchantsList] = useState([]);

  React.useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [catsRes, mersRes] = await Promise.all([
          axios.get(`${API_URL}/transactions/categories/all`),
          axios.get(`${API_URL}/transactions/merchants/all`)
        ]);
        setCategoriesList(catsRes.data);
        setMerchantsList(mersRes.data);
      } catch (err) {
        console.error("Failed to load scanner metadata", err);
      }
    };
    fetchMetadata();
  }, []);

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
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setError('');
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/receipts/scan`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const data = res.data;
      setResult(data);
      
      // Seed form values
      setMerchant(data.merchant || '');
      setAmount(data.amount || '');
      setCategory(data.category || 'Shopping');
      setDate(data.date || new Date().toISOString().split('T')[0]);
      setDescription(data.description || 'Receipt Scan');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to scan receipt. Please try another image or input manually.');
    } finally {
      setFile(null); // clear file to allow new uploads
      setLoading(false);
    }
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1. Resolve or create merchant
      let finalMerchantId = null;
      if (merchant.trim()) {
        const existingMerchant = merchantsList.find(
          m => m.name.toLowerCase() === merchant.trim().toLowerCase()
        );
        if (existingMerchant) {
          finalMerchantId = existingMerchant.id;
        } else {
          const newMerch = await axios.post(
            `${API_URL}/transactions/merchants/all?name=${encodeURIComponent(merchant.trim())}`
          );
          finalMerchantId = newMerch.data.id;
          setMerchantsList(prev => [...prev, newMerch.data]);
        }
      }

      // 2. Resolve category
      let finalCategoryId = null;
      const existingCategory = categoriesList.find(
        c => c.name.toLowerCase() === category.toLowerCase()
      );
      if (existingCategory) {
        finalCategoryId = existingCategory.id;
      } else {
        const newCat = await axios.post(
          `${API_URL}/transactions/categories/all?name=${encodeURIComponent(category)}&type=expense`
        );
        finalCategoryId = newCat.data.id;
        setCategoriesList(prev => [...prev, newCat.data]);
      }

      // 3. Post transaction
      await axios.post(`${API_URL}/transactions`, {
        amount: parseFloat(amount),
        type: 'expense',
        category_id: finalCategoryId,
        merchant_id: finalMerchantId,
        date: date + 'T12:00:00',
        description
      });
      setSuccess('Transaction logged successfully from receipt scan!');
      setFile(null);
      setResult(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">AI Receipt Scanner</h1>
        <p className="text-textSecondary mt-1">Upload a receipt or invoice to instantly parse details using OCR and AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Container */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-textPrimary mb-4">Upload Receipt</h3>
            
            <form onSubmit={handleScanSubmit} className="space-y-6">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-borderColor hover:border-primary/50'}`}
              >
                <input 
                  type="file" 
                  id="receipt-file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <UploadCloud className="w-12 h-12 text-textMuted mb-4" />
                <label htmlFor="receipt-file" className="cursor-pointer">
                  <span className="px-4 py-2 bg-primary hover:bg-primaryHover text-white text-sm font-bold rounded-xl shadow-md transition-all">
                    Choose Receipt Image
                  </span>
                </label>
                <p className="text-xs text-textSecondary mt-3">Or drag and drop files directly (PNG, JPG, JPEG)</p>
                {file && (
                  <div className="mt-4 flex items-center space-x-2 p-2 bg-hoverBg rounded-xl border border-borderColor/60">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-textPrimary truncate max-w-[200px]">{file.name}</span>
                  </div>
                )}
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

              <button 
                type="submit"
                disabled={loading || !file}
                className="w-full h-12 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-primary/25 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Run AI Scanner</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Container / Manual Verification */}
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-textPrimary mb-4">OCR Verification</h3>
          
          {result ? (
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div className="p-4 bg-success/5 border border-success/15 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <h5 className="text-sm font-bold text-success">Scan Completed</h5>
                  <p className="text-[10px] text-textSecondary mt-0.5">Please verify the parsed details before saving.</p>
                </div>
                {result.confidence && (
                  <span className="text-xs font-bold bg-success/20 text-success px-2 py-1 rounded-full">
                    Confidence: {(result.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Merchant</label>
                <input 
                  type="text" 
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  >
                    {(categoriesList.filter(c => c.type === 'expense').length > 0
                      ? categoriesList.filter(c => c.type === 'expense').map(c => c.name)
                      : ['Food', 'Fuel', 'Shopping', 'Travel', 'Healthcare', 'Entertainment', 'Utilities', 'Other']
                    ).map(catName => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Transaction Date</label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-textSecondary uppercase tracking-wider mb-2">Description</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-success hover:bg-success/90 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md shadow-success/20 hover:shadow-lg transition-all"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Log to Ledger</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-textSecondary border border-dashed border-borderColor rounded-2xl bg-background/50">
              <FileText className="w-8 h-8 text-textMuted mb-2" />
              <p className="text-sm font-semibold">No active scan results</p>
              <p className="text-xs text-textMuted mt-1">Upload a receipt to extract data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;