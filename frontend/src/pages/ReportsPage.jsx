import React, { useState } from 'react';
import axios from 'axios';
import { 
  Calendar, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Percent, 
  Coins, 
  Target, 
  Wallet, 
  Download, 
  Printer, 
  AlertCircle, 
  FileText,
  Briefcase
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const REPORT_TYPES = [
  { id: 'monthly', name: 'Monthly Report', desc: 'Summary of income, expenses, and savings', icon: Calendar },
  { id: 'annual', name: 'Annual Report', desc: 'Fiscal year comprehensive breakdown', icon: Briefcase },
  { id: 'income', name: 'Income Report', desc: 'Detailed history of all inflow transactions', icon: ArrowUpRight },
  { id: 'expense', name: 'Expense Report', desc: 'Detailed analysis of outflow spending', icon: ArrowDownLeft },
  { id: 'tax', name: 'Tax Summary', desc: 'Estimated income tax liability and deductions', icon: Percent },
  { id: 'investment', name: 'Investment Report', desc: 'Asset values, returns, and allocation', icon: Coins },
  { id: 'savings', name: 'Savings Report', desc: 'Milestones progress and AI target forecasts', icon: Target },
  { id: 'budget_performance', name: 'Budget Performance', desc: 'Variance checks of category budget caps', icon: Wallet }
];

const ReportsPage = () => {
  const [selectedType, setSelectedType] = useState('monthly');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    setReportData(null);

    try {
      const res = await axios.get(`${API_URL}/analytics/reports/generate`, {
        params: {
          report_type: selectedType,
          period: period,
          format: 'json'
        }
      });
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate report sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format) => {
    const url = `${API_URL}/analytics/reports/generate?report_type=${selectedType}&period=${period}&format=${format}`;
    const token = localStorage.getItem('token');
    
    axios.get(url, { 
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((response) => {
        const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = downloadUrl;
        const ext = format === 'excel' ? 'xlsx' : format;
        link.setAttribute('download', `${selectedType}_report_${period}.${ext}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch((err) => {
        console.error(err);
        setError(`Failed to download ${format.toUpperCase()} file.`);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Header section (hidden on print) */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-textPrimary">Reports Generator</h1>
          <p className="text-textSecondary mt-1">Generate comprehensive sheets, tax summaries, and budget variance audits</p>
        </div>
      </div>

      {/* Configuration Grid (hidden on print) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
        {/* Date / Parameter panel */}
        <div className="lg:col-span-1 bg-cardBg border border-borderColor rounded-3xl p-5 space-y-4 shadow-sm h-fit">
          <h3 className="text-xs font-black uppercase text-textSecondary tracking-wider">Report Parameters</h3>
          
          <div>
            <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-2">
              Select Period
            </label>
            <input 
              type={selectedType === 'annual' || selectedType === 'tax' ? 'number' : 'month'} 
              placeholder={selectedType === 'annual' || selectedType === 'tax' ? 'e.g. 2026' : ''}
              value={selectedType === 'annual' || selectedType === 'tax' ? period.slice(0, 4) : period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-borderColor rounded-xl text-textPrimary text-sm focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primaryHover text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <FileText className="w-4.5 h-4.5" />
                <span>Compile Report</span>
              </>
            )}
          </button>
        </div>

        {/* Report Archetype list */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {REPORT_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  if (type.id === 'annual' || type.id === 'tax') {
                    setPeriod(new Date().getFullYear().toString());
                  } else {
                    setPeriod(new Date().toISOString().slice(0, 7));
                  }
                }}
                className={`p-5 rounded-3xl border text-left flex flex-col justify-between h-36 transition-all duration-200 ${
                  isSelected 
                    ? 'bg-primary/5 border-primary shadow-sm text-primary' 
                    : 'bg-cardBg border-borderColor text-textSecondary hover:border-borderColor/80 hover:bg-hoverBg/30'
                }`}
              >
                <type.icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-textMuted'}`} />
                <div>
                  <h4 className="text-sm font-bold text-textPrimary">{type.name}</h4>
                  <p className="text-[10px] text-textSecondary mt-1 leading-relaxed">{type.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center space-x-2 print:hidden">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compiled Document Render Panel */}
      {reportData && (
        <div className="bg-cardBg border border-borderColor rounded-3xl p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0 animate-fade-in">
          {/* Actions toolbar (hidden on print) */}
          <div className="flex justify-end space-x-3 mb-6 pb-6 border-b border-borderColor print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary hover:border-borderColor/80 text-xs font-semibold transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet</span>
            </button>
            <button 
              onClick={() => handleDownload('csv')}
              className="flex items-center space-x-2 px-3 py-2 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary hover:border-borderColor/80 text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={() => handleDownload('excel')}
              className="flex items-center space-x-2 px-3 py-2 bg-background border border-borderColor rounded-xl text-textSecondary hover:text-textPrimary hover:border-borderColor/80 text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button 
              onClick={() => handleDownload('pdf')}
              className="flex items-center space-x-2 px-3 py-2 bg-primary/10 hover:bg-primary/15 text-primary rounded-xl text-xs font-semibold transition-colors animate-fade-in"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>

          {/* Printable Sheet */}
          <div className="space-y-6">
            {/* Sheet Title */}
            <div className="flex justify-between items-start border-b-2 border-primary/20 pb-4">
              <div>
                <h2 className="text-2xl font-black text-textPrimary tracking-tight">{reportData.title}</h2>
                <p className="text-xs text-textSecondary mt-0.5">WealthPilot AI Automated Intelligence Account Summary</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-primary tracking-wider">SYSTEM CERTIFIED</span>
                <p className="text-xs text-textMuted mt-0.5">Compiled at {new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* Summaries KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(reportData.summary).map(([k, v]) => (
                <div key={k} className="bg-background border border-borderColor/60 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider block">{k}</span>
                  <p className="text-lg font-black text-textPrimary mt-1.5">{v}</p>
                </div>
              ))}
            </div>

            {/* Main Ledger Table */}
            <div>
              <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">Line Item Details</h4>
              <div className="overflow-x-auto border border-borderColor rounded-2xl bg-background/30">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-borderColor bg-background/50 text-textSecondary font-bold">
                      {reportData.headers.map((h, i) => (
                        <th 
                          key={h} 
                          className={`py-3 px-4 ${i > 0 && i !== reportData.headers.length - 1 ? 'text-right' : ''}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, index) => (
                      <tr key={index} className="border-b border-borderColor/50 hover:bg-hoverBg/20 transition-all">
                        {row.map((cell, i) => (
                          <td 
                            key={i} 
                            className={`py-3 px-4 text-textPrimary font-medium ${i > 0 && i !== row.length - 1 ? 'text-right' : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer & Footer */}
            <div className="pt-6 border-t border-borderColor/60 text-[9px] text-textMuted leading-relaxed">
              <p>**Disclaimer**: This financial report is automatically compiled based on transaction and ledger records logged under the current account credentials. Estimated income tax calculations are approximations simulated under standard tax slabs and do not replace certified CPA counseling. Verify details independently before submitting tax declarations.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
