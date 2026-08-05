import React, { useState, useEffect } from 'react';
import { remittanceApi } from '../api';
import { API_URL } from '../config';

interface DenominationRow {
  denomination: number;
  quantity: string;
  amount: number;
}

const DEFAULT_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const RemittanceDeposit: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Read-only system calculated cash position
  const [cashPosition, setCashPosition] = useState<{
    cash_in_hand: number;
    total_cash_collected: number;
    total_remitted: number;
    unremitted_receipts: any[];
    branch_name: string;
  }>({
    cash_in_hand: 0,
    total_cash_collected: 0,
    total_remitted: 0,
    unremitted_receipts: [],
    branch_name: ''
  });

  // Form State
  const [businessDate, setBusinessDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [denominations, setDenominations] = useState<DenominationRow[]>(
    DEFAULT_DENOMINATIONS.map(d => ({ denomination: d, quantity: '', amount: 0 }))
  );

  // Recent Submissions
  const [recentRemittances, setRecentRemittances] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'history'>('deposit');

  const getHeaders = () => {
    const token = localStorage.getItem('token') || '';
    const globalYear = localStorage.getItem('academicYear') || '2024-2025';
    return {
      'Authorization': `Bearer ${token}`,
      'X-Academic-Year': globalYear,
      'X-Branch': selectedBranch || localStorage.getItem('currentBranch') || 'All'
    };
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchCashPosition();
      fetchRecentRemittances();
    }
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const branchList = data.branches || [];
        setBranches(branchList);

        const storedBranch = localStorage.getItem('currentBranch') || '';
        if (storedBranch && storedBranch !== 'All') {
          const found = branchList.find((b: any) => b.branch_name === storedBranch || b.id.toString() === storedBranch);
          if (found) {
            setSelectedBranch(found.id.toString());
            return;
          }
        }
        if (branchList.length > 0) {
          setSelectedBranch(branchList[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Error fetching branches:', e);
    }
  };

  const fetchCashPosition = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await remittanceApi.getCashPosition({ branch_id: selectedBranch });
      if (res.data) {
        setCashPosition({
          cash_in_hand: res.data.cash_in_hand || 0,
          total_cash_collected: res.data.total_cash_collected || 0,
          total_remitted: res.data.total_remitted || 0,
          unremitted_receipts: res.data.unremitted_receipts || [],
          branch_name: res.data.branch_name || ''
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch cash position:', err);
      setMessage({
        text: err.response?.data?.error || 'Failed to fetch read-only cash position from system.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRemittances = async () => {
    try {
      const res = await remittanceApi.listRemittances({ branch_id: selectedBranch });
      if (res.data && Array.isArray(res.data)) {
        setRecentRemittances(res.data);
      }
    } catch (e) {
      console.error('Error fetching recent remittances:', e);
    }
  };

  const handleDenomChange = (index: number, qtyStr: string) => {
    const val = parseInt(qtyStr, 10);
    const validQty = isNaN(val) || val < 0 ? 0 : val;

    const updated = [...denominations];
    updated[index].quantity = qtyStr;
    updated[index].amount = updated[index].denomination * validQty;
    setDenominations(updated);
  };

  const totalDenomValue = denominations.reduce((sum, row) => sum + row.amount, 0);
  const depositVal = parseFloat(depositAmount) || 0;
  const remainingCash = cashPosition.cash_in_hand - depositVal;
  const isDenomMatch = Math.abs(totalDenomValue - depositVal) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (depositVal <= 0) {
      setMessage({ text: 'Please enter a valid deposit amount greater than zero.', type: 'error' });
      return;
    }

    if (depositVal > cashPosition.cash_in_hand) {
      setMessage({
        text: `Fraud Prevention Verification Failed: Deposit Amount (₹${depositVal.toLocaleString()}) cannot exceed available system Cash in Hand (₹${cashPosition.cash_in_hand.toLocaleString()}).`,
        type: 'error'
      });
      return;
    }

    if (!isDenomMatch) {
      setMessage({
        text: `Denomination breakdown total (₹${totalDenomValue.toLocaleString()}) must exactly match Deposit Amount (₹${depositVal.toLocaleString()}).`,
        type: 'error'
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('branch_id', selectedBranch);
      formData.append('business_date', businessDate);
      formData.append('deposit_amount', depositVal.toString());
      formData.append('remarks', remarks);

      const activeDenoms = denominations
        .filter(d => parseInt(d.quantity, 10) > 0)
        .map(d => ({ denomination: d.denomination, quantity: parseInt(d.quantity, 10) }));
      formData.append('denominations', JSON.stringify(activeDenoms));

      const receiptIds = cashPosition.unremitted_receipts.map(r => ({
        fee_receipt_id: r.payment_id,
        receipt_amount: r.amount
      }));
      formData.append('receipt_ids', JSON.stringify(receiptIds));

      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await remittanceApi.createRemittance(formData);
      setMessage({
        text: `Remittance ${res.data.remittance_no} submitted successfully! Pending Head Office review.`,
        type: 'success'
      });

      // Reset form
      setDepositAmount('');
      setRemarks('');
      setAttachment(null);
      setDenominations(DEFAULT_DENOMINATIONS.map(d => ({ denomination: d, quantity: '', amount: 0 })));

      // Reload real-time position and history
      fetchCashPosition();
      fetchRecentRemittances();
      setActiveTab('history');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setMessage({
        text: err.response?.data?.error || 'Failed to submit remittance deposit.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (id: number, remittance_no: string) => {
    try {
      const url = remittanceApi.getAttachmentUrl(id);
      const token = localStorage.getItem('token') || '';
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Could not fetch attachment');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Deposit_Slip_${remittance_no}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to download deposit slip attachment. File may not exist.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-white-900 via-indigo-800 to-slate-900 text-black rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-500/20 rounded-lg border border-blue-800/30 text-blue-800 font-bold">₹</span>
            <h1 className="text-2xl font-black tracking-tight">Cash Remittance Deposit & Day Closing</h1>
          </div>
          <p className="text-blue-800 text-sm mt-1">
            Audit-Proof Financial Workflow &bull; Direct Remittance to Corporate Office
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/15 w-full md:w-auto justify-between">
          <label className="text-xs uppercase tracking-wider text-blue-800 font-semibold">Branch:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-white text-black text-sm border border-slate-700 rounded px-2.5 py-1  focus:ring-amber-400"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => { fetchCashPosition(); fetchRecentRemittances(); }}
            className="text-blue-800 hover:text-black transition-colors text-xs bg-blue-100/60 px-2 py-1 rounded"
            title="Refresh System Calculations"
          >
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg shadow font-medium flex items-center justify-between ${message.type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
          : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold ml-4 text-sm uppercase opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('deposit')}
          className={`py-3 px-1 font-semibold text-sm border-b-2 transition-all ${activeTab === 'deposit'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          ➕ Create New Remittance Deposit
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 px-1 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'history'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          📜 Remittance History & Status
          {recentRemittances.filter(r => r.status === 'Pending').length > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-300">
              {recentRemittances.filter(r => r.status === 'Pending').length} Pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'deposit' ? (
        <div className="space-y-6">
          {/* KPI Summary Cards (Audit Proof) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Cash Collected</span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-800">₹{cashPosition.total_cash_collected.toLocaleString()}</span>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">Fee Receipts</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Cumulative cash fee collections</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Remitted / Pending</span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-blue-600">₹{cashPosition.total_remitted.toLocaleString()}</span>
                <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-full">Dispatched</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Submitted to Corporate Office</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-sm border border-amber-300 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-bl shadow">
                🔒 System Locked
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">Current Cash in Hand</span>
              <div className="mt-3">
                <span className="text-3xl font-black text-amber-900">₹{cashPosition.cash_in_hand.toLocaleString()}</span>
              </div>
              <p className="text-[11px] font-semibold text-amber-700 mt-2">
                ⚠️ Read-only system calculated to prevent fraud & manual tampering.
              </p>
            </div>
          </div>

          {/* Form & Denomination Grid */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Deposit Parameters */}
            <div className="lg:col-span-6 bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                  <span>🏦</span> Deposit Instructions & Details
                </h3>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Business Date</label>
                    <input
                      type="date"
                      value={businessDate}
                      onChange={(e) => setBusinessDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Deposit Amount (₹) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className={`w-full pl-8 pr-4 py-2.5 border rounded-lg shadow-sm font-black text-lg outline-none focus:ring-2 ${depositVal > cashPosition.cash_in_hand ? 'border-rose-500 text-rose-700 focus:ring-rose-500 bg-rose-50/50' : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                          }`}
                        required
                      />
                    </div>
                    {depositVal > cashPosition.cash_in_hand && (
                      <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        ⚠️ Cannot deposit more than current system Cash in Hand (₹{cashPosition.cash_in_hand.toLocaleString()}).
                      </p>
                    )}
                  </div>

                  {/* Remaining Cash Preview Banner */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Projected Remaining Cash:</span>
                    <span className={`text-lg font-black ${remainingCash < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      ₹{isNaN(remainingCash) ? '0' : remainingCash.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deposit Slip / Bank Receipt Attachment</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center bg-slate-50 hover:bg-slate-100 transition">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        id="slip-upload"
                        onChange={(e) => setAttachment(e.target.files ? e.target.files[0] : null)}
                        className="hidden"
                      />
                      <label htmlFor="slip-upload" className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-800 block">
                        {attachment ? (
                          <span className="text-emerald-700 font-bold flex items-center justify-center gap-2">
                            📎 Selected: {attachment.name}
                          </span>
                        ) : (
                          <span>📤 Click to Upload Deposit Slip (JPG / PNG / PDF)</span>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Remarks / Reference Number</label>
                    <textarea
                      rows={2}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter corporate deposit note, messenger name, or bank deposit slip ID..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t mt-6">
                <button
                  type="submit"
                  disabled={submitting || loading || depositVal <= 0 || depositVal > cashPosition.cash_in_hand || !isDenomMatch}
                  className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? 'Authenticating & Submitting...' : '🔒 Confirm & Remit Cash to Corporate Office'}
                </button>
                {!isDenomMatch && depositVal > 0 && (
                  <p className="text-[11px] text-amber-700 text-center font-bold mt-2">
                    * Denominations total (₹{totalDenomValue}) must match deposit amount (₹{depositVal}) to activate submission.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Denomination Breakdown */}
            <div className="lg:col-span-6 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 border-b pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">💵 Currency Denomination Counter</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${isDenomMatch && depositVal > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                  {isDenomMatch && depositVal > 0 ? '✓ Balanced' : '⚖ Requires Balance'}
                </span>
              </h3>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b font-bold text-xs uppercase">
                      <th className="py-2.5 px-3 text-left">Note / Coin</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {denominations.map((row, idx) => (
                      <tr key={row.denomination} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-extrabold text-slate-800">
                          ₹ {row.denomination}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => handleDenomChange(idx, e.target.value)}
                            className="w-24 text-center border border-slate-300 rounded-md py-1 px-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-inner bg-slate-50 text-slate-900"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ₹ {row.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-base">
                      <td colSpan={2} className="py-3 px-3 text-right">Total Denomination Value:</td>
                      <td className={`py-3 px-3 text-right ${isDenomMatch ? 'text-emerald-700' : 'text-rose-600'}`}>
                        ₹ {totalDenomValue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </form>

          {/* Unremitted Cash Receipts Table (Audit View) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              {/*<h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <span>📋</span> Active Cash Fee Receipts Contributing to Balance ({cashPosition.unremitted_receipts.length})
              </h3>
              <span className="text-xs text-slate-500">Only physical cash fee receipts appear in this audit log.</span>*/}
            </div>

            {cashPosition.unremitted_receipts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                No unremitted cash receipts found for this branch. All collected cash has been accounted for!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  {/*<thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase border-y">
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>*/}
                  {/*<tbody className="divide-y divide-slate-100">
                    {cashPosition.unremitted_receipts.map((rec) => (
                      <tr key={rec.payment_id} className="hover:bg-slate-50 font-medium">
                        <td className="p-3 font-extrabold text-blue-600">{rec.receipt_no}</td>
                        <td className="p-3 text-slate-800 font-semibold">{rec.student_name}</td>
                        <td className="p-3 text-slate-600">{rec.class_name || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{rec.payment_date}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">₹{rec.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>*/}
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-lg font-extrabold text-slate-800">Branch Remittance History</h3>
            <button
              onClick={fetchRecentRemittances}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
            >
              🔄 Refresh List
            </button>
          </div>

          {recentRemittances.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              No cash remittances found for this branch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold text-xs uppercase border-y">
                    <th className="p-3">Remittance No</th>
                    <th className="p-3">Business Date</th>
                    <th className="p-3 text-right">Deposit Amount</th>
                    <th className="p-3 text-right">Remaining Cash</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Remarks</th>
                    <th className="p-3 text-center">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentRemittances.map((rem) => (
                    <tr key={rem.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-extrabold text-blue-700">{rem.remittance_no}</td>
                      <td className="p-3 text-slate-700">{rem.business_date}</td>
                      <td className="p-3 text-right font-black text-slate-900">₹{rem.deposit_amount.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600">₹{rem.remaining_cash.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block ${rem.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : rem.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          }`}>
                          {rem.status === 'Approved' ? '✓ Approved' : rem.status === 'Rejected' ? '✕ Rejected' : '⌛ Pending HO Review'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 max-w-xs truncate">{rem.remarks || '—'}</td>
                      <td className="p-3 text-center">
                        {rem.attachment_path ? (
                          <button
                            onClick={() => handleDownloadAttachment(rem.id, rem.remittance_no)}
                            className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2.5 py-1 rounded border border-blue-300 transition inline-flex items-center gap-1"
                            title="View / Download Deposit Slip"
                          >
                            📎 View Slip
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Slip</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )
      }
    </div >
  );
};

export default RemittanceDeposit;
