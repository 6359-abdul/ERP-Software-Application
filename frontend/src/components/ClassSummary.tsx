import * as XLSX from 'xlsx';
import React, { useState, useEffect } from 'react';
import api from '../api';
  import { SearchIcon } from './icons'; 
import CreateStudent from './CreateStudent';

// ---------------------------------------------------------------------------
// Types
// -------------------------------------------      --------------------------------
interface SectionStats {
    name: string;
    count: number;
}

interface ClassStats {
    name: string;
    count: number;
    sections: SectionStats[];
}

interface SummaryStats {
    total: number;
    by_status: { [key: string]: number };
}

interface SummaryResponse {
    stats: SummaryStats;
    structure: ClassStats[];
}

interface StudentMinimal {
    name: string;
    admNo: string;
    rollNo: number;
    class: string;
    section: string;
    father: string; // FatherName
    fatherMobile: string;
    status: string;
    id: number;
    student_id: number;
    gender?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ClassSummary: React.FC<{ onBack: () => void }> = ({ onBack }) => {

    // State
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('All'); // All, Active, Inactive, TC
    const [selectedClass, setSelectedClass] = useState<string | null>(null); // Class Name
    const [selectedSection, setSelectedSection] = useState<string | null>(null); // Section Name

    // Students List
    const [students, setStudents] = useState<StudentMinimal[]>([]);
    const [studentLoading, setStudentLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Additional UI State
    const [viewMode, setViewMode] = useState<'summary' | 'create'>('summary');

    // Calculate Gender Stats
    const totalMales = students.filter(s => s.gender === 'Male').length;
    const totalFemales = students.filter(s => s.gender === 'Female').length;

    const exportToExcel = () => {
        const dataToExport = students.map((s, index) => ({
            "S.No": index + 1,
            "Roll No": s.rollNo,
            "Admission No": s.admNo,
            "Name": s.name,
            "Gender": s.gender,
            "Class": s.class,
            "Section": s.section,
            "Father Name": s.father,
            "Phone Number": s.fatherMobile,
            "Status": s.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Class Summary");
        XLSX.writeFile(wb, `ClassSummary_${selectedClass || 'All'}_${selectedSection || 'All'}.xlsx`);
    };

    const handlePrint = () => {
        window.print();
    };

    // Initial Load
    useEffect(() => {
        fetchSummary();
    }, []);

    // Fetch Students when filters change
    useEffect(() => {
        if (selectedClass) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection, statusFilter, search]);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const globalBranch = localStorage.getItem('currentBranch');
            const res = await api.get('/students/summary', {
                headers: { 'X-Branch': globalBranch || 'All' }
            });
            setSummary(res.data);

            // Auto-select first class if available
            if (res.data.structure && res.data.structure.length > 0) {
                // setSelectedClass(res.data.structure[0].name); 
                // Dont auto select, let user choose? 
                // The UI screenshot shows "All" selected in left dropdown, and a class "6 HK 2" selected.
            }
        } catch (e) {
            console.error("Failed to fetch summary", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setStudentLoading(true);
            const globalBranch = localStorage.getItem('currentBranch');
            const res = await api.get('/students', {
                params: {
                    class: selectedClass,
                    section: selectedSection,
                    search: search,
                    include_inactive: 'true', // We filter on frontend or backend? Using backend filter.
                    // But wait, our backend /students endpoint filters by status=Active unless include_inactive=true.
                    // If we want specific status (like "Inactive"), we need to handle that.
                    // The backend currently supports include_inactive=true (shows all) or false (Active only).
                    // It does NOT support status="Inactive".
                    // I might need to filter client side or update backend. 
                    // For now, I'll fetch 'include_inactive=true' and filter client side if status is not 'All' or 'Active'.
                },
                headers: { 'X-Branch': globalBranch || 'All' }
            });

            let data = res.data.students || [];

            // Client-side filtering for strict status (since backend is loose)
            if (statusFilter !== 'All') {
                data = data.filter((s: any) => s.status === statusFilter);
            }

            setStudents(data);

        } catch (e) {
            console.error("Failed to fetch students", e);
        } finally {
            setStudentLoading(false);
        }
    };

    // Helper to get selected class object
    const selectedClassObject = summary?.structure.find(c => c.name === selectedClass);

    // Helper to get total count for displayed section or class
    // If section selected -> section count
    // Else if class selected -> class count
    // Else -> total count
    const recordCount = students.length;

    const renderLeftSidebar = () => {
        if (!summary) return <div>Loading inputs...</div>;

        const filters = ['All', 'Active', 'Inactive', 'TC'];

        return (
            <div className="bg-white rounded-lg shadow h-full flex flex-col border border-gray-200 print:hidden">
                {/* Status Dropdown / List */}
                <div className="p-2 border-b bg-white">
                    {/* Dropdown for Status */}
                    <div className="relative mb-2">
                        <select
                            className="w-full border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            {filters.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    {/* Status Summary List */}
                    <div className="grid grid-cols-1 border border-gray-200 rounded-md overflow-hidden text-sm">
                        {/* Status Items mimicking list group */}
                        {/* Header Total */}
                        <div
                            className="flex justify-between p-2 bg-blue-600 text-white cursor-pointer"
                            onClick={() => setStatusFilter('All')}
                        >
                            <span className="font-semibold">All</span>
                            <span className="font-bold">{summary.stats.total}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 border border-gray-200 mt-2 rounded-md overflow-hidden text-sm divide-y">
                        <div className="flex justify-between px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer text-gray-600" onClick={() => setStatusFilter('Active')}>
                            <span>Active</span>
                            <span>{summary.stats.by_status['Active'] || 0}</span>
                        </div>
                        <div className="flex justify-between px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer text-gray-600" onClick={() => setStatusFilter('Inactive')}>
                            <span>Inactive</span>
                            <span>{summary.stats.by_status['Inactive'] || 0}</span>
                        </div>
                        <div className="flex justify-between px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer text-gray-600" onClick={() => setStatusFilter('TC')}>
                            <span>TC</span>
                            <span>{summary.stats.by_status['TC'] || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Class List Table Header (Fake) */}
                <div className="bg-gray-50 border-b px-3 py-2 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span>Class</span>
                    <span>Total</span>
                </div>

                {/* Class List */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-100">
                            {summary.structure.map(c => (
                                <tr
                                    key={c.name}
                                    onClick={() => { setSelectedClass(c.name); setSelectedSection(null); }}
                                    className={`cursor-pointer transition-colors ${selectedClass === c.name ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                >
                                    <td className={`px-3 py-2.5 font-medium ${selectedClass === c.name ? 'text-blue-700' : 'text-gray-700'}`}>{c.name}</td>
                                    <td className={`px-3 py-2.5 text-right font-semibold ${selectedClass === c.name ? 'text-blue-700' : 'text-blue-500'}`}>{c.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderMiddleSidebar = () => {
        if (!selectedClass || !selectedClassObject) return (
            <div className="bg-white rounded-lg shadow h-full flex items-center justify-center text-gray-400 text-sm p-4 text-center border border-gray-200 print:hidden">
                <span className="italic">Select Class</span>
            </div>
        );

        return (
            <div className="bg-white rounded-lg shadow h-full flex flex-col border border-green-100 print:hidden">
                {/* Header Style Match: Green icons and text */}
                <div className="p-3 border-b border-green-100 flex justify-between items-center text-green-700 bg-white">
                    <div className="flex items-center gap-2">
                        {/* Icon placeholder */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="font-bold text-lg">Section</span>
                    </div>

                    {/* Refresh Icon */}
                    <button className="text-green-600 hover:text-green-800" title="Refresh">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                {/* Table Header */}
                <div className="bg-gray-50 border-b px-3 py-2 flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <span>Total</span>
                    <span>{selectedClassObject.count}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b hidden">
                            <tr>
                                <th className="px-3 py-2">Section</th>
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-green-50">
                            <tr
                                onClick={() => setSelectedSection(null)}
                                className={`cursor-pointer transition-colors ${selectedSection === null ? 'bg-green-100' : 'hover:bg-green-50'}`}
                            >
                                <td className="px-3 py-2.5 font-medium text-gray-700">All</td>
                                <td className="px-3 py-2.5 text-right text-gray-600">{selectedClassObject.count}</td>
                            </tr>
                            {selectedClassObject.sections.map(s => (
                                <tr
                                    key={s.name}
                                    onClick={() => setSelectedSection(s.name)}
                                    // Highlight style: darker green background/border
                                    className={`cursor-pointer transition-colors ${selectedSection === s.name ? 'bg-lime-100 border-l-4 border-lime-500' : 'hover:bg-green-50 border-l-4 border-transparent'}`}
                                >
                                    <td className="px-3 py-2.5 font-semibold text-gray-700">{s.name}</td>
                                    <td className="px-3 py-2.5 text-right text-blue-600 font-bold">{s.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Pagination placeholder (Functional in logic but not connected to backend for now)
    const renderPagination = () => (
        <div className="flex items-center gap-1">
            <button className="p-1 w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded hover:bg-green-600 font-bold text-xs" title="First">«</button>
            <button className="p-1 w-8 h-8 flex items-center justify-center bg-orange-400 text-white rounded hover:bg-orange-500 font-bold text-xs" title="Prev">‹ 1</button>
            <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-300">10</div>
            <button className="p-1 w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded hover:bg-green-600 font-bold text-xs" title="Next">N</button>
            <button className="p-1 w-8 h-8 flex items-center justify-center bg-orange-300 text-white rounded hover:bg-orange-400 font-bold text-xs" title="PerPage">10</button>
        </div>
    );

    const renderStudentList = () => {
        if (viewMode === 'create') {
            return (
                <div className="bg-white rounded-lg shadow h-full p-4 overflow-y-auto">
                    <button onClick={() => setViewMode('summary')} className="mb-4 text-sm text-blue-600 hover:underline">← Back to List</button>
                    <CreateStudent mode="create" onSave={() => { setViewMode('summary'); fetchStudents(); fetchSummary(); }} onCancel={() => setViewMode('summary')} />
                </div>
            )
        }

        return (
            <div className="h-full flex flex-col gap-4 print:h-auto print:block">
              
                {/* Main Content Card */}
                <div className="bg-white rounded-lg shadow flex-1 flex flex-col overflow-hidden print:shadow-none print:h-auto">
                    {/* Sub Header */}
                    <div className="p-3 bg-violet-50 border-b flex justify-between items-center flex-wrap gap-2 print:bg-white print:border-none">
                        <div className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            {selectedClass || "All Classes"} {selectedSection || ""}
                            <span className="text-gray-500 font-normal text-base ml-2">Records : {recordCount}</span>
                        </div>

                        <div className="flex items-center gap-4 print:hidden">
                            {/* Gender Stats instead of Pagination */}
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <div className="px-3 py-1 bg-green-500 text-white rounded shadow-sm">
                                    Males: {totalMales}
                                </div>
                                <div className="px-3 py-1 bg-orange-400 text-white rounded shadow-sm">
                                    Females: {totalFemales}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                <button title="Excel" onClick={exportToExcel} className="text-green-600 hover:text-green-800"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
                                <button title="PDF" onClick={handlePrint} className="text-red-500 hover:text-red-700"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>
                            </div>

                            <div className="relative">
                                <input
                                    className="border border-purple-200 rounded-full px-4 py-1 text-sm w-48 focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="Search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto print:overflow-visible">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-50 text-gray-500 font-semibold print:bg-white print:border-b-2 print:border-black">
                                <tr>
                                    <th className="px-4 py-3 text-left w-12 text-gray-700">#</th>
                                    <th className="px-4 py-3 text-left">Roll</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Class</th>
                                    <th className="px-4 py-3 text-left">Adm.No.</th>
                                    <th className="px-4 py-3 text-left">Father Name</th>
                                    <th className="px-4 py-3 text-left">PhoneNumber</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {studentLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading students data...</td></tr>
                                ) : students.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500 flex flex-col items-center">
                                        <span className="text-lg">No students found</span>
                                        <span className="text-xs">Try adjusting filters or search</span>
                                    </td></tr>
                                ) : (
                                    students.map((s, index) => (
                                        <tr key={s.id} className="hover:bg-blue-50 group transition-colors">
                                            <td className="px-4 py-3 font-mono text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-3 text-gray-600 font-medium">{s.rollNo || '-'}</td>
                                            <td className="px-4 py-3">
                                                {/* Squares for Status (P/N/etc) */}
                                                {s.status === 'Active' ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded shadow-sm bg-orange-400 text-white text-xs font-bold" title="Present/Active">P</span>
                                                ) : s.status === 'Inactive' ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded shadow-sm bg-red-500 text-white text-xs font-bold" title="Inactive">I</span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded shadow-sm bg-green-500 text-white text-xs font-bold" title={s.status}>{s.status?.[0]}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-blue-600 group-hover:underline cursor-pointer">{s.name}</div>
                                                {s.status === 'Inactive' && <div className="text-xs text-red-500 mt-0.5">(InActive)</div>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 font-semibold">{s.class} {s.section}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.admNo}</td>
                                            <td className="px-4 py-3 text-gray-700">{s.father}</td>
                                            <td className="px-4 py-3 text-gray-600 text-sm">{s.fatherMobile}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full gap-4 p-4 overflow-hidden bg-gray-100 print:bg-white print:p-0 print:h-auto print:overflow-visible">
            {/* Left Sidebar - 20% */}
            <div className="w-1/5 min-w-[200px] flex-shrink-0 print:hidden">
                {renderLeftSidebar()}
            </div>

            {/* Middle Sidebar - 15% */}
            <div className="w-[15%] min-w-[150px] flex-shrink-0 print:hidden">
                {renderMiddleSidebar()}
            </div>

            {/* Main Content - Rest */}
            <div className="flex-1 min-w-0 print:w-full">
                {renderStudentList()}
            </div>
        </div>
    );
};

export default ClassSummary;
