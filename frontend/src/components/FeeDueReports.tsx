import React, { useState, useEffect } from 'react';
import api from '../api';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Reusable Filter Wrapper (same style as FeeReports)
const FilterContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm mx-4 mt-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {children}
        </div>
    </div>
);

const StatCard = ({ label, value ,currency = false}:{ label:string; value:number | string; currency?: boolean}) => {
    return (
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50"></div>
            <p className="text-sm text-slate-500 font-medium mb-1 z-10">{label}</p>
            <p className="text-3xl font-bold text-slate-800 z-10">
                {currency && typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
            </p>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange, totalRecords, perPage }: any) => {
    if (totalPages <= 1) return null;

    const visiblePages = 3;
    const startPage = Math.max(1, Math.min(currentPage, totalPages - visiblePages + 1));
    const endPage = Math.min(totalPages, startPage + visiblePages - 1);
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    const showLastPage = endPage < totalPages;

    return (
        <div className="p-4 border-t bg-gray-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-sm text-gray-500 italic">
                Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center gap-1 flex-wrap">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-600 mr-2"
                >
                    Previous
                </button>

                {pages.map(p => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`min-w-[28px] px-1.5 py-0.5 text-sm font-semibold transition-colors ${currentPage === p
                            ? 'text-indigo-700 underline underline-offset-4'
                            : 'text-gray-500 hover:text-gray-800'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                {showLastPage && (
                    <>
                        <span className="px-1 text-sm text-gray-400">...</span>
                        <button
                            onClick={() => onPageChange(totalPages)}
                            className={`min-w-[28px] px-1.5 py-0.5 text-sm font-semibold transition-colors ${currentPage === totalPages
                                ? 'text-indigo-700 underline underline-offset-4'
                                : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-600 ml-2"
                >
                    Next
                </button>
            </div>
        </div>
    );
};


const FeeDueReports: React.FC = () => {
    const [startDate, setStartDate] = useState<string>(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    
    const [feeTypes, setFeeTypes] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    
    const [selectedFeeType, setSelectedFeeType] = useState('All');
    const [selectedInstallment, setSelectedInstallment] = useState('All');
    
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [resTypes, resInst] = await Promise.all([
                    api.get('/fee-types'),
                    api.get('/installment-schedule'),
                ]);
                const allTypes = Array.isArray(resTypes.data) ? resTypes.data : resTypes.data.fee_types || [];
                setFeeTypes(allTypes);
                setInstallments(resInst.data.installments || []);
            } catch (err) {
                console.error("Failed to load initial data", err);
                setError('Failed to load filter options');
            }
        };
        loadInitialData();
        fetchReport();
    }, []);
    const fetchReport = async () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 366) {
            alert("Date range cannot exceed 1 year.");
            return;
        }

        try {
            setLoading(true);
            setError('');
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                fee_type: selectedFeeType,
                installment: selectedInstallment
            });

            const res = await api.get(`/reports/fees/standard-due?${params.toString()}`);
            setData(res.data);
            setCurrentPage(1);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error fetching report');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // Filter installments based on selected fee type (if applicable, though often installments apply across types)
    const feeTypeName = (ft: any) => ft.feetype || ft.fee_type;

    const availableInstallments = selectedFeeType !== 'All' 
        ? installments.filter(i => !i.fee_type_id || i.fee_type_id === feeTypes.find(ft => feeTypeName(ft) === selectedFeeType)?.id)
        : installments;
        
    // Unique installment titles
    const uniqueInstallmentTitles = Array.from(new Set(availableInstallments.map(i => i.title)));
    const totalFee = data.reduce((sum, s) => sum + (s.total_fee || 0), 0);
    const totalDue = data.reduce((sum, s) => sum + (s.due_amount || 0), 0);
    const totalPaid = data.reduce((sum, s) => sum + (s.paid_amount || 0), 0);

    const downloadExcel = () => {
        if (!data.length) return;
        const excelData = data.map((s: any) => ({
            StudentName: s.name,
            AdmissionNo: s.admission_no || '-',
            Class: `${s.class} ${s.section || ''}`,
            FatherName: s.father_name || '-',
            FatherMobile: s.father_mobile || '-',
            TotalFee: s.total_fee,
            PaidAmount: s.paid_amount,
            DueAmount: s.due_amount,
            FeeType: s.fee_type,
            Installment: s.installment
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Due Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        saveAs(blob, `Standard_Fee_Due_Report.xlsx`);
    };

    const downloadPDF = () => {
        if (!data.length) return;
        const doc = new jsPDF("l", "mm", "a4");
        doc.text("Standard Fee Due Report", 14, 15);

        const tableColumn = [
            "Student", "Adm No", "Class", "Father Name", "Mobile", "Fee Type", "Installment", "Total Fee", "Paid", "Due"
        ];

        const tableRows = data.map((s: any) => ([
            s.name,
            s.admission_no || '-',
            `${s.class} ${s.section || ''}`,
            s.father_name || '-',
            s.father_mobile || '-',
            s.fee_type || '-',
            s.installment || '-',
            s.total_fee,
            s.paid_amount,
            s.due_amount
        ]));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 }
        });

        doc.save("Standard_Fee_Due_Report.pdf");
    };

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-violet-100 text-violet-600 p-2 rounded mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </span>
                Standard Fee Due Reports
            </h2>
            
            <div className="bg-white rounded-lg shadow-sm min-h-[400px] overflow-hidden">
                <FilterContainer>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Due Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Due Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                        <select
                            value={selectedFeeType}
                            onChange={(e) => {
                                setSelectedFeeType(e.target.value);
                                setSelectedInstallment('All'); // Reset installment when fee type changes
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        >
                            <option value="All">All Fee Types</option>
                            {feeTypes.map(ft => (
                                <option key={ft.id} value={ft.feetype || ft.fee_type}>{ft.feetype || ft.fee_type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Installment</label>
                        <select
                            value={selectedInstallment}
                            onChange={(e) => setSelectedInstallment(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        >
                            <option value="All">All Installments</option>
                            {uniqueInstallmentTitles.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </FilterContainer>

                <div className="flex flex-wrap gap-3 mb-6 px-4 items-center">
                    <button
                        onClick={fetchReport}
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Search Report
                    </button>
                    <div className="flex-grow"></div>
                    <button
                        onClick={downloadExcel}
                        className="bg-white border border-slate-200 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export Excel
                    </button>
                    <button
                        onClick={downloadPDF}
                        className="bg-white border border-slate-200 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Export PDF
                    </button>
                </div>

                {loading && <div className="text-center py-4">Loading...</div>}
                {error && <div className="text-red-500 text-center py-4">{error}</div>}

                {/* Summary Cards */}
                {!loading && !error && data.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-4 mb-8">
                        <StatCard label="Total Students with Dues" value={data.length} />
                        <StatCard label="Total Fee Demand" value={totalFee} currency />
                        <StatCard label="Total Paid" value={totalPaid} currency />
                        <StatCard label="Total Due Amount" value={totalDue} currency />
                    </div>
                )}

                {/* Due Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mx-4 mb-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">S.No</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Adm No.</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Class</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fee Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Installment</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Fee</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Paid</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Due Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="bg-green-50 text-green-600 text-center py-8 font-medium">
                                            No dues found for the selected criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((s, idx) => {
                                            const sNo = ((currentPage - 1) * rowsPerPage) + idx + 1;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 h-[45px]">
                                                    <td className="px-4 py-3 text-gray-500">{sNo}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                                                    <td className="px-4 py-3 text-blue-600">{s.admission_no || '-'}</td>
                                                    <td className="px-4 py-3">{s.class} {s.section}</td>
                                                    <td className="px-4 py-3">{s.fee_type}</td>
                                                    <td className="px-4 py-3">{s.installment}</td>
                                                    <td className="px-4 py-3 text-right">₹{s.total_fee?.toLocaleString('en-IN')}</td>
                                                    <td className="px-4 py-3 text-right text-green-600">
                                                        ₹{(s.paid_amount)?.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                                        ₹{s.due_amount?.toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Empty rows for stability */}
                                        {Array.from({ length: rowsPerPage - (data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).length) }).map((_, i) => (
                                            <tr key={`empty-${i}`} className="h-[45px]">
                                                <td colSpan={9}>&nbsp;</td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                            {data.length > 0 && (
                                <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan={6} className="px-4 py-3 text-right">Total:</td>
                                        <td className="px-4 py-3 text-right">₹{totalFee.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 text-right text-green-600">
                                            ₹{totalPaid.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600">
                                            ₹{totalDue.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(data.length / rowsPerPage)}
                        onPageChange={setCurrentPage}
                        totalRecords={data.length}
                        perPage={rowsPerPage}
                    />
                </div>
            </div>
        </div>
    );
};

export default FeeDueReports;