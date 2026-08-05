import React, { useState, useEffect } from 'react';
import { remittanceApi } from '../api';
import { API_URL } from '../config';

const RemittanceApprovals: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [remittances, setRemittances] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal inspection state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token') || '';
    const globalYear = localStorage.getItem('academicYear') || '2024-2025';
    return {
      'Authorization': `Bearer ${token}`,
      'X-Academic-Year': globalYear
    };
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchRemittances();
  }, [selectedBranch, statusFilter, startDate, endDate]);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (e) {
      console.error('Error fetching branches:', e);
    }
  };

  const fetchRemittances = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params: any = { status: statusFilter };
      if (selectedBranch && selectedBranch !== 'All') {
        params.branch_id = selectedBranch;
      }
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await remittanceApi.listRemittances(params);
      if (res.data && Array.isArray(res.data)) {
        setRemittances(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load remittances:', err);
      setMessage({
        text: err.response?.data?.error || 'Failed to load branch remittances for review.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'Approved' | 'Rejected', remarks?: string) => {
    try {
      await remittanceApi.updateStatus(id, status, remarks);
      setMessage({
        text: `Remittance successfully marked as ${status}.`,
        type: 'success'
      });
      setSelectedItem(null);
      setShowRejectModal(false);
      setRejectionRemarks('');
      fetchRemittances();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error updating status');
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
      a.download = `Slip_${remittance_no}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Failed to view attachment. The file may have been moved or unassigned.');
    }
  };

  const pendingCount = remittances.filter(r => r.status === 'Pending').length;
  const pendingAmount = remittances.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.deposit_amount, 0);
  const approvedAmount = remittances.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.deposit_amount, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white-900 via-indigo-800 to-slate-900 text-black rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black tracking-tight">Head Office Remittance Approvals</h1>
          </div>
          <p className="text-slate-900 text-sm mt-1">
            Audit Review &amp; Authorization of Branch Daily Cash Deposits &amp; Bank Slips
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/15 flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold text-blue-800">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white text-black text-sm border border-slate-700 rounded px-2.5 py-1  focus:ring-amber-400"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg shadow font-semibold flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-extrabold text-sm ml-4 uppercase opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-amber-700">Awaiting HO Review</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{pendingCount} <span className="text-sm font-medium text-slate-500">Vouchers</span></div>
          </div>
          <div className="p-3 bg-amber-100 text-amber-800 rounded-lg font-black text-xl">⌛</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-500">Total Pending Cash</span>
            <div className="text-2xl font-black text-amber-600 mt-1">₹{pendingAmount.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg font-black text-xl">₹</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-emerald-700">Total Authorized Cash</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">₹{approvedAmount.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg font-black text-xl">✓</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-slate-600 uppercase mr-1">Status:</span>
          {['Pending', 'Approved', 'Rejected', 'All'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all shadow-sm ${statusFilter === s
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
            >
              {s === 'Pending' ? '⌛ Pending Review' : s === 'Approved' ? '✓ Approved' : s === 'Rejected' ? '✕ Rejected' : 'All Vouchers'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold outline-none focus:ring-1 focus:ring-blue-500"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-rose-600 underline hover:text-rose-800 ml-1 font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Approvals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold">
            ⏳ Loading branch cash remittances...
          </div>
        ) : remittances.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-semibold bg-slate-50/40">
            No remittances found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black text-xs uppercase border-b">
                  <th className="py-3 px-4">Remittance ID</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">System Hand Cash</th>
                  <th className="py-3 px-4 text-right">Deposit Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Deposit Slip</th>
                  <th className="py-3 px-4 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {remittances.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-black text-blue-700">{rem.remittance_no}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{rem.branch_name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{rem.business_date}</td>
                    <td className="py-3.5 px-4 text-right text-slate-500">₹{rem.cash_in_hand.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-base">₹{rem.deposit_amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-block ${rem.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : rem.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                        {rem.status === 'Approved' ? '✓ Approved' : rem.status === 'Rejected' ? '✕ Rejected' : '⌛ Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {rem.attachment_path ? (
                        <button
                          onClick={() => handleDownloadAttachment(rem.id, rem.remittance_no)}
                          className="text-xs font-extrabold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md border border-blue-200 transition shadow-sm inline-flex items-center gap-1.5"
                        >
                          <span>📎 View Slip</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">No Attachment</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedItem(rem)}
                        className="text-xs font-black bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg shadow transition"
                      >
                        🔍 Inspect &amp; Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Review & Denomination Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <span className="text-xs uppercase text-amber-400 font-extrabold">Remittance Audit Voucher</span>
                <h2 className="text-2xl font-black mt-0.5">{selectedItem.remittance_no} &bull; {selectedItem.branch_name}</h2>
              </div>
              <button
                onClick={() => { setSelectedItem(null); setShowRejectModal(false); }}
                className="text-slate-400 hover:text-white font-black text-xl p-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Top Financial Breakdown */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] uppercase text-slate-500 font-extrabold block">System Hand Cash</span>
                  <span className="text-lg font-black text-slate-700">₹{selectedItem.cash_in_hand.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-emerald-700 font-extrabold block">Deposit Amount</span>
                  <span className="text-2xl font-black text-emerald-700">₹{selectedItem.deposit_amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase text-slate-500 font-extrabold block">Remaining Balance</span>
                  <span className="text-lg font-black text-slate-700">₹{selectedItem.remaining_cash.toLocaleString()}</span>
                </div>
              </div>

              {/* Denominations & Receipts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Denominations */}
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 border-b pb-2 mb-2 flex items-center gap-1.5">
                    <span>💵</span> Submitted Denomination Breakdown
                  </h4>
                  {selectedItem.denominations && selectedItem.denominations.length > 0 ? (
                    <table className="w-full text-xs text-left border">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-2">Note</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedItem.denominations.map((d: any, i: number) => (
                          <tr key={i} className="font-medium">
                            <td className="p-2 font-bold">₹ {d.denomination}</td>
                            <td className="p-2 text-center font-bold text-slate-800">{d.quantity}</td>
                            <td className="p-2 text-right font-extrabold">₹ {d.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No note breakdown entered.</p>
                  )}
                </div>

                {/* Audit Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 border-b pb-2 mb-2">
                      📝 Cashier Remarks / Reference
                    </h4>
                    <p className="text-xs bg-slate-50 p-3 rounded-lg border text-slate-700 font-medium">
                      {selectedItem.remarks || 'No notes provided by cashier.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1 font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Submitted By:</span>
                      <span className="text-slate-900 font-extrabold">{selectedItem.created_by || 'Cashier'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Submission Date:</span>
                      <span className="text-slate-900 font-extrabold">{selectedItem.created_at || selectedItem.business_date}</span>
                    </div>
                    {selectedItem.approved_by && (
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Reviewed By HO:</span>
                        <span className="text-slate-900 font-extrabold">{selectedItem.approved_by} on {selectedItem.approved_at}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              {selectedItem.status === 'Pending' ? (
                showRejectModal ? (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                    <h5 className="text-sm font-extrabold text-rose-900">Specify Rejection Reason &amp; Audit Note</h5>
                    <textarea
                      value={rejectionRemarks}
                      onChange={(e) => setRejectionRemarks(e.target.value)}
                      placeholder="e.g. Denomination mismatch with deposit slip image, or unreadable receipt attachment..."
                      rows={2}
                      className="w-full text-sm p-2.5 border border-rose-300 rounded-lg outline-none font-medium text-slate-800 bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowRejectModal(false)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedItem.id, 'Rejected', rejectionRemarks)}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow transition"
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t flex justify-end gap-4">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-5 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-sm rounded-xl border border-rose-300 transition shadow-sm"
                    >
                      ✕ Reject Deposit
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedItem.id, 'Approved')}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg transition"
                    >
                      ✓ Authorize &amp; Approve Remittance
                    </button>
                  </div>
                )
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl border text-center text-sm font-bold text-slate-600">
                  This voucher has already been decided and marked as <span className="underline uppercase font-black">{selectedItem.status}</span>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemittanceApprovals;
