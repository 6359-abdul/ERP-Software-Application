import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatReportBranch } from '../utils/branchHelper';

interface InactiveStudentReportProps {
    onBack?: () => void;
}

interface InactiveStudent {
    student_id: number;
    admission_no?: string;
    admNo?: string;
    name?: string;
    first_name?: string;
    StudentMiddleName?: string;
    last_name?: string;
    father?: string;
    Fatherfirstname?: string;
    FatherMiddleName?: string;
    FatherLastName?: string;
    FatherPhone?: string;
    Motherfirstname?: string;
    MothermiddleName?: string;
    Motherlastname?: string;
    gender?: string;
    phone?: string;
    class?: string;
    section?: string;
    Roll_Number?: string | number;
    rollNo?: string | number;
    admission_date?: string;
    status?: string;
    inactivated_date?: string;
    inactivate_reason?: string;
    location?: string;
    branch?: string;
    academic_year?: string;
}

interface AcademicYearOption {
    id: number;
    code: string;
    name: string;
}

interface BranchOption {
    id: number;
    branch_code: string;
    branch_name: string;
    location_name?: string;
}

interface ClassOption {
    id: number;
    class_name: string;
}

// --------------------------------------------------------------------------
// Date Formatter Helper
// --------------------------------------------------------------------------
const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const datePart = dateStr.split('T')[0];
            const [y, m, d] = datePart.split('-');
            return `${d}-${m}-${y}`;
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    } catch {
        return dateStr || '-';
    }
};

const getFullName = (first?: string, middle?: string, last?: string, fallback?: string): string => {
    const parts = [first, middle, last].filter(Boolean).map(s => String(s).trim());
    if (parts.length > 0) return parts.join(' ');
    return fallback || '-';
};

const InactiveStudentReport: React.FC<InactiveStudentReportProps> = ({ onBack }) => {
    // Current user context
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    const isGlobalUser = user?.role === 'Director' ||
        user?.branch === 'All' ||
        user?.branch === 'All Branches' ||
        user?.branch === 'AllBranches' ||
        user?.role === 'Admin';

    // Dropdown master states
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);

    // Selected Filters
    const [selectedYear, setSelectedYear] = useState<string>(() => localStorage.getItem('academicYear') || 'All');
    const [selectedBranch, setSelectedBranch] = useState<string>(() => {
        const stored = localStorage.getItem('currentBranch');
        if (stored && stored !== 'Select Branch') return stored;
        return isGlobalUser ? 'All' : (user?.branch || 'All');
    });
    const [selectedClass, setSelectedClass] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Table & Pagination
    const [students, setStudents] = useState<InactiveStudent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(15);

    const latestRequestId = useRef(0);

    // Initial load: fetch master lists
    useEffect(() => {
        // Fetch academic years
        api.get('/org/academic-years')
            .then(res => {
                if (res.data?.academic_years) {
                    setAcademicYears(res.data.academic_years);
                }
            })
            .catch(() => { });

        // Fetch branches
        api.get('/branches')
            .then(res => {
                if (res.data?.branches) {
                    setBranches(res.data.branches);
                }
            })
            .catch(() => { });

        // Fetch classes
        api.get('/classes')
            .then(res => {
                if (res.data?.classes) {
                    setClasses(res.data.classes);
                }
            })
            .catch(() => { });
    }, []);

    // Fetch Inactive Students
    const fetchInactiveStudents = async () => {
        const requestId = ++latestRequestId.current;
        setLoading(true);
        setError('');
        try {
            const params: Record<string, string> = {
                status: 'Inactive',
            };

            if (selectedYear && selectedYear !== 'All') {
                params.academic_year = selectedYear;
            } else {
                params.academic_year = 'All';
            }

            if (selectedBranch && selectedBranch !== 'All' && selectedBranch !== 'All Branches') {
                params.branch = selectedBranch;
            }

            if (selectedClass && selectedClass !== 'All') {
                params.class = selectedClass;
            }

            const res = await api.get('/students', { params });
            const list: InactiveStudent[] = res.data?.students || [];
            // Ensure client-side fallback filter for Inactive status just in case
            const inactiveOnly = list.filter(s => (s.status || '').toLowerCase() === 'inactive');
            if (requestId === latestRequestId.current) {
                setStudents(inactiveOnly);
            }
        } catch (err: any) {
            if (requestId === latestRequestId.current) {
                console.error('Error fetching inactive students:', err);
                setError(err.response?.data?.error || 'Failed to load inactive students report.');
                setStudents([]);
            }
        } finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchInactiveStudents();
        setCurrentPage(1);
    }, [selectedYear, selectedBranch, selectedClass]);

    // Live search filter across students
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const q = searchTerm.toLowerCase().trim();

        return students.filter(s => {
            const adm = (s.admission_no || s.admNo || '').toLowerCase();
            const sName = (s.name || getFullName(s.first_name, s.StudentMiddleName, s.last_name)).toLowerCase();
            const fName = (s.father || getFullName(s.Fatherfirstname, s.FatherMiddleName, s.FatherLastName)).toLowerCase();
            const mName = getFullName(s.Motherfirstname, s.MothermiddleName, s.Motherlastname).toLowerCase();
            const ph = (s.phone || s.FatherPhone || '').toLowerCase();
            const cls = (s.class || '').toLowerCase();
            const sec = (s.section || '').toLowerCase();
            const rsn = (s.inactivate_reason || '').toLowerCase();
            const br = (s.branch || '').toLowerCase();

            return adm.includes(q) ||
                sName.includes(q) ||
                fName.includes(q) ||
                mName.includes(q) ||
                ph.includes(q) ||
                cls.includes(q) ||
                sec.includes(q) ||
                rsn.includes(q) ||
                br.includes(q);
        });
    }, [students, searchTerm]);

    // Summary statistics
    const stats = useMemo(() => {
        const total = filteredStudents.length;
        const male = filteredStudents.filter(s => (s.gender || '').toLowerCase() === 'male').length;
        const female = filteredStudents.filter(s => (s.gender || '').toLowerCase() === 'female').length;
        const withReason = filteredStudents.filter(s => (s.inactivate_reason || '').trim().length > 0).length;

        return { total, male, female, withReason };
    }, [filteredStudents]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
    const paginatedStudents = useMemo(() => {
        if (itemsPerPage === -1) return filteredStudents;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(start, start + itemsPerPage);
    }, [filteredStudents, currentPage, itemsPerPage]);

    // Prepare full tabular data with requested 16 columns
    const getPreparedData = () => {
        return filteredStudents.map((s, idx) => {
            const sName = s.name || getFullName(s.first_name, s.StudentMiddleName, s.last_name);
            const fName = s.father || getFullName(s.Fatherfirstname, s.FatherMiddleName, s.FatherLastName);
            const mName = getFullName(s.Motherfirstname, s.MothermiddleName, s.Motherlastname);
            const ph = s.phone || s.FatherPhone || '-';
            const roll = s.Roll_Number ?? s.rollNo ?? '-';
            const admDate = formatDate(s.admission_date);
            const inactDate = formatDate(s.inactivated_date);
            const inactReason = s.inactivate_reason || '-';
            const loc = s.location || 'Hyderabad';
            const br = formatReportBranch(s.branch || '-');

            return {
                'S.No': idx + 1,
                'admission_no': s.admission_no || s.admNo || '-',
                'Student Name': sName || '-',
                'Father Name': fName || '-',
                'Mother Name': mName || '-',
                'gender': s.gender || '-',
                'phone': ph,
                'class': s.class || '-',
                'section': s.section || '-',
                'Roll_Number': roll,
                'admission_date': admDate,
                'status': s.status || 'Inactive',
                'inactivated_date': inactDate,
                'inactivate_reason': inactReason,
                'location': loc,
                'branch': br
            };
        });
    };

    // --------------------------------------------------------------------------
    // Export to Excel (.xlsx)
    // --------------------------------------------------------------------------
    const exportToExcel = () => {
        if (filteredStudents.length === 0) {
            alert('No inactive student data available to export.');
            return;
        }

        const data = getPreparedData();
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-size columns
        const colWidths = [
            { wch: 6 },  // S.No
            { wch: 15 }, // admission_no
            { wch: 22 }, // Student Name
            { wch: 20 }, // Father Name
            { wch: 20 }, // Mother Name
            { wch: 10 }, // gender
            { wch: 14 }, // phone
            { wch: 10 }, // class
            { wch: 10 }, // section
            { wch: 12 }, // Roll_Number
            { wch: 15 }, // admission_date
            { wch: 12 }, // status
            { wch: 16 }, // inactivated_date
            { wch: 25 }, // inactivate_reason
            { wch: 15 }, // location
            { wch: 18 }  // branch
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inactive_Students');

        const yearLabel = selectedYear === 'All' ? 'All_Years' : selectedYear.replace(/\s+/g, '_');
        const branchLabel = selectedBranch === 'All' || selectedBranch === 'All Branches' ? 'All_Branches' : selectedBranch.replace(/\s+/g, '_');
        const filename = `Inactive_Student_Report_${yearLabel}_${branchLabel}.xlsx`;

        XLSX.writeFile(wb, filename);
    };

    // --------------------------------------------------------------------------
    // Export to CSV (.csv)
    // --------------------------------------------------------------------------
    const escapteCsvValue = (value: unknown): string => {
        const text = String(value ?? '');
        return /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
    };

    const exportToCSV = () => {
        if (filteredStudents.length === 0) {
            alert('No inactive student data available to export.');
            return;
        }

        const data = getPreparedData();
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvRows: string[] = [];

        // Header row
        csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

        // Data rows
        for (const row of data) {
            const values = headers.map(header => {
                const val = (row as any)[header] ?? '';
                let stringVal = String(val);
                if (/^[\t\r ]*[=+\-@]/.test(stringVal)) {
                    stringVal = "'" + stringVal;
                }
                stringVal = stringVal.replace(/"/g, '""');
                return `"${stringVal}"`;
            });
            csvRows.push(values.join(','));
        }

        // Add UTF-8 BOM so Excel opens it with proper characters
        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const yearLabel = selectedYear === 'All' ? 'All_Years' : selectedYear.replace(/\s+/g, '_');
        const branchLabel = selectedBranch === 'All' || selectedBranch === 'All Branches' ? 'All_Branches' : selectedBranch.replace(/\s+/g, '_');
        const filename = `Inactive_Student_Report_${yearLabel}_${branchLabel}.csv`;

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --------------------------------------------------------------------------
    // Export to PDF (.pdf)
    // --------------------------------------------------------------------------
    const exportToPDF = () => {
        if (filteredStudents.length === 0) {
            alert('No inactive student data available to export.');
            return;
        }

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();

        // Institutional Header
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('MS HIFZ ACADEMY', pageWidth / 2, 14, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text('Inactive Student Report', pageWidth / 2, 20, { align: 'center' });

        // Meta Information Line
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const yearText = `Academic Year: ${selectedYear === 'All' ? 'All Academic Years' : selectedYear}`;
        const branchText = `Branch: ${selectedBranch === 'All' || selectedBranch === 'All Branches' ? 'All Branches' : formatReportBranch(selectedBranch)}`;
        const dateText = `Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        const totalText = `Total Inactive: ${filteredStudents.length}`;

        doc.text(`${yearText}  |  ${branchText}  |  ${totalText}`, 14, 27);
        doc.text(dateText, pageWidth - 14, 27, { align: 'right' });

        // Table Columns (Exact 16 Columns)
        const tableColumns = [
            'S.No',
            'Adm No',
            'Student Name',
            'Father Name',
            'Mother Name',
            'Gender',
            'Phone',
            'Class',
            'Sec',
            'Roll No',
            'Adm Date',
            'Status',
            'Inactivated Date',
            'Reason',
            'Location',
            'Branch'
        ];

        const tableRows = filteredStudents.map((s, idx) => {
            const sName = s.name || getFullName(s.first_name, s.StudentMiddleName, s.last_name);
            const fName = s.father || getFullName(s.Fatherfirstname, s.FatherMiddleName, s.FatherLastName);
            const mName = getFullName(s.Motherfirstname, s.MothermiddleName, s.Motherlastname);
            const ph = s.phone || s.FatherPhone || '-';
            const roll = s.Roll_Number ?? s.rollNo ?? '-';

            return [
                idx + 1,
                s.admission_no || s.admNo || '-',
                sName || '-',
                fName || '-',
                mName || '-',
                s.gender || '-',
                ph,
                s.class || '-',
                s.section || '-',
                roll,
                formatDate(s.admission_date),
                s.status || 'Inactive',
                formatDate(s.inactivated_date),
                s.inactivate_reason || '-',
                s.location || 'Hyderabad',
                formatReportBranch(s.branch || '-')
            ];
        });

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 31,
            theme: 'grid',
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                overflow: 'linebreak',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [15, 23, 42], // slate-900
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },   // S.No
                1: { cellWidth: 16 },                    // Adm No
                2: { cellWidth: 24 },                    // Student Name
                3: { cellWidth: 22 },                    // Father Name
                4: { cellWidth: 22 },                    // Mother Name
                5: { cellWidth: 12, halign: 'center' },  // Gender
                6: { cellWidth: 18 },                    // Phone
                7: { cellWidth: 12, halign: 'center' },  // Class
                8: { cellWidth: 8, halign: 'center' },   // Section
                9: { cellWidth: 12, halign: 'center' },  // Roll No
                10: { cellWidth: 16, halign: 'center' }, // Adm Date
                11: { cellWidth: 14, halign: 'center' }, // Status
                12: { cellWidth: 18, halign: 'center' }, // Inact Date
                13: { cellWidth: 26 },                   // Reason
                14: { cellWidth: 16 },                   // Location
                15: { cellWidth: 24 }                    // Branch
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // slate-50
            },
            margin: { left: 8, right: 8, top: 31, bottom: 12 },
            didDrawPage: (data) => {
                // Page footer
                const pageCount = (doc as any).internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); // slate-400
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 6,
                    { align: 'center' }
                );
            }
        });

        const yearLabel = selectedYear === 'All' ? 'All_Years' : selectedYear.replace(/\s+/g, '_');
        const branchLabel = selectedBranch === 'All' || selectedBranch === 'All Branches' ? 'All_Branches' : selectedBranch.replace(/\s+/g, '_');
        const filename = `Inactive_Student_Report_${yearLabel}_${branchLabel}.pdf`;

        doc.save(filename);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-2.5 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
                            >
                                ← Back
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                            <span className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </span>
                            Inactive Student Report
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Comprehensive list of deactivated students with reason, inactivation dates, and academic details.
                    </p>
                </div>

                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={exportToExcel}
                        disabled={loading || filteredStudents.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        title="Download Excel (.xlsx)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                    </button>

                    <button
                        onClick={exportToCSV}
                        disabled={loading || filteredStudents.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        title="Download CSV (.csv)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        CSV
                    </button>

                    <button
                        onClick={exportToPDF}
                        disabled={loading || filteredStudents.length === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                        title="Download PDF (.pdf)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        PDF
                    </button>

                    <button
                        onClick={fetchInactiveStudents}
                        disabled={loading}
                        className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        title="Refresh Data"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Statistics Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Total Inactive</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{stats.total}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Male Students</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{stats.male}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Female Students</p>
                    <p className="text-2xl font-bold text-pink-600 mt-1">{stats.female}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">With Inactivate Reason</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{stats.withReason}</p>
                </div>
            </div>

            {/* Filter Controls Card */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    {/* Academic Year Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                            Academic Year
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="All">All Academic Years</option>
                            {academicYears.map((ay) => (
                                <option key={ay.id} value={ay.code || ay.name}>
                                    {ay.name || ay.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Branch Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                            Branch
                        </label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            disabled={!isGlobalUser && branches.length <= 1}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 disabled:opacity-60"
                        >
                            {isGlobalUser && <option value="All">All Branches</option>}
                            {branches.map((b) => (
                                <option key={b.id} value={b.branch_name}>
                                    {formatReportBranch(b.branch_name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                            Class
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="All">All Classes</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.class_name}>
                                    {c.class_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Live Search */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                            Quick Search
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Adm No, Name, Phone..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={fetchInactiveStudents} className="underline font-semibold ml-4">
                        Retry
                    </button>
                </div>
            )}

            {/* Data Table Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-xs text-gray-700 border-collapse whitespace-nowrap">
                        <thead className="bg-slate-900 text-white uppercase text-[11px] font-semibold sticky top-0 tracking-wider">
                            <tr>
                                <th className="px-3 py-3 text-center w-12 border-b border-slate-800">S.No</th>
                                <th className="px-3 py-3 border-b border-slate-800">admission_no</th>
                                <th className="px-4 py-3 border-b border-slate-800">Student Name</th>
                                <th className="px-4 py-3 border-b border-slate-800">Father Name</th>
                                <th className="px-4 py-3 border-b border-slate-800">Mother Name</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">gender</th>
                                <th className="px-3 py-3 border-b border-slate-800">phone</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">class</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">section</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">Roll_Number</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">admission_date</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">status</th>
                                <th className="px-3 py-3 text-center border-b border-slate-800">inactivated_date</th>
                                <th className="px-4 py-3 border-b border-slate-800">inactivate_reason</th>
                                <th className="px-3 py-3 border-b border-slate-800">location</th>
                                <th className="px-4 py-3 border-b border-slate-800">branch</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 font-normal">
                            {loading ? (
                                <tr>
                                    <td colSpan={16} className="text-center py-16 text-gray-500">
                                        <div className="inline-flex items-center gap-2">
                                            <svg className="w-5 h-5 animate-spin text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Loading inactive students report...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={16} className="text-center py-16 text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-base font-semibold text-gray-600">No inactive students found</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Try adjusting the Academic Year, Branch, or search filter.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((s, idx) => {
                                    const serialNo = itemsPerPage === -1 ? idx + 1 : ((currentPage - 1) * itemsPerPage) + idx + 1;
                                    const sName = s.name || getFullName(s.first_name, s.StudentMiddleName, s.last_name);
                                    const fName = s.father || getFullName(s.Fatherfirstname, s.FatherMiddleName, s.FatherLastName);
                                    const mName = getFullName(s.Motherfirstname, s.MothermiddleName, s.Motherlastname);
                                    const ph = s.phone || s.FatherPhone || '-';
                                    const roll = s.Roll_Number ?? s.rollNo ?? '-';
                                    const admDate = formatDate(s.admission_date);
                                    const inactDate = formatDate(s.inactivated_date);
                                    const inactReason = s.inactivate_reason || '-';
                                    const loc = s.location || 'Hyderabad';
                                    const br = formatReportBranch(s.branch || '-');

                                    return (
                                        <tr key={s.student_id || idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-3 py-2.5 text-center font-medium text-gray-500 bg-gray-50/50">
                                                {serialNo}
                                            </td>
                                            <td className="px-3 py-2.5 font-semibold text-violet-700">
                                                {s.admission_no || s.admNo || '-'}
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-gray-900">
                                                {sName}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700">
                                                {fName}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700">
                                                {mName}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${(s.gender || '').toLowerCase() === 'female'
                                                    ? 'bg-pink-100 text-pink-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {s.gender || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-700">
                                                {ph}
                                            </td>
                                            <td className="px-3 py-2.5 text-center font-medium text-gray-800">
                                                {s.class || '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-gray-700">
                                                {s.section || '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-gray-700 font-mono">
                                                {roll}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-gray-600">
                                                {admDate}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
                                                    {s.status || 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-red-600 font-medium">
                                                {inactDate}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate" title={inactReason}>
                                                {inactReason}
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-600">
                                                {loc}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-800 font-medium">
                                                {br}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer & Pagination */}
                {!loading && filteredStudents.length > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                                Showing {itemsPerPage === -1 ? 1 : ((currentPage - 1) * itemsPerPage) + 1} to{' '}
                                {itemsPerPage === -1 ? filteredStudents.length : Math.min(currentPage * itemsPerPage, filteredStudents.length)} of{' '}
                                <span className="font-semibold text-gray-700">{filteredStudents.length}</span> records
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span>Rows per page:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none"
                                >
                                    <option value={15}>15</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={-1}>All</option>
                                </select>
                            </div>
                        </div>

                        {itemsPerPage !== -1 && totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                                >
                                    Previous
                                </button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        pageNum = currentPage - 2 + i;
                                        if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`min-w-[28px] px-2 py-1 text-xs font-medium rounded ${currentPage === pageNum
                                                ? 'bg-violet-600 text-white font-bold'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InactiveStudentReport;
