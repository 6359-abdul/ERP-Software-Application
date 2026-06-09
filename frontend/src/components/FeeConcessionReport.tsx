import React, { useState, useEffect } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeeConcessionReport: React.FC = () => {
    const [concessions, setConcessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedStudent, setSelectedStudent] = useState<{ id: number, name: string } | null>(null);
    const [details, setDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/reports/fees/concession-report`);
            setConcessions(res.data.concessions || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load concession report');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (studentId: number, studentName: string) => {
        setSelectedStudent({ id: studentId, name: studentName });
        setLoadingDetails(true);
        try {
            const res = await api.get(`/reports/fees/concession-details/${studentId}`);
            setDetails(res.data.details || []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to load details');
            setSelectedStudent(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const filteredConcessions = concessions.filter(r =>
        (r.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.admission_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        if (filteredConcessions.length === 0) return alert('No data to export');
        const data = filteredConcessions.map((r, idx) => ({
            'S.No': idx + 1,
            'Student Name': r.student_name,
            'Adm No.': r.admission_no,
            'Class': `${r.class} ${r.section}`,
            'Branch': r.branch,
            'Contact': r.phone,
            'Concession Type': r.fee_type_name,
            'Assigned By': r.assigned_by,
            'Total Gross Fee': r.total_gross,
            'Total Concession': r.total_concession,
            'Total Paid': r.total_paid
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Concession_Report");
        XLSX.writeFile(wb, "Fee_Concession_Report.xlsx");
    };

    const exportToPDF = () => {
        if (filteredConcessions.length === 0) return alert('No data to export');
        const doc = new jsPDF("l", "mm", "a4");
        doc.setFontSize(16);
        doc.text("Fee Concession Report", 14, 15);

        const tableColumn = ["S.No", "Student Name", "Adm No.", "Class", "Branch", "Contact", "Type", "Assigned By", "Gross", "Concession", "Paid"];
        const tableRows = filteredConcessions.map((r, idx) => [
            idx + 1,
            r.student_name,
            r.admission_no,
            `${r.class} ${r.section}`,
            r.branch,
            r.phone,
            r.fee_type_name,
            r.assigned_by,
            r.total_gross,
            r.total_concession,
            r.total_paid
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            styles: { fontSize: 10 }
        });
        doc.save("Fee_Concession_Report.pdf");
    };

    const totalConcessions = filteredConcessions.reduce((sum, r) => sum + (r.total_concession || 0), 0);

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-green-100 text-green-600 p-2 rounded mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </span>
                Fee Concession Report
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg border bg-green-50 text-green-800 border-green-200 shadow-sm col-span-1 md:col-span-1">
                    <p className="text-xs opacity-80 uppercase tracking-wide font-semibold">Total Concessions Applied</p>
                    <p className="text-xl font-bold mt-1">
                        ₹{totalConcessions.toLocaleString('en-IN')}
                    </p>
                </div>
                <div className="p-4 rounded-lg border bg-blue-50 text-blue-800 border-blue-200 shadow-sm col-span-1 md:col-span-1">
                    <p className="text-xs opacity-80 uppercase tracking-wide font-semibold">Students with Concessions</p>
                    <p className="text-xl font-bold mt-1">
                        {filteredConcessions.length}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div className="w-full md:w-1/3">
                        <input
                            type="text"
                            placeholder="Search by Student, Adm No..."
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
                    <div className="text-center py-8 text-gray-500">Loading concession report...</div>
                ) : error ? (
                    <div className="text-center py-8 text-red-500">{error}</div>
                ) : filteredConcessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No concession records found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold">S.No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Student Name</th>
                                    <th className="px-3 py-2 text-left font-semibold">Adm No.</th>
                                    <th className="px-3 py-2 text-left font-semibold">Class</th>
                                    <th className="px-3 py-2 text-left font-semibold">Contact</th>
                                    <th className="px-3 py-2 text-left font-semibold">Concession Type</th>
                                    <th className="px-3 py-2 text-left font-semibold">Assigned By</th>
                                    <th className="px-3 py-2 text-right font-semibold">Total Gross Fee</th>
                                    <th className="px-3 py-2 text-right font-semibold text-green-700">Total Concession</th>
                                    <th className="px-3 py-2 text-right font-semibold text-blue-700">Total Paid</th>
                                    <th className="px-3 py-2 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredConcessions.map((r, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium">{r.student_name}</td>
                                        <td className="px-3 py-2 text-blue-600">{r.admission_no}</td>
                                        <td className="px-3 py-2">{r.class} {r.section}</td>
                                        <td className="px-3 py-2 text-gray-600">{r.phone}</td>
                                        <td className="px-3 py-2 text-gray-800">{r.fee_type_name}</td>
                                        <td className="px-3 py-2 text-purple-600 font-medium">{r.assigned_by}</td>
                                        <td className="px-3 py-2 text-right">₹{(r.total_gross || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-green-600">₹{(r.total_concession || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-blue-600">₹{(r.total_paid || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => handleViewDetails(r.student_id, r.student_name)}
                                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-3 py-1 rounded shadow-sm flex items-center justify-center mx-auto transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Concession Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Concession Details</h3>
                                <p className="text-sm text-gray-600 mt-1">Student: <span className="font-semibold text-blue-600">{selectedStudent.name}</span></p>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-auto">
                            {loadingDetails ? (
                                <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                    <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading details...
                                </div>
                            ) : details.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">No active concessions found for this student.</div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 border">
                                    <thead className="bg-indigo-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Installment</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fee Type</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Fee</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Paid</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-purple-700">Concession</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {details.map((d, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-800">{d.installment}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{d.fee_type}</td>
                                                <td className="px-4 py-3 text-sm text-right">₹{d.total_fee.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-right text-blue-600">₹{d.paid.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">₹{d.concession.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${d.status === 'Paid' ? 'bg-green-100 text-green-800' : d.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t font-semibold">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-3 text-right">Total:</td>
                                            <td className="px-4 py-3 text-right">₹{details.reduce((s, d) => s + d.total_fee, 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-blue-600">₹{details.reduce((s, d) => s + d.paid, 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-purple-600">₹{details.reduce((s, d) => s + d.concession, 0).toLocaleString()}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button
                                onClick={() => setSelectedStudent(null)}
                                className="bg-gray-600 text-white px-5 py-2 rounded shadow hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeeConcessionReport;
