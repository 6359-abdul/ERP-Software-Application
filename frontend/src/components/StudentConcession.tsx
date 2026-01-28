import React, { useState, useEffect } from 'react';
import api from '../api';

interface FeeType {
    id: number;
    fee_type: string;
}

interface ConcessionItem {
    fee_type_id: number;
    fee_type_name: string;
    percentage: number;
}

interface Concession {
    title: string;
    description: string;
    academic_year: string;
    is_percentage: boolean;
    items: ConcessionItem[];
}

interface Student {
    student_id: number;
    name: string;
    admNo: string;
    class: string;
    section: string;
}

interface FeeInstallment {
    sr: number;
    title: string;
    payable: number;
    paid: boolean;
    paidAmount?: number;
    dueAmount?: number;
    concession?: number;
    fee_type_id?: number;
    student_fee_id?: number;
    month?: string;
}

const StudentConcession: React.FC = () => {
    // Dropdown Data
    const [classes, setClasses] = useState<string[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [concessions, setConcessions] = useState<Concession[]>([]);

    // Selections
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [selectedConcessionTitle, setSelectedConcessionTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);

    // Data for Display
    const [installments, setInstallments] = useState<FeeInstallment[]>([]);
    const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);
    const [previewData, setPreviewData] = useState<Record<number, number>>({}); // student_fee_id -> new concession amount

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch Initial Data
    useEffect(() => {
        fetchClasses();
        fetchConcessions();

        const userStr = localStorage.getItem('user');
        if (userStr) {
            const u = JSON.parse(userStr);
            setIsAdmin(u.role === 'Admin');
        }
    }, []);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/classes');
            const classNames: string[] = response.data.classes.map((c: any) => String(c.class_name));
            setClasses([...new Set(classNames)]);
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    const fetchConcessions = async () => {
        try {
            const response = await api.get('/concessions');
            const globalYear = localStorage.getItem('academicYear') || '';
            const filteredConcessions = response.data.concessions.filter((c: Concession) => c.academic_year === globalYear);
            setConcessions(filteredConcessions);
        } catch (error) {
            console.error("Error fetching concessions:", error);
        }
    };

    // Fetch Sections
    useEffect(() => {
        if (!selectedClass) {
            setSections([]);
            return;
        }
        const fetchSections = async () => {
            try {
                // Pass branch to get correct sections
                const params = new URLSearchParams();
                params.append('class', selectedClass);
                const globalBranch = localStorage.getItem('currentBranch') || 'All';
                const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;
                params.append('branch', branchParam);

                console.log("Fetching sections with params:", params.toString());

                const response = await api.get(`/students?${params}`);
                console.log("Students API Response for Sections:", response.data);

                const data = response.data;
                const allStudents: Student[] = Array.isArray(data) ? data : (data.students || []);

                console.log("Student count:", allStudents.length);
                const rawSections = allStudents.map(s => s.section);
                console.log("Raw Sections extracted:", rawSections);

                const sec = [...new Set(rawSections.filter(Boolean))].sort();
                console.log("Final Unique Sections:", sec);
                setSections(sec);
            } catch (error) {
                console.error("Error fetching sections:", error);
            }
        };
        fetchSections();
    }, [selectedClass]);

    // Fetch Students
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const params = new URLSearchParams();
                if (selectedClass) params.append('class', selectedClass);
                if (selectedSection) params.append('section', selectedSection);
                if (searchTerm) params.append('search', searchTerm);

                // Add Branch param
                const globalBranch = localStorage.getItem('currentBranch') || 'All';
                const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;
                params.append('branch', branchParam);

                const response = await api.get(`/students?${params}`);
                const data = response.data;
                setStudents(Array.isArray(data) ? data : (data.students || []));
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };
        fetchStudents();
    }, [selectedClass, selectedSection, searchTerm]); // Removed selectedBranch dependency

    // Fetch Installments when Student Selected
    useEffect(() => {
        if (!selectedStudentId) {
            setInstallments([]);
            return;
        }
        const fetchInstallments = async () => {
            try {
                const response = await api.get(`/fees/student-details/${selectedStudentId}`);
                setInstallments(response.data.installments || []);
                setSelectedInstallmentIds([]); // Reset selection
                setPreviewData({});
            } catch (error) {
                console.error("Error fetching installments:", error);
            }
        };
        fetchInstallments();
    }, [selectedStudentId]);

    // Calculate Preview when Concession Selected
    useEffect(() => {
        if (!selectedConcessionTitle || installments.length === 0) {
            setPreviewData({});
            return;
        }

        const concession = concessions.find(c => c.title === selectedConcessionTitle);
        if (!concession) return;

        const newPreview: Record<number, number> = {};

        installments.forEach(inst => {
            if (!inst.student_fee_id) return;

            const rule = concession.items.find(i => i.fee_type_id === inst.fee_type_id);
            if (rule) {
                const payable = inst.payable;
                let discount = 0;
                if (concession.is_percentage) {
                    discount = payable * (rule.percentage / 100);
                } else {
                    discount = Math.min(payable, rule.percentage);
                }
                newPreview[inst.student_fee_id] = Math.round(discount);
            }
        });
        setPreviewData(newPreview);

    }, [selectedConcessionTitle, installments]);


    const handleToggleInstallment = (id: number) => {
        setSelectedInstallmentIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all that have a valid concession preview AND are not disabled
            const validIds = installments
                .filter(i => {
                    const hasPreview = i.student_fee_id && previewData[i.student_fee_id] !== undefined;
                    const isPaidOrPartial = (i.paidAmount || 0) > 0;
                    const hasExistingConcession = (i.concession || 0) > 0;
                    return hasPreview && !isPaidOrPartial && !hasExistingConcession;
                })
                .map(i => i.student_fee_id!);
            setSelectedInstallmentIds(validIds);
        } else {
            setSelectedInstallmentIds([]);
        }
    };

    const handleAssign = async () => {
        if (!selectedStudentId || !selectedConcessionTitle || selectedInstallmentIds.length === 0) {
            alert("Please select a student, a concession, and at least one installment.");
            return;
        }

        if (!window.confirm(`Assign concession to ${selectedInstallmentIds.length} installments? This will update the fee records.`)) return;

        setLoading(true);
        try {
            const concession = concessions.find(c => c.title === selectedConcessionTitle);

            await api.post('/fees/assign-concession', {
                student_id: selectedStudentId,
                concession_title: selectedConcessionTitle,
                academic_year: concession?.academic_year || localStorage.getItem('academicYear') || '',
                installments: selectedInstallmentIds
            });

            setMessage("Concession assigned successfully!");

            // Refresh installments
            const response = await api.get(`/fees/student-details/${selectedStudentId}`);
            setInstallments(response.data.installments || []);
            setSelectedInstallmentIds([]);

        } catch (error: any) {
            console.error("Error assigning concession:", error);
            setMessage(`Error: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const selectedConcession = concessions.find(c => c.title === selectedConcessionTitle);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="text-violet-600 mr-2">₹</span> Student Concession
                </h2>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow border grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* <div>
                        <input
                            type="text"
                            value={localStorage.getItem('currentBranch') || 'All'}
                            readOnly
                            className="border p-2 rounded w-full bg-gray-100 text-gray-600 cursor-not-allowed"
                            title="Current Branch"
                        />
                    </div>*/}
                    <input
                        type="text"
                        placeholder="Search Admission No..."
                        className="border p-2 rounded"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="border p-2 rounded"
                        value={selectedClass}
                        onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        className="border p-2 rounded"
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                    >
                        <option value="">Select Section</option>
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        className="border p-2 rounded"
                        value={selectedStudentId || ''}
                        onChange={e => setSelectedStudentId(Number(e.target.value) || null)}
                    >
                        <option value="">Select Student</option>
                        {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name} ({s.admNo})</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Concession Rules */}
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Concession Template</label>
                            <select
                                className="w-full border p-2 rounded focus:ring-violet-500 focus:border-violet-500"
                                value={selectedConcessionTitle}
                                onChange={e => setSelectedConcessionTitle(e.target.value)}
                            >
                                <option value="">-- Select Concession --</option>
                                {concessions.map((c, idx) => (
                                    <option key={idx} value={c.title}>{c.title}</option>
                                ))}
                            </select>
                        </div>

                        {selectedConcession && (
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Concession Rules</h3>
                                <div className="border rounded overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-gray-500">Fee Type</th>
                                                <th className="px-3 py-2 text-right font-medium text-gray-500">Value ({selectedConcession.is_percentage ? '%' : '₹'})</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedConcession.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 text-gray-900">{item.fee_type_name}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{item.percentage}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Student Installments */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800">Student Installments</h3>
                            {message && <span className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>}
                        </div>

                        {installments.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Select a student to view installments.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 w-10">
                                                <input type="checkbox" onChange={handleSelectAll} />
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Installment</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Total Fee</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Paid</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500">Current Concession</th>
                                            <th className="px-3 py-2 text-right font-medium text-violet-600">New Concession</th>
                                            <th className="px-3 py-2 text-center font-medium text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {installments.map((inst) => {
                                            const newConc = inst.student_fee_id ? previewData[inst.student_fee_id] : undefined;
                                            const hasNewConc = newConc !== undefined;

                                            // Validation: Disable if already paid (partial or full) OR already has concession
                                            const isPaidOrPartial = (inst.paidAmount || 0) > 0;
                                            const hasExistingConcession = (inst.concession || 0) > 0;
                                            const isDisabled = isPaidOrPartial || hasExistingConcession;

                                            let disabledReason = "";
                                            if (isPaidOrPartial) disabledReason = "Cannot apply concession to paid/partial fees";
                                            else if (hasExistingConcession) disabledReason = "Fee already has a concession";

                                            return (
                                                <tr key={inst.sr} className={hasNewConc ? "bg-violet-50" : ""}>
                                                    <td className="px-3 py-2 text-center" title={disabledReason}>
                                                        <input
                                                            type="checkbox"
                                                            checked={inst.student_fee_id ? selectedInstallmentIds.includes(inst.student_fee_id) : false}
                                                            onChange={() => inst.student_fee_id && !isDisabled && handleToggleInstallment(inst.student_fee_id)}
                                                            disabled={!hasNewConc || isDisabled}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-900">
                                                        {inst.title}
                                                        {isDisabled && <span className="ml-2 text-xs text-red-500">({isPaidOrPartial ? 'Paid' : 'Has Concession'})</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{inst.payable}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{inst.paidAmount || 0}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900">{inst.concession || 0}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-violet-600">
                                                        {hasNewConc && !isDisabled ? newConc : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${inst.paid ? 'bg-green-100 text-green-800' :
                                                            (inst.paidAmount || 0) > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                            {inst.paid ? 'Paid' : (inst.paidAmount || 0) > 0 ? 'Partial' : 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleAssign}
                                disabled={loading || selectedInstallmentIds.length === 0}
                                className="bg-violet-600 text-white px-6 py-2 rounded shadow hover:bg-violet-700 disabled:opacity-50"
                            >
                                {loading ? 'Assigning...' : 'Assign Concession'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentConcession; 
