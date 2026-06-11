import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LedgerDetailRow {
    date: string;
    voucher_no: string;
    voucher_type: string;
    ledger_type?: string;
    ledger_name: string;
    narration: string;
    debit: number;
    credit: number;
    items?: { item_name: string; amount: number }[];
}

interface DetailedLedgerProps {
    filterMonth?: string;
}

const DetailedLedger: React.FC<DetailedLedgerProps> = ({ filterMonth }) => {
    const globalYear = localStorage.getItem('academicYear') || '2026-2027';
    const globalBranchName = localStorage.getItem('currentBranch') || 'All';
    const [academicYear, setAcademicYear] = useState(globalYear);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [detailsData, setDetailsData] = useState<LedgerDetailRow[]>([]);
    const [selectedTxn, setSelectedTxn] = useState<LedgerDetailRow | null>(null);
    const [loading, setLoading] = useState(false);

    const getHeaders = () => {
        const token = localStorage.getItem('token') || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Academic-Year': academicYear,
        };
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const fetchedBranches = data.branches || [];
                setBranches(fetchedBranches);

                if (globalBranchName !== 'All') {
                    const found = fetchedBranches.find((b: any) => b.branch_name === globalBranchName);
                    if (found) setSelectedBranch(found.id.toString());
                } else if (fetchedBranches.length > 0) {
                    setSelectedBranch(fetchedBranches[0].id.toString());
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDetails = async () => {
        if (!selectedBranch || selectedBranch === 'All') return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/petty-cash-report/ledger-details?branch_id=${selectedBranch}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setDetailsData(data);
            } else {
                setDetailsData([]);
            }
        } catch (e) {
            console.error(e);
            setDetailsData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch && selectedBranch !== 'All') {
            fetchDetails();
        }
    }, [selectedBranch, academicYear]);

    const filteredData = React.useMemo(() => {
        if (!filterMonth) return detailsData;
        return detailsData.filter(row => {
            // row.date is like "2026-06-01"
            const parts = row.date.split('-');
            if (parts.length >= 3) {
                const yr = parts[0];
                const mn = parseInt(parts[1]) - 1;
                const dateObj = new Date(parseInt(yr), mn, 1);
                const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
                return `${monthStr}-${yr}` === filterMonth;
            }
            return true;
        });
    }, [detailsData, filterMonth]);

    const handleExcelExport = () => {
        const totalDebit = filteredData.reduce((sum, r) => sum + r.debit, 0);
        const totalCredit = filteredData.reduce((sum, r) => sum + r.credit, 0);

        const wsData = [
            ["S.No", "Voucher Date", "Voucher No", "Ledger Type", "Ledger Head", "Narration", "Debit (Dr)", "Credit (Cr)"],
            ...filteredData.map((row, idx) => [
                idx + 1,
                row.date,
                row.voucher_no,
                row.ledger_type || '',
                row.ledger_name,
                row.narration,
                row.debit > 0 ? row.debit : '-',
                row.credit > 0 ? row.credit : '-'
            ]),
            ["", "", "", "", "", "Total:", totalDebit, totalCredit]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detailed Ledger");

        const colWidths = [
            { wch: 6 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 20 },
            { wch: 30 },
            { wch: 15 },
            { wch: 15 }
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `Detailed_Ledger_${academicYear}.xlsx`);
    };

    return (
        <div className="p-4 bg-gray-50 min-h-screen space-y-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Cash ledger in details {filterMonth ? `(${filterMonth})` : ''}
            </h2>
            <div className="bg-white rounded shadow p-4">
                <div className="flex flex-wrap items-center justify-between mb-6 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-medium">📜 Cash ledger in details</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-700">Branch:</span>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
                                <option value="All">All Branches</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-700">FY:</span>
                            <select
                                className="border rounded px-2 py-1 text-sm"
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                            >
                                <option value="2025-2026">2025-2026</option>
                                <option value="2026-2027">2026-2027</option>
                                <option value="2027-2028">2027-2028</option>
                            </select>
                        </div>
                        <button
                            onClick={handleExcelExport}
                            className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 border border-green-200"
                        >
                            <FileSpreadsheet size={16} /> Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border font-semibold text-gray-700 w-12 text-center">S.No</th>
                                <th className="p-3 border font-semibold text-gray-700">Voucher Date</th>
                                <th className="p-3 border font-semibold text-gray-700">Voucher No</th>
                                <th className="p-3 border font-semibold text-gray-700">Ledger Type</th>
                                <th className="p-3 border font-semibold text-gray-700">Ledger Head</th>
                                <th className="p-3 border font-semibold text-gray-700">Narration</th>
                                <th className="p-3 border font-semibold text-gray-700 text-right">Debit (Dr)</th>
                                <th className="p-3 border font-semibold text-gray-700 text-right">Credit (Cr)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="text-center p-6 text-gray-500">No transactions found.</td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="text-center p-6 text-gray-500">Loading details...</td>
                                </tr>
                            )}
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 border text-center text-gray-500">{idx + 1}</td>
                                    <td className="p-3 border">
                                        <button
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                                            onClick={() => setSelectedTxn(row)}
                                            title="Click to view details"
                                        >
                                            {row.date}
                                        </button>
                                    </td>
                                    <td className="p-3 border font-medium text-gray-700">{row.voucher_no}</td>
                                    <td className="p-3 border text-gray-600">{row.ledger_type}</td>
                                    <td className="p-3 border">{row.ledger_name}</td>
                                    <td className="p-3 border text-gray-600">{row.narration}</td>
                                    <td className="p-3 border text-right text-emerald-600">
                                        {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                                    </td>
                                    <td className="p-3 border text-right text-rose-600">
                                        {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length > 0 && (
                                <tr className="bg-gray-100 font-semibold text-gray-800">
                                    <td colSpan={5} className="p-3 border text-right">Total:</td>
                                    <td className="p-3 border text-right text-emerald-700">
                                        {filteredData.reduce((sum, row) => sum + row.debit, 0).toFixed(2)}
                                    </td>
                                    <td className="p-3 border text-right text-rose-700">
                                        {filteredData.reduce((sum, row) => sum + row.credit, 0).toFixed(2)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {selectedTxn && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-xl font-semibold text-gray-800">
                                    Voucher Details: {selectedTxn.voucher_no}
                                </h3>
                                <button onClick={() => setSelectedTxn(null)} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
                                    ✖
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div><span className="text-gray-500 font-medium">Date:</span> {selectedTxn.date}</div>
                                <div><span className="text-gray-500 font-medium">Voucher Type:</span> {selectedTxn.voucher_type}</div>
                                <div><span className="text-gray-500 font-medium">Ledger Type:</span> {selectedTxn.ledger_type}</div>
                                <div><span className="text-gray-500 font-medium">Ledger Head:</span> {selectedTxn.ledger_name}</div>
                                <div><span className="text-gray-500 font-medium">Narration:</span> {selectedTxn.narration}</div>
                                <div><span className="text-gray-500 font-medium">Debit:</span> {selectedTxn.debit > 0 ? selectedTxn.debit.toFixed(2) : '-'}</div>
                                <div><span className="text-gray-500 font-medium">Credit:</span> {selectedTxn.credit > 0 ? selectedTxn.credit.toFixed(2) : '-'}</div>
                            </div>

                            {selectedTxn.items && selectedTxn.items.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Items Breakdown</h4>
                                    <div className="border rounded overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="p-2 border-r text-gray-600 font-medium">Item Name</th>
                                                    <th className="p-2 text-right text-gray-600 font-medium">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTxn.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                                                        <td className="p-2 border-r">{item.item_name}</td>
                                                        <td className="p-2 text-right">{item.amount.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50">
                                                <tr>
                                                    <td className="p-2 border-r font-semibold text-right">Total:</td>
                                                    <td className="p-2 font-semibold text-right">
                                                        {selectedTxn.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 text-right">
                                <button onClick={() => setSelectedTxn(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 border">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedLedger;
