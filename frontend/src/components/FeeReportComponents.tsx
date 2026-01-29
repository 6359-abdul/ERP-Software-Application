import React, { useState, useEffect } from 'react';
import api from '../api';
import { ChevronDownIcon, PrinterIcon, EyeIcon } from './icons';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";



// Types 
export interface Receipt {
    receipt_no: string;
    student_name: string;
    class?: string; 
    amount: number;
    mode?: string;
    date?: string;
    time?: string;
}

interface ReportProps {
    onViewReceipt: (receiptNo: string) => void;
}

// --------------------------------------------------------------------------
// Shared Components (Hoisted)
// --------------------------------------------------------------------------

const StatCard = ({ label, value, color = 'blue' }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-800 border-blue-200',
        green: 'bg-green-50 text-green-800 border-green-200',
        red: 'bg-red-50 text-red-800 border-red-200',
    };
    const c = colors[color] || colors.blue;

    return (
        <div className={`p-4 rounded-lg border ${c} shadow-sm`}>
            <p className="text-xs opacity-80 uppercase tracking-wide font-semibold">{label}</p>
            <p className="text-xl font-bold mt-1">
                {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
            </p>
        </div>
    )
}

const ReceiptsTable: React.FC<{ receipts: Receipt[], onViewReceipt: (id: string) => void }> = ({ receipts, onViewReceipt }) => {
    if (!receipts || receipts.length === 0) {
        return <div className="p-8 text-center text-gray-500 border rounded bg-gray-50 mt-4">No receipts found.</div>;
    }

    return (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm mt-4">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {receipts.map((r) => (
                        <tr key={r.receipt_no} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.receipt_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.student_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.class}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">₹{r.amount.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {r.date || ''} {r.time || ''}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <button
                                    onClick={() => onViewReceipt(r.receipt_no)}
                                    className="text-white bg-violet-600 hover:bg-violet-700 px-3 py-1 rounded flex items-center justify-center mx-auto"
                                >
                                    <EyeIcon className="w-4 h-4 mr-1" /> View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --------------------------------------------------------------------------
// Today's Collection
// --------------------------------------------------------------------------
export const TodayCollection: React.FC<ReportProps> = ({ onViewReceipt }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports/fees/today');
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (loading) return <div className="p-4">Loading today's collection...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-semibold">Total Collection</p>
                    <p className="text-2xl font-bold text-green-700">₹{data.total_collection.toLocaleString('en-IN')}</p>
                </div>
                {Object.entries(data.mode_breakup || {}).map(([mode, amount]: any) => (
                    <div key={mode} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-sm text-gray-500 font-semibold">{mode}</p>
                        <p className="text-xl font-bold text-gray-800">₹{Number(amount).toLocaleString('en-IN')}</p>
                    </div>
                ))}
            </div>

            {/* Receipts Table */}
            <ReceiptsTable receipts={data.receipts} onViewReceipt={onViewReceipt} />
        </div>
    );
};

// --------------------------------------------------------------------------
// Daily Report
// --------------------------------------------------------------------------
export const DailyReport: React.FC<ReportProps> = ({ onViewReceipt }) => {
    // Dates defaults to today
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Filters
    const [selectedClass, setSelectedClass] = useState('All');
    const [selectedSection, setSelectedSection] = useState('All');
    const [selectedFeeType, setSelectedFeeType] = useState('All');
    const [feeTypes, setFeeTypes] = useState<any[]>([]);
    const [classList, setClassList] = useState<string[]>([]);

    // Data
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load Fee Types and Classes on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fee Types
                const resTypes = await api.get('/fee-types');
                const allTypes = Array.isArray(resTypes.data) ? resTypes.data : resTypes.data.fee_types || [];

                // Filter by Branch
                const currentBranch = localStorage.getItem('currentBranch') || 'All';
                let filteredTypes = allTypes;

                if (currentBranch !== 'All' && currentBranch !== 'All Branches') {
                    filteredTypes = allTypes.filter((ft: any) =>
                        !ft.branch || ft.branch === 'All' || ft.branch === currentBranch
                    );
                }
                setFeeTypes(filteredTypes);

                // 2. Classes
                const resClasses = await api.get('/classes');
                const classesData = resClasses.data.classes || [];
                const names = classesData.map((c: any) => c.class_name);
                setClassList(["All", ...names]);

            } catch (err) {
                console.error("Failed to load initial data", err);
            }
        };
        loadData();
    }, []);

    const fetchReport = async () => {
        // Date Range Validation (Max 1 Year)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 365) {
            alert("Date range cannot exceed 1 year.");
            return;
        }
        try {
            setLoading(true);
            setError('');
            // Build Query params
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                class: selectedClass,
                section: selectedSection,
                fee_type: selectedFeeType
            });

            const res = await api.get(`/reports/fees/daily?${params.toString()}`);
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch report');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load on mount
    useEffect(() => {
        fetchReport();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // const classes = ["All", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]; // REMOVED
    const sections = ["All", "A", "B", "C", "D"];
    const downloadExcel = () => {
        if (!data?.receipts?.length) return;

        const excelData = data.receipts.map((r: any) => ({
            Status: "Success",
            Student: r.student_name,
            AdmissionNo: r.admission_no,
            Class: `${r.class} ${r.section}`,
            Branch: r.branch,
            ReceiptNo: r.receipt_no,
            FeeType: r.fee_type_str,
            TotalAmount: r.gross_amount,
            Concession: r.concession,
            Payable: r.net_payable,
            Paid: r.amount_paid,
            Due: r.due_amount,
            Mode: r.mode,
            Note: r.note,
            Date: r.date,
            Time: r.time,
            TakenBy: r.collected_by
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Report");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(blob, `Daily_Fee_Report.xlsx`);
    };
    const downloadPDF = () => {
        if (!data?.receipts?.length) return;

        const doc = new jsPDF("l", "mm", "a4");

        doc.text("Daily Fee Report", 14, 15);

        const tableColumn = [
            "Student",
            "Adm No",
            "Class",
            "Branch",
            "Receipt",
            "Fee Type",
            "Paid",
            "Due",
            "Mode",
            "Date",
            "Taken By"

        ];

        const tableRows = data.receipts.map((r: any) => ([
            r.student_name,
            r.admission_no,
            `${r.class} ${r.section}`,
            r.branch,
            r.receipt_no,
            r.fee_type_str,
            r.amount_paid,
            r.due_amount,
            r.mode,
            `${r.date} ${r.time}`,
            r.collected_by
        ]));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 }
        });

        doc.save("Daily_Fee_Report.pdf");
    };

    return (
        <div className="space-y-4 font-sans">
            {/* Filter Bar */}
            <div className="bg-violet-50 p-4 rounded-lg flex flex-col gap-4 border border-violet-100">
                {/* Filter Inputs Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Top Row: Title + Buttons */}
                    <div className="flex flex-wrap justify-between items-center">
                        <span className="bg-white px-3 py-1 rounded-full border text-sm font-semibold text-violet-700">
                            {data ? data.receipts_count : 0} Reports
                        </span>
                    </div>
                    {/* Fee Type Dropdown */}
                    <select
                        value={selectedFeeType}
                        onChange={(e) => setSelectedFeeType(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white min-w-[150px]"
                    >
                        <option value="All">All Fee Types</option>
                        {feeTypes.map(ft => (
                            <option key={ft.id} value={ft.fee_type}>{ft.fee_type}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />

                    <select className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white min-w-[100px]">
                        <option>All</option>
                        {/* Another filter placeholder */}
                    </select>

                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white w-32"
                    >
                        <option value="All">Select Class</option>
                        {classList.map(c => c !== 'All' && <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Section Button Group */}
                    <div className="flex border border-blue-500 rounded overflow-hidden">
                        <div className="bg-blue-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1">
                            <span className="text-xs">🔍</span> Section
                        </div>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="px-2 py-1.5 text-sm bg-white border-l border-blue-500 outline-none"
                        >
                            <option value="All">Select Section</option>
                            {sections.map(s => s !== 'All' && <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={fetchReport}
                        className="bg-indigo-700 text-white px-6 py-1.5 rounded text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
                    >
                        🔍 Search
                    </button>
                    <button
                        onClick={downloadExcel}
                        className="bg-green-500 text-white px-3 py-1.5 rounded text-sm">📊Excel
                    </button>
                    <button
                        onClick={downloadPDF}
                        className="bg-red-500 text-white px-3 py-1.5 rounded text-sm">📄PDF
                    </button>
                </div>
            </div>

            {loading && <div className="text-center py-4">Loading report...</div>}
            {error && <div className="text-center text-red-500 py-4">{error}</div>}

            {/* Main Table */}
            {data && (
                <>
                    <div className="bg-white border rounded shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                                    <th className="px-3 py-2 text-left font-semibold">Student Name</th>
                                    <th className="px-3 py-2 text-left font-semibold">Adm No.</th>
                                    <th className="px-3 py-2 text-left font-semibold">Class</th>
                                    <th className="px-3 py-2 text-left font-semibold">Branch</th>
                                    <th className="px-3 py-2 text-left font-semibold">Rcpt No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Fee Type</th>
                                    <th className="px-3 py-2 text-right font-semibold">Tot.Amt</th>
                                    <th className="px-3 py-2 text-right font-semibold">Concession</th>
                                    <th className="px-3 py-2 text-right font-semibold">Pay Amt</th>
                                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                                    <th className="px-3 py-2 text-right font-semibold">Due</th>
                                    <th className="px-3 py-2 text-left font-semibold">Mode</th>
                                    <th className="px-3 py-2 text-left font-semibold">Note</th>
                                    <th className="px-3 py-2 text-left font-semibold">Date and Time</th>
                                    <th className="px-3 py-2 text-left font-semibold">Taken By</th>
                                    <th className="px-3 py-2 text-center font-semibold text-xs">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={17} className="bg-red-50 text-red-500 text-center py-3 font-medium">
                                            No Records Found
                                        </td>
                                    </tr>
                                ) : (
                                    data.receipts.map((r: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-green-600 font-medium">Success</td>
                                            <td className="px-3 py-2 font-medium">{r.student_name}</td>
                                            <td className="px-3 py-2 text-blue-600">{r.admission_no}</td>
                                            <td className="px-3 py-2">{r.class} {r.section}</td>
                                            <td className="px-3 py-2 text-gray-600">{r.branch}</td>
                                            <td className="px-3 py-2">{r.receipt_no}</td>
                                            <td className="px-3 py-2 max-w-[200px] truncate" title={r.fee_type_str}>{r.fee_type_str || '-'}</td>
                                            <td className="px-3 py-2 text-right">₹{r.gross_amount.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right">₹{r.concession.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right">₹{r.net_payable.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-800">₹{r.amount_paid.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-red-500">₹{r.due_amount.toLocaleString()}</td>
                                            <td className="px-3 py-2">{r.mode}</td>
                                            <td className="px-3 py-2 text-xs truncate max-w-[150px]" title={r.note}>{r.note || '-'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-500">
                                                {r.date} <br /> {r.time}
                                            </td>
                                            <td className="px-3 py-2">{r.collected_by}</td>
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => onViewReceipt(r.receipt_no)} className="text-blue-600 hover:underline text-xs">View</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Summaries */}
                    <div className="flex flex-col md:flex-row gap-6 mt-4">
                        {/* Payment Mode Table */}
                        <div className="flex-1">
                            <table className="w-full border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Payment Mode</th>
                                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(data.mode_summary || {}).map(([mode, amt]: any) => (
                                        <tr key={mode}>
                                            <td className="px-4 py-2">{mode}</td>
                                            <td className="px-4 py-2 text-right font-medium">₹{Number(amt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50 font-bold">
                                        <td className="px-4 py-2">Total</td>
                                        <td className="px-4 py-2 text-right">₹{data.total_collection.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Taken By Table */}
                        <div className="flex-1">
                            <table className="w-full border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold">Taken By</th>
                                        <th className="px-4 py-2 text-left font-semibold">Branch</th>
                                        <th className="px-4 py-2 text-center font-semibold">Count</th>
                                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Array.isArray(data.collected_by_summary) && data.collected_by_summary.map((row: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2">{row.user}</td>
                                            <td className="px-4 py-2">{row.branch}</td>
                                            <td className="px-4 py-2 text-center">{row.count}</td>
                                            <td className="px-4 py-2 text-right font-medium">₹{Number(row.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-blue-50 font-bold">
                                        <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                                        <td className="px-4 py-2 text-right">₹{data.total_collection.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// --------------------------------------------------------------------------
// Monthly Report
// --------------------------------------------------------------------------
export const MonthlyReport: React.FC<ReportProps> = ({ onViewReceipt }) => {
    const [month, setMonth] = useState<string>(
        String(new Date().getMonth() + 1)
    );
    const [year, setYear] = useState<string>(
        String(new Date().getFullYear())
    );
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ✅ Dynamic years (2020 → next year)
    const academicYear =
        localStorage.getItem("academicYear") || "";

    // Split → ["2025", "2026"]
    const [startYear, endYear] = academicYear.split("-");
    const years: string[] = [startYear, endYear];


    const fetchReport = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get(
                `/reports/fees/monthly?month=${month}&year=${year}`
            );
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-end gap-4 bg-gray-50 p-4 rounded-lg">
                {/* Month */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Month
                    </label>
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 w-32"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>
                                {new Date(0, m - 1).toLocaleString('default', {
                                    month: 'long'
                                })}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Year */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                    </label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 w-24"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={fetchReport}
                    className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700"
                >
                    View Report
                </button>
            </div>

            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}

            {/* Result */}
            {data && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <p className="text-sm text-indigo-600 font-bold">
                                Total Monthly Collection
                            </p>
                            <p className="text-2xl font-bold text-indigo-800">
                                ₹{data.total_collection.toLocaleString('en-IN')}
                            </p>
                        </div>

                        {/* ✅ Class-wise breakup */}
                        <div className="bg-white p-4 rounded-lg border">
                            <p className="text-sm font-semibold mb-2">
                                Class-wise Collection
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(data.class_wise || {}).map(
                                    ([cls, amt]: any) => (
                                        <div
                                            key={cls}
                                            className="flex justify-between"
                                        >
                                            <span className="text-gray-600">
                                                Class {cls}
                                            </span>
                                            <span className="font-mono">
                                                ₹{Number(amt).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <h3 className="font-semibold text-lg mt-4">
                        Transactions ({data.receipts_count})
                    </h3>
                    <ReceiptsTable
                        receipts={data.receipts}
                        onViewReceipt={onViewReceipt}
                    />
                </>
            )}
        </div>
    );
};
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Class Wise Report
// --------------------------------------------------------------------------
export const ClassWiseReport: React.FC<ReportProps> = ({ onViewReceipt }) => {

    // ✅ REQUIRED STATES
    const [classList, setClassList] = useState<string[]>([]);
    const [className, setClassName] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // ✅ Load classes from backend
    useEffect(() => {
        const loadClasses = async () => {
            try {
                const res = await api.get('/classes');
                const classesData = res.data.classes || [];
                const names = classesData.map((c: any) => c.class_name);

                setClassList(names);

                // auto-select first class
                if (names.length > 0) {
                    setClassName(names[0]);
                }
            } catch (err) {
                console.error("Failed to load classes", err);
            }
        };

        loadClasses();
    }, []);

    // ✅ Fetch class-wise report
    const fetchReport = async () => {
        if (!className) return;

        try {
            setLoading(true);
            const res = await api.get(
                `/reports/fees/class-wise?class=${className}`
            );
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-end gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Class
                    </label>
                    <select
                        value={className}
                        onChange={e => setClassName(e.target.value)}
                        className="border p-2 rounded w-40"
                    >
                        {classList.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={fetchReport}
                    className="bg-violet-600 text-white px-4 py-2 rounded"
                >
                    Get Report
                </button>
            </div>

            {loading && <div>Loading...</div>}

            {data && (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-gray-50 rounded border">
                            <p className="text-sm text-gray-500">Total Demand</p>
                            <p className="text-xl font-bold">
                                ₹{data.total_fee.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded border">
                            <p className="text-sm text-green-600">Collected</p>
                            <p className="text-xl font-bold text-green-700">
                                ₹{data.collected.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded border">
                            <p className="text-sm text-red-600">Due</p>
                            <p className="text-xl font-bold text-red-700">
                                ₹{data.due.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>

                    <ReceiptsTable
                        receipts={data.receipts}
                        onViewReceipt={onViewReceipt}
                    />
                </>
            )}
        </div>
    );
};


// --------------------------------------------------------------------------
// Installment Wise Report
// --------------------------------------------------------------------------
export const InstallmentWiseReport: React.FC<ReportProps> = ({ onViewReceipt }) => {
    // Ideally fetch installments list first, but text input for now or standard names
    const [installment, setInstallment] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchReport = async () => {
        if (!installment) return;
        try {
            setLoading(true);
            setError('');
            const res = await api.get(`/reports/fees/installment-wise?installment=${installment}`);
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error fetching report');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end gap-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex-1 max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Installment Name / Fee Type</label>
                    <input
                        type="text"
                        placeholder="e.g. Admission Fee, June Fee"
                        value={installment}
                        onChange={e => setInstallment(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter exact name as in fee structure</p>
                </div>
                <button onClick={fetchReport} className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700">Search</button>
            </div>

            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}

            {data && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total Demand" value={data.total_demand} />
                        <StatCard label="Collected" value={data.collected} color="green" />
                        <StatCard label="Due Amount" value={data.due} color="red" />
                        <StatCard label="Paid Students" value={`${data.paid_students} / ${data.total_students}`} />
                    </div>
                    <h3 className="font-semibold text-lg mt-4">Receipts</h3>
                    <ReceiptsTable receipts={data.receipts} onViewReceipt={onViewReceipt} />
                </>
            )}
        </div>
    )
}

// --------------------------------------------------------------------------
// Due Report
// --------------------------------------------------------------------------
export const DueReport: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports/fees/due');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchReport();
    }, []);

    if (loading) return <div>Loading due list...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-700">Students with Due Fees</h3>
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">{data.length} Students</span>
            </div>

            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Mobile</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((s) => (
                            <tr key={s.student_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {s.class} {s.section}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {s.father_mobile}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                    ₹{s.total_fee.toLocaleString('en-IN')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">
                                    ₹{s.due_amount.toLocaleString('en-IN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && <div className="p-8 text-center text-gray-500">No dues found.</div>}
            </div>
        </div>
    )
}
