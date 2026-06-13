import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { FileSpreadsheet } from 'lucide-react';

interface LedgerRow {
    particulars: string;
    debit: number;
    credit: number;
    cash_in_hand: number;
    is_opening: boolean;
}

interface MonthWiseLedgerProps {
    onMonthClick?: (month: string) => void;
}

const MonthWiseLedger: React.FC<MonthWiseLedgerProps> = ({ onMonthClick }) => {
    const globalYear = localStorage.getItem('academicYear') || '2026-2027';
    const globalBranchName = localStorage.getItem('currentBranch') || 'All';
    const [academicYear, setAcademicYear] = useState(globalYear);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [ledgerData, setLedgerData] = useState<LedgerRow[]>([]);
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

    const fetchLedger = async () => {
        if (!selectedBranch || selectedBranch === 'All') return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/petty-cash-report/month-wise-ledger?branch_id=${selectedBranch}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setLedgerData(data);
            } else {
                setLedgerData([]);
            }
        } catch (e) {
            console.error(e);
            setLedgerData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranch && selectedBranch !== 'All') {
            fetchLedger();
        }
    }, [selectedBranch, academicYear]);

    const activeLedgerData = React.useMemo(() => {
        if (!ledgerData || ledgerData.length === 0) return [];
        
        // Find the index of the last month that has non-zero debit or credit
        let lastActiveIdx = 0; // default to first month after opening balance
        for (let i = 1; i < ledgerData.length; i++) {
            if (ledgerData[i].debit > 0 || ledgerData[i].credit > 0) {
                lastActiveIdx = i;
            }
        }
        
        // If there's no data at all, just show Opening Balance and the first month (April)
        if (lastActiveIdx === 0 && ledgerData.length > 1) {
            return ledgerData.slice(0, 2);
        }
        
        return ledgerData.slice(0, lastActiveIdx + 1);
    }, [ledgerData]);

    return (
        <div className="p-4 bg-gray-50 min-h-screen space-y-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Month wise cash ledger
            </h2>
            <div className="bg-white rounded shadow p-4">
                <div className="flex flex-wrap items-center justify-between mb-6 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-medium">📅 Month wise cash ledger</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-700">Branch:</span>
                            <select 
                                className="border rounded px-2 py-1 text-sm"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
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
                        <button className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded hover:bg-green-100 border border-green-200">
                            <FileSpreadsheet size={16} /> Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border font-semibold text-gray-700">Particulars</th>
                                <th className="p-3 border font-semibold text-gray-700 text-right">Debit (Allocated)</th>
                                <th className="p-3 border font-semibold text-gray-700 text-right">Credit (Spent)</th>
                                <th className="p-3 border font-semibold text-gray-700 text-right">Cash in hand</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeLedgerData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="text-center p-6 text-gray-500">No data available for the selected branch and FY.</td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="text-center p-6 text-gray-500">Loading ledger data...</td>
                                </tr>
                            )}
                            {activeLedgerData.map((row, idx) => (
                            <tr key={idx} className={row.is_opening ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'}>
                                <td className="p-3 border">
                                    {onMonthClick && !row.is_opening ? (
                                        <button 
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                            onClick={() => onMonthClick(row.particulars)}
                                        >
                                            {row.particulars}
                                        </button>
                                    ) : (
                                        row.particulars
                                    )}
                                </td>
                                <td className="p-3 border text-right text-emerald-600">
                                    {row.debit > 0 ? `₹ ${row.debit.toFixed(2)}` : '-'}
                                </td>
                                <td className="p-3 border text-right text-rose-600">
                                    {row.credit > 0 ? `₹ ${row.credit.toFixed(2)}` : '-'}
                                </td>
                                <td className={`p-3 border text-right font-semibold ${row.cash_in_hand < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                    ₹ {row.cash_in_hand.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    );
};

export default MonthWiseLedger;
