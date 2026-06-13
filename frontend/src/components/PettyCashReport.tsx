import React, { useEffect, useState, useMemo } from 'react';
import { Download, FileSpreadsheet, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';
import MonthWiseLedger from './MonthWiseLedger';
import DetailedLedger from './DetailedLedger';
import FundAllocation from './FundAllocation';

interface BranchWiseRow {
    branch_id: number;
    branch_name: string;
    months: { [key: string]: number };
    total: number;
}

interface LedgerHeadRow {
    ledger_id: number;
    ledger_head: string;
    months: { [key: string]: number };
    total: number;
}

interface BranchDetail {
    sno: number;
    date: string;
    branch_name: string;
    voucher_no: string;
    paying_account: string;
    voucher_type: string;
    ledger_type: string;
    ledger_head: string;
    ledger_name: string;
    paid_to: string;
    description: string;
    created_by: string;
    approved_by: string;
    amount: number;
}

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const PettyCashReport: React.FC = () => {
    const globalYear = localStorage.getItem('academicYear') || '2026-2027';
    const globalBranchName = localStorage.getItem('currentBranch') || 'All';
    const [academicYear, setAcademicYear] = useState<string>(globalYear);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [branchWise, setBranchWise] = useState<BranchWiseRow[]>([]);
    const [ledgerHead, setLedgerHead] = useState<LedgerHeadRow[]>([]);
    const [branchDetails, setBranchDetails] = useState<BranchDetail[]>([]);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'month-ledger' | 'details-ledger'>('summary');

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
    }, []);

    const getHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('token') || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Academic-Year': academicYear,
        };
    };

    // Calculate dynamic months based on data (from first month with data to last month with data)
    const activeMonths = useMemo(() => {
        let firstIndex = -1;
        let lastIndex = -1;

        const checkMonths = (monthsData: Record<string, number>) => {
            MONTHS.forEach((m, idx) => {
                if (monthsData[m] > 0) {
                    if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
                    if (idx > lastIndex) lastIndex = idx;
                }
            });
        };

        branchWise.forEach(row => checkMonths(row.months || {}));
        ledgerHead.forEach(row => checkMonths(row.months || {}));

        if (firstIndex === -1) return MONTHS; // fallback if no data
        return MONTHS.slice(firstIndex, lastIndex + 1);
    }, [branchWise, ledgerHead]);

    // Fetch branches
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    const fetchedBranches = data.branches || [];
                    setBranches(fetchedBranches);

                    if (globalBranchName !== 'All') {
                        const found = fetchedBranches.find((b: any) => b.branch_name === globalBranchName);
                        if (found) {
                            setSelectedBranch(found.id.toString());
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load branches', e);
            }
        };
        fetchBranches();
    }, []);

    // Fetch branch-wise expenses
    useEffect(() => {
        const fetchBranchWise = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_URL}/petty-cash-report/branch-wise`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setBranchWise(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBranchWise();
    }, [academicYear]);

    // Fetch ledger head expenses
    useEffect(() => {
        const fetchLedgerHead = async () => {
            try {
                const params = new URLSearchParams();
                if (selectedBranch && selectedBranch !== 'All') params.append('branch_id', selectedBranch);
                const res = await fetch(`${API_URL}/petty-cash-report/ledger-head?${params.toString()}`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setLedgerHead(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchLedgerHead();
    }, [academicYear, selectedBranch]);

    const handleBranchClick = async (branchId: number | null) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (branchId) params.append('branch_id', String(branchId));
            const res = await fetch(`${API_URL}/petty-cash-report/branch-details?${params.toString()}`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setBranchDetails(data);
                setShowDetails(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch && selectedBranch !== 'All') params.append('branch_id', selectedBranch);
            const token = localStorage.getItem('token') || '';
            const res = await fetch(`${API_URL}/petty-cash-report/export-excel?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Academic-Year': academicYear,
                }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Petty_Cash_Report_${academicYear}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const formatAmount = (n: number) => n.toFixed(2);

    const currentDateTime = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    // Build academic year options (previous, current, next)
    const academicYears = useMemo(() => {
        const startYear = parseInt(globalYear.split('-')[0], 10) || 2026;
        return [
            `${startYear - 1}-${startYear}`,
            `${startYear}-${startYear + 1}`,
            `${startYear + 1}-${startYear + 2}`
        ];
    }, [globalYear]);

    const [selectedDetailMonth, setSelectedDetailMonth] = useState<string | undefined>();

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            {/* Header */}
            <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Petty-Cash Report
            </h2>

            {/* Tabs */}
            <div className="flex border-b mb-6 bg-white overflow-x-auto shadow-sm rounded-t">
                <button
                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('summary')}
                >
                    Expense Summary
                </button>
                <button
                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'month-ledger' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('month-ledger')}
                >
                    Month Wise Cash Ledger
                </button>
                <button
                    className={`px-4 py-3 font-medium whitespace-nowrap ${activeTab === 'details-ledger' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}
                    onClick={() => {
                        setSelectedDetailMonth(undefined);
                        setActiveTab('details-ledger');
                    }}
                >
                    Cash Ledger In Details
                </button>

            </div>

            {activeTab === 'month-ledger' && (
                <MonthWiseLedger 
                    onMonthClick={(month) => {
                        setSelectedDetailMonth(month);
                        setActiveTab('details-ledger');
                    }}
                />
            )}
            {activeTab === 'details-ledger' && (
                <DetailedLedger filterMonth={selectedDetailMonth} />
            )}

            {activeTab === 'summary' && (
                <>
                    {/* Branch Wise Expenses Section */}

                    <div className="bg-white rounded shadow mb-6">
                        <div className="flex flex-wrap items-center justify-between p-3 border-b">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-medium cursor-pointer">📊 Branch Wise Expenses</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-medium">FY:</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                >
                                    {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <span className="text-sm text-gray-600">
                                    Note: <span className="text-red-600 font-medium">Only voucher type payments will be shown</span>
                                </span>
                            </div>
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                as on {currentDateTime}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left p-2 border">Branch</th>
                                        {activeMonths.map(m => (
                                            <th key={m} className="text-right p-2 border">{m}</th>
                                        ))}
                                        <th className="text-right p-2 border">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchWise.length === 0 && !loading && (
                                        <tr><td colSpan={activeMonths.length + 2} className="text-center p-4 text-gray-500">No data</td></tr>
                                    )}
                                    {branchWise.map((row) => (
                                        <tr key={row.branch_id} className="hover:bg-blue-50">
                                            <td className="p-2 border">
                                                <button
                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                    onClick={() => handleBranchClick(row.branch_id)}
                                                >
                                                    <ChevronRight size={14} /> {row.branch_name}
                                                </button>
                                            </td>
                                            {activeMonths.map(m => (
                                                <td key={m} className="text-right p-2 border text-blue-700">
                                                    {formatAmount(row.months[m] || 0)}
                                                </td>
                                            ))}
                                            <td className="text-right p-2 border font-medium">
                                                {formatAmount(row.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ledger Head Expenses Section */}
                    <div className="bg-white rounded shadow mb-6">
                        <div className="flex flex-wrap items-center justify-between p-3 border-b">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-medium">📒 Ledger Head Expenses</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">FY:</span>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                >
                                    {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    className="border rounded px-2 py-1"
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                >
                                    <option value="All">All Branches</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-sm text-gray-600">
                                    Note: <span className="text-red-600 font-medium">Only voucher type payments will be shown</span>
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1">
                                    as on {currentDateTime}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left p-2 border">Ledger Head</th>
                                        {activeMonths.map(m => (
                                            <th key={m} className="text-right p-2 border">{m}</th>
                                        ))}
                                        <th className="text-right p-2 border">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerHead.length === 0 && !loading && (
                                        <tr><td colSpan={activeMonths.length + 2} className="text-center p-4 text-gray-500">No data</td></tr>
                                    )}
                                    {ledgerHead.map((row) => (
                                        <tr key={row.ledger_id} className="hover:bg-blue-50">
                                            <td className="p-2 border font-medium">
                                                <button
                                                    className="text-blue-700 hover:underline"
                                                    onClick={() => handleBranchClick(null)}
                                                >
                                                    {row.ledger_head}
                                                </button>
                                            </td>
                                            {activeMonths.map(m => (
                                                <td key={m} className="text-right p-2 border text-blue-700">
                                                    {formatAmount(row.months[m] || 0)}
                                                </td>
                                            ))}
                                            <td className="text-right p-2 border font-medium">
                                                {formatAmount(row.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Branch Expense Details Modal/Section */}
                    {showDetails && (
                        <div className="bg-white rounded shadow mb-6">
                            <div className="flex items-center justify-between p-3 border-b">
                                <h3 className="text-lg font-semibold text-blue-700">Branch Expenses Details</h3>
                                <div className="flex gap-2">
                                    <button
                                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                        onClick={handleExportExcel}
                                    >
                                        <FileSpreadsheet size={16} /> Excel
                                    </button>
                                    <button
                                        className="px-3 py-1 border rounded hover:bg-gray-100"
                                        onClick={() => setShowDetails(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2 border">S.No</th>
                                            <th className="p-2 border">Date</th>
                                            <th className="p-2 border">Branch Name</th>
                                            <th className="p-2 border">Voucher No</th>
                                            <th className="p-2 border">Paying Account</th>
                                            <th className="p-2 border">Voucher Type</th>
                                            <th className="p-2 border">Ledger Type</th>
                                            <th className="p-2 border">Ledger Head</th>
                                            <th className="p-2 border">Items</th>
                                            <th className="p-2 border">Paid To</th>
                                            <th className="p-2 border">Description</th>
                                            <th className="p-2 border">Created By</th>
                                            <th className="p-2 border">Approved By</th>
                                            <th className="p-2 border text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchDetails.length === 0 && (
                                            <tr><td colSpan={14} className="text-center p-4 text-gray-500">No data</td></tr>
                                        )}
                                        {branchDetails.map((d) => (
                                            <tr key={d.sno} className="hover:bg-blue-50">
                                                <td className="p-2 border text-center">{d.sno}</td>
                                                <td className="p-2 border">{d.date}</td>
                                                <td className="p-2 border text-blue-700">{d.branch_name}</td>
                                                <td className="p-2 border text-center">{d.voucher_no}</td>
                                                <td className="p-2 border">{d.paying_account}</td>
                                                <td className="p-2 border text-center">{d.voucher_type}</td>
                                                <td className="p-2 border text-center">{d.ledger_type}</td>
                                                <td className="p-2 border text-blue-700">{d.ledger_head}</td>
                                                <td className="p-2 border">{d.ledger_name}</td>
                                                <td className="p-2 border">{d.paid_to}</td>
                                                <td className="p-2 border">{d.description}</td>
                                                <td className="p-2 border">{d.created_by}</td>
                                                <td className="p-2 border">{d.approved_by}</td>
                                                <td className="p-2 border text-right font-medium">{formatAmount(d.amount)}</td>
                                            </tr>
                                        ))}
                                        {branchDetails.length > 0 && (
                                            <tr className="bg-gray-50 font-bold">
                                                <td colSpan={13} className="p-2 border text-right">Total</td>
                                                <td className="p-2 border text-right">
                                                    {formatAmount(branchDetails.reduce((s, d) => s + d.amount, 0))}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </>
            )}

            {loading && <div className="text-center p-4 text-gray-500">Loading...</div>}
        </div>
    );
};

export default PettyCashReport;