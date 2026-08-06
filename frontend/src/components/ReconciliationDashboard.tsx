import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../config';
import { FileSpreadsheet, RefreshCw, Calendar, ArrowLeft, Filter, Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MonthLedgerRow {
  particulars: string;
  debit: number;
  credit: number;
  cash_in_hand: number;
  is_opening: boolean;
}

interface DetailLedgerRow {
  date: string;
  date_formatted: string;
  voucher_no: string;
  voucher_type: string;
  ledger_type: string;
  ledger_head: string;
  narration: string;
  debit: number;
  credit: number;
  cash_in_hand: number;
  is_opening: boolean;
}

const ReconciliationDashboard: React.FC = () => {
  const globalYear = localStorage.getItem('academicYear') || '2026-2027';
  const globalBranch = localStorage.getItem('currentBranch') || 'All';

  const academicYear = globalYear;
  const [activeTab, setActiveTab] = useState<'month-ledger' | 'details-ledger'>('month-ledger');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const [monthData, setMonthData] = useState<MonthLedgerRow[]>([]);
  const [detailData, setDetailData] = useState<DetailLedgerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Academic-Year': academicYear,
      'X-Branch': globalBranch,
    };
  };

  const fetchMonthLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/reports/reconciliation/month-wise?academic_year=${academicYear}&branch=${encodeURIComponent(globalBranch)}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setMonthData(data || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch month wise cash ledger');
        setMonthData([]);
      }
    } catch (err) {
      console.error(err);
      setError('Network error occurred while fetching ledger');
      setMonthData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailLedger = async () => {
    setLoading(true);
    setError(null);
    try {
      const monthQuery = selectedMonth && selectedMonth !== 'All' ? `&month=${encodeURIComponent(selectedMonth)}` : '';
      const res = await fetch(`${API_URL}/reports/reconciliation/details?academic_year=${academicYear}&branch=${encodeURIComponent(globalBranch)}${monthQuery}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDetailData(data || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch detailed cash ledger');
        setDetailData([]);
      }
    } catch (err) {
      console.error(err);
      setError('Network error occurred while fetching ledger details');
      setDetailData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'month-ledger') {
      fetchMonthLedger();
    } else {
      fetchDetailLedger();
    }
  }, [activeTab, academicYear, selectedMonth, globalBranch]);

  const handleMonthClick = (monthLabel: string) => {
    setSelectedMonth(monthLabel);
    setActiveTab('details-ledger');
  };

  const activeMonthLedgerData = useMemo(() => {
    if (!monthData || monthData.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (Jan=0, Aug=7, Sep=8)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return monthData.filter(row => {
      if (row.is_opening) return true;
      if (row.debit > 0 || row.credit > 0) return true;

      const [mStr, yStr] = row.particulars.split('-');
      const rowYear = parseInt(yStr, 10);
      const rowMonth = monthNames.indexOf(mStr);

      if (rowYear < currentYear || (rowYear === currentYear && rowMonth <= currentMonth)) {
        return true;
      }
      return false;
    });
  }, [monthData]);

  const monthTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let closingBalance = 0;

    if (activeMonthLedgerData && activeMonthLedgerData.length > 0) {
      activeMonthLedgerData.forEach(row => {
        totalDebit += (row.debit || 0);
        totalCredit += (row.credit || 0);
      });
      closingBalance = activeMonthLedgerData[activeMonthLedgerData.length - 1].cash_in_hand || 0;
    }

    return { totalDebit, totalCredit, closingBalance };
  }, [activeMonthLedgerData]);

  const detailTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let closingBalance = 0;

    if (detailData && detailData.length > 0) {
      detailData.forEach(row => {
        totalDebit += (row.debit || 0);
        totalCredit += (row.credit || 0);
      });
      closingBalance = detailData[detailData.length - 1].cash_in_hand || 0;
    }

    return { totalDebit, totalCredit, closingBalance };
  }, [detailData]);

  const handleExportMonthExcel = () => {
    if (activeMonthLedgerData.length === 0) return;
    const wsData = [
      ["Reconciliation Dashboard - Month Wise Cash Ledger"],
      ["Branch:", globalBranch, "FY:", academicYear],
      [],
      ["Particulars", "Debit (Cash Fee Collected)", "Credit (Remittance Deposited)", "Cash in Hand (Balance)"],
      ...activeMonthLedgerData.map(row => [
        row.particulars,
        row.debit > 0 ? row.debit : '-',
        row.credit > 0 ? row.credit : '-',
        row.cash_in_hand
      ]),
      [],
      ["Total:", monthTotals.totalDebit > 0 ? monthTotals.totalDebit : '-', monthTotals.totalCredit > 0 ? monthTotals.totalCredit : '-', monthTotals.closingBalance]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Month Wise Ledger");
    XLSX.writeFile(wb, `Month_Wise_Reconciliation_${globalBranch}_${academicYear}.xlsx`);
  };

  const handleExportDetailExcel = () => {
    if (detailData.length === 0) return;
    const wsData = [
      ["Reconciliation Dashboard - Cash Ledger in Details"],
      ["Branch:", globalBranch, "FY:", academicYear, "Month:", selectedMonth],
      [],
      ["S.No", "Date", "Voucher No", "Voucher Type", "Ledger Head / Fee Type", "Narration / Details", "Debit (Dr)", "Credit (Cr)", "Cash in Hand"],
      ...detailData.map((row, idx) => [
        idx + 1,
        row.date_formatted || row.date,
        row.voucher_no,
        row.voucher_type,
        row.ledger_head,
        row.narration,
        row.debit > 0 ? row.debit : '-',
        row.credit > 0 ? row.credit : '-',
        row.cash_in_hand
      ]),
      [],
      ["", "", "", "", "", "Total (Current Period):", detailTotals.totalDebit > 0 ? detailTotals.totalDebit : '-', detailTotals.totalCredit > 0 ? detailTotals.totalCredit : '-', detailTotals.closingBalance]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash Ledger Details");
    XLSX.writeFile(wb, `Cash_Ledger_Details_${globalBranch}_${selectedMonth}.xlsx`);
  };

  const formatCurrency = (val: number) => {
    if (!val || val === 0) return '-';
    return `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatBalance = (val: number) => {
    return `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthOptions = useMemo(() => {
    const startYear = parseInt(academicYear.split('-')[0], 10) || 2026;
    const allMonths = [
      `Apr-${startYear}`, `May-${startYear}`, `Jun-${startYear}`, `Jul-${startYear}`,
      `Aug-${startYear}`, `Sep-${startYear}`, `Oct-${startYear}`, `Nov-${startYear}`, `Dec-${startYear}`,
      `Jan-${startYear + 1}`, `Feb-${startYear + 1}`, `Mar-${startYear + 1}`
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const activeMonths = allMonths.filter(m => {
      const [mStr, yStr] = m.split('-');
      const mYear = parseInt(yStr, 10);
      const mIdx = monthNames.indexOf(mStr);
      if (mYear < currentYear || (mYear === currentYear && mIdx <= currentMonth)) return true;
      const found = monthData.find(r => r.particulars === m);
      return found && (found.debit > 0 || found.credit > 0);
    });

    return ['All', ...activeMonths];
  }, [academicYear, monthData]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white-900 via-indigo-800 to-slate-900 text-black rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-7 h-7 text-black" />
            <h1 className="text-2xl font-bold tracking-tight text-black">Reconciliation Dashboard</h1>
          </div>
          <p className="text-indigo-800 text-sm mt-1">
            Real-time reconciliation of Cash Fee Collections and Bank Remittance Deposits
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-gray-200">
          <span className="text-sm font-bold text-black px-3 py-1 rounded">
            {globalBranch || 'All Branches'}
          </span>
          <div className="h-4 w-px bg-slate-600 hidden sm:block"></div>
          <div className="flex items-center gap-1.5 text-xs text-black font-semibold">
            <span>FY:</span>
            <span className="text-sm font-bold text-black px-3 py-1 rounded ">
              {academicYear}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Strictly Month Ledger & Cash Ledger in Details only) */}
      <div className="flex items-center gap-3 mt-2 mb-4">
        <button
          onClick={() => setActiveTab('month-ledger')}
          className={`flex items-center gap-2.5 py-2.5 px-6 text-sm font-semibold rounded-lg transition-all duration-200 border shadow-sm ${activeTab === 'month-ledger'
            ? 'bg-white text-blue-700 border-2 border-blue-600 shadow font-bold'
            : 'bg-slate-100/90 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Month wise cash ledger</span>
        </button>
        <button
          onClick={() => setActiveTab('details-ledger')}
          className={`flex items-center gap-2.5 py-2.5 px-6 text-sm font-semibold rounded-lg transition-all duration-200 border shadow-sm ${activeTab === 'details-ledger'
            ? 'bg-white text-blue-700 border-2 border-blue-600 shadow font-bold'
            : 'bg-slate-100/90 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Cash ledger in details</span>
        </button>
      </div>

      {/* Tab Content Card with clean visual gap after tabs */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden mt-4">
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* TAB 1: Month Wise Cash Ledger */}
          {activeTab === 'month-ledger' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Month wise cash ledger
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click on any month name to inspect daily detailed fee receipts and remittance deposits.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchMonthLedger}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded border border-slate-300 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleExportMonthExcel}
                    disabled={loading || activeMonthLedgerData.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded border border-emerald-300 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                    <tr>
                      <th className="p-3.5 border-b border-slate-200 w-1/4">Particulars (Month)</th>
                      <th className="p-3.5 border-b border-slate-200 text-right w-1/4 text-emerald-800 bg-emerald-50/50">
                        Debit (Fee Collected in Cash)
                      </th>
                      <th className="p-3.5 border-b border-slate-200 text-right w-1/4 text-rose-800 bg-rose-50/50">
                        Credit (Remittance Deposited)
                      </th>
                      <th className="p-3.5 border-b border-slate-200 text-right w-1/4 text-blue-900 bg-blue-50/60 font-bold">
                        Cash in Hand (Running Balance)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {loading && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                            <span>Calculating month-wise cash positions...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && activeMonthLedgerData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-400">
                          No cash ledger records found for this branch and academic year.
                        </td>
                      </tr>
                    )}
                    {!loading && activeMonthLedgerData.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${row.is_opening
                          ? 'bg-amber-50/60 text-slate-800 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <td className="p-3.5 border-r border-slate-100">
                          {row.is_opening ? (
                            <span className="text-slate-800 font-bold flex items-center gap-1.5">
                              <span>🪙</span> {row.particulars}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMonthClick(row.particulars)}
                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 group transition-colors focus:outline-none"
                            >
                              <span className="group-hover:underline">{row.particulars}</span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                            </button>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-emerald-700 border-r border-slate-100">
                          {formatCurrency(row.debit)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-rose-700 border-r border-slate-100">
                          {formatCurrency(row.credit)}
                        </td>
                        <td className={`p-3.5 text-right font-bold ${row.cash_in_hand < 0 ? 'text-rose-600 bg-rose-50/30' : 'text-blue-800 bg-blue-50/20'
                          }`}>
                          {formatBalance(row.cash_in_hand)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {!loading && activeMonthLedgerData.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs shadow-inner">
                      <tr>
                        <td className="p-3.5 text-right uppercase tracking-wider font-extrabold text-slate-800 border-r border-slate-200">
                          Total (Active Months):
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-800 bg-emerald-100/70 border-r border-slate-200">
                          {formatCurrency(monthTotals.totalDebit)}
                        </td>
                        <td className="p-3.5 text-right font-black text-rose-800 bg-rose-100/70 border-r border-slate-200">
                          {formatCurrency(monthTotals.totalCredit)}
                        </td>
                        <td className={`p-3.5 text-right font-black ${monthTotals.closingBalance < 0 ? 'text-rose-700 bg-rose-200/50' : 'text-blue-950 bg-blue-100/80'
                          }`}>
                          {formatBalance(monthTotals.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Cash Ledger in Details */}
          {activeTab === 'details-ledger' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {selectedMonth !== 'All' && (
                      <button
                        onClick={() => setActiveTab('month-ledger')}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                        title="Back to Month Wise Ledger"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <h2 className="text-lg font-bold text-slate-800">
                      Cash ledger in details
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Day-wise line items of Student Cash Fee Collections & Bank Remittance Deposits
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-700">Filter Month:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-white font-bold text-blue-700 rounded px-2 py-0.5 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {monthOptions.map((m, i) => (
                        <option key={i} value={m}>{m === 'All' ? 'All Months (Full Year)' : m}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={fetchDetailLedger}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded border border-slate-300 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={handleExportDetailExcel}
                    disabled={loading || detailData.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 rounded border border-emerald-300 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Export Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="p-3 border-b border-slate-200 text-center w-12">S.No</th>
                      <th className="p-3 border-b border-slate-200">Date</th>
                      <th className="p-3 border-b border-slate-200">Voucher No</th>
                      <th className="p-3 border-b border-slate-200">Voucher Type</th>
                      <th className="p-3 border-b border-slate-200">Fee Type / Head</th>
                      <th className="p-3 border-b border-slate-200">Narration / Student Details</th>
                      <th className="p-3 border-b border-slate-200 text-right text-emerald-800 bg-emerald-50/50">
                        Debit (Dr)
                      </th>
                      <th className="p-3 border-b border-slate-200 text-right text-rose-800 bg-rose-50/50">
                        Credit (Cr)
                      </th>
                      <th className="p-3 border-b border-slate-200 text-right text-blue-900 bg-blue-50/60 font-bold">
                        Cash in Hand
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                    {loading && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                            <span>Loading daily cash ledger transactions...</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && detailData.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400">
                          No transaction details found for the selected filter.
                        </td>
                      </tr>
                    )}
                    {!loading && detailData.map((row, idx) => {
                      const isReceipt = row.voucher_type === 'Fee Receipt';
                      const isRemit = row.voucher_type === 'Remittance Deposit';
                      const isOpening = row.is_opening;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${isOpening
                            ? 'bg-amber-50/70 font-bold text-slate-900'
                            : isRemit
                              ? 'bg-rose-50/10 hover:bg-rose-50/30'
                              : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="p-3 text-center text-slate-400 font-semibold border-r border-slate-100">
                            {isOpening ? '-' : idx}
                          </td>
                          <td className="p-3 whitespace-nowrap font-semibold text-slate-800 border-r border-slate-100">
                            {row.date_formatted || row.date}
                          </td>
                          <td className="p-3 font-mono text-xs font-semibold border-r border-slate-100">
                            {isOpening ? '-' : (
                              <span className={`px-2 py-0.5 rounded ${isReceipt ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                {row.voucher_no}
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap border-r border-slate-100">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isOpening
                              ? 'bg-amber-100 text-amber-900'
                              : isReceipt
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                : 'text-rose-700 bg-rose-50 border border-rose-200/60'
                              }`}>
                              {row.voucher_type}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900 border-r border-slate-100">
                            {row.ledger_head || '-'}
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs truncate border-r border-slate-100" title={row.narration}>
                            {row.narration || '-'}
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-700 border-r border-slate-100">
                            {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                          </td>
                          <td className="p-3 text-right font-semibold text-rose-700 border-r border-slate-100">
                            {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                          </td>
                          <td className={`p-3 text-right font-bold whitespace-nowrap ${row.cash_in_hand < 0 ? 'text-rose-600 bg-rose-50/20' : 'text-blue-800 bg-blue-50/10'
                            }`}>
                            {formatBalance(row.cash_in_hand)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {!loading && detailData.length > 0 && (
                    <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs shadow-inner">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase tracking-wider font-extrabold text-slate-800 border-r border-slate-200">
                          Total (Current Period):
                        </td>
                        <td className="p-3 text-right font-black text-emerald-800 bg-emerald-100/70 border-r border-slate-200">
                          {formatCurrency(detailTotals.totalDebit)}
                        </td>
                        <td className="p-3 text-right font-black text-rose-800 bg-rose-100/70 border-r border-slate-200">
                          {formatCurrency(detailTotals.totalCredit)}
                        </td>
                        <td className={`p-3 text-right font-black whitespace-nowrap ${detailTotals.closingBalance < 0 ? 'text-rose-700 bg-rose-200/50' : 'text-blue-950 bg-blue-100/80'
                          }`}>
                          {formatBalance(detailTotals.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
