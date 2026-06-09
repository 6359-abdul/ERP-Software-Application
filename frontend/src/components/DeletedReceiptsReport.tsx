import React, { useState, useEffect } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DeletedReceiptsReport: React.FC = () => {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/reports/fees/deleted-receipts`);
            setReceipts(res.data.receipts || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load deleted receipts');
        } finally {
            setLoading(false);
        }
    };

    const filteredReceipts = receipts.filter(r =>
        (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.admission_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.receipt_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        if (filteredReceipts.length === 0) return alert('No data to export');
        const data = filteredReceipts.map((r, idx) => ({
            'S.No': idx + 1,
            'Student Name': r.student_name,
            'Adm No.': r.admission_no,
            'Class': `${r.class} ${r.section}`,
            'Branch': r.branch,
            'Rcpt No': r.receipt_no,
            'Fee Type': r.fee_type_str,
            'Amount': r.amount_paid,
            'Mode': r.mode,
            'Deleted By': r.deleted_by,
            'Deleted At': r.deleted_at,
            'Cancel Reason': r.cancel_reason
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Deleted_Receipts");
        XLSX.writeFile(wb, "Deleted_Receipts_Report.xlsx");
    };

    const exportToPDF = () => {
        if (filteredReceipts.length === 0) return alert('No data to export');
        const doc = new jsPDF("l", "mm", "a4");
        doc.setFontSize(16);
        doc.text("Deleted Receipts Report", 14, 15);

        const tableColumn = ["S.No", "Student Name", "Adm No.", "Class", "Branch", "Rcpt No", "Fee Type", "Amount", "Mode", "Deleted By", "Deleted At", "Reason"];
        const tableRows = filteredReceipts.map((r, idx) => [
            idx + 1,
            r.student_name,
            r.admission_no,
            `${r.class} ${r.section}`,
            r.branch,
            r.receipt_no,
            r.fee_type_str,
            r.amount_paid,
            r.mode,
            r.deleted_by,
            r.deleted_at,
            r.cancel_reason
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            styles: { fontSize: 7 }
        });
        doc.save("Deleted_Receipts_Report.pdf");
    };

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-red-100 text-red-600 p-2 rounded mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </span>
                Deleted Receipts Report
            </h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="w-full md:w-1/3">
                        <input
                            type="text"
                            placeholder="Search by Student, Adm No, Receipt No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                        <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Excel
                        </button>
                        <button onClick={exportToPDF} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            PDF
                        </button>
                        <button onClick={fetchReport} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading deleted receipts...</div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                ) : filteredReceipts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No deleted receipts found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">S.No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Student Name</th>
                                    <th className="px-3 py-2 text-left font-semibold">Adm No.</th>
                                    <th className="px-3 py-2 text-left font-semibold">Class</th>
                                    <th className="px-3 py-2 text-left font-semibold">Branch</th>
                                    <th className="px-3 py-2 text-left font-semibold">Rcpt No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Fee Type</th>
                                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                    <th className="px-3 py-2 text-left font-semibold">Mode</th>
                                    <th className="px-3 py-2 text-left font-semibold">Deleted By</th>
                                    <th className="px-3 py-2 text-left font-semibold">Deleted At</th>
                                    <th className="px-3 py-2 text-left font-semibold">Cancel Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReceipts.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium">{r.student_name}</td>
                                        <td className="px-3 py-2 text-blue-600">{r.admission_no}</td>
                                        <td className="px-3 py-2">{r.class} {r.section}</td>
                                        <td className="px-3 py-2 text-gray-600">{r.branch}</td>
                                        <td className="px-3 py-2">{r.receipt_no}</td>
                                        <td className="px-3 py-2 truncate max-w-[150px]" title={r.fee_type_str}>{r.fee_type_str || '-'}</td>
                                        <td className="px-3 py-2 text-right font-medium text-gray-800">₹{(r.amount_paid || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2">{r.mode}</td>
                                        <td className="px-3 py-2 font-semibold text-red-600">{r.deleted_by}</td>
                                        <td className="px-3 py-2 text-xs text-gray-500">{r.deleted_at}</td>
                                        <td className="px-3 py-2 text-xs truncate max-w-[200px] text-gray-600" title={r.cancel_reason}>{r.cancel_reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeletedReceiptsReport;
