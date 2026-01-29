import React, { useEffect, useState } from "react";
import api from "../api";
import { Copy, Save } from "lucide-react";
import CopySubjectTestModal from "./CopySubjectTestModal";

interface SubjectRow {
    subject_id: number;
    subject_name: string;
    subject_type: string; 
    assigned: boolean;
    max_marks: number | null;
    subject_order: number | null;
}

interface DropdownItem {
    id: string | number;
    name: string; // Uniform property for display
}

export default function AssignSubjectTests() {
    /* ---------------- STATE ---------------- */
    const [filters, setFilters] = useState({
        academic_year_id: localStorage.getItem("academicYear") || "",
        branch_id: localStorage.getItem("currentBranch") || "",
        class_id: "",
        test_id: "",
        subject_type: ""
    });

    // Dropdown Lists
    const [academicYears, setAcademicYears] = useState<DropdownItem[]>([]);
    const [branches, setBranches] = useState<DropdownItem[]>([]);
    const [classes, setClasses] = useState<DropdownItem[]>([]);
    const [tests, setTests] = useState<DropdownItem[]>([]);

    // Data
    const [subjects, setSubjects] = useState<SubjectRow[]>([]);
    const [classTestId, setClassTestId] = useState<number | null>(null);
    const [testMaxMarks, setTestMaxMarks] = useState<number>(0);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (
            filters.academic_year_id &&
            filters.branch_id &&
            filters.class_id &&
            filters.test_id
        ) {
            loadMatrix();
        } else {
            setSubjects([]);
            setClassTestId(null);
        }
    }, [filters]);

    /* ---------------- API CALLS ---------------- */
    const fetchDropdowns = async () => {
        try {
            const [yrRes, brRes, clRes] = await Promise.all([
                api.get("/org/academic-years"),
                api.get("/branches"),
                api.get("/classes")
            ]);
            setAcademicYears(yrRes.data.academic_years.map((y: any) => ({ id: y.id, name: y.name })));
            setBranches(brRes.data.branches.map((b: any) => ({ id: b.id, name: b.branch_name })));
            setClasses(clRes.data.classes.map((c: any) => ({ id: c.id, name: c.class_name })));
        } catch (e) {
            console.error("Error loading dropdowns", e);
        }
    };

    useEffect(() => {
        if (filters.academic_year_id && filters.branch_id && filters.class_id) {
            fetchTests();
        } else {
            setTests([]); // Clear tests if filters incomplete
        }
    }, [filters.academic_year_id, filters.branch_id, filters.class_id]);

    const fetchTests = async () => {
        try {
            // Use /class-tests/list to get only tests assigned to this class
            const res = await api.get("/class-tests/list", {
                params: {
                    academic_year: filters.academic_year_id,
                    branch: filters.branch_id,
                    class_id: filters.class_id
                }
            });

            // Map the response (which returns objects with test_id, test_name) to DropdownItem
            setTests(res.data.map((t: any) => ({
                id: t.test_id, // Note: response uses test_id, not id
                name: t.test_name
            })));
        } catch (e) {
            console.error("Error loading tests", e);
            setTests([]);
        }
    };

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.get("/class-test-subjects/", {
                params: filters
            });
            setSubjects(res.data.subjects);
            setClassTestId(res.data.class_test_id);
            setTestMaxMarks(res.data.test_max_marks || 0);
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to load subjects");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation handled by backend regarding if class/branch/test selected
        if (!filters.academic_year_id || !filters.branch_id || !filters.class_id || !filters.test_id) {
            alert("Please select all filters first.");
            return;
        }

        // Frontend Validation
        const assignedSubjects = subjects.filter(s => s.assigned);
        const totalMarks = assignedSubjects.reduce((sum, s) => sum + (s.max_marks || 0), 0);

        if (totalMarks > testMaxMarks) {
            alert(`Total Subject Marks (${totalMarks}) cannot exceed Test Max Marks (${testMaxMarks})`);
            return;
        }

        const orders = assignedSubjects.map(s => s.subject_order).filter(o => o !== null);
        if (new Set(orders).size !== orders.length) {
            alert("Subject Orders must be unique");
            return;
        }

        setSaving(true);
        const payload = {
            class_test_id: classTestId, // Can be null
            context: filters, // Pass context so backend can create ClassTest if null
            subjects: assignedSubjects.map(s => ({
                subject_id: s.subject_id,
                max_marks: s.max_marks,
                subject_order: s.subject_order
            }))
        };

        try {
            const res = await api.post("/class-test-subjects/", payload);
            alert("Assignments saved successfully");

            // If backend created a new ID, update state
            if (res.data.class_test_id) {
                setClassTestId(res.data.class_test_id);
            }
        } catch (err: any) {
            alert(err.response?.data?.error || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- UI HANDLERS ---------------- */
    const updateSubject = (index: number, field: keyof SubjectRow, value: any) => {
        const newSubjects = [...subjects];
        newSubjects[index] = { ...newSubjects[index], [field]: value };

        // Auto-logic: If unchecking assigned, clear values
        if (field === 'assigned' && !value) {
            newSubjects[index].max_marks = null;
            newSubjects[index].subject_order = null;
        }
        // Auto-logic: If setting marks/order, auto-check assigned
        if ((field === 'max_marks' || field === 'subject_order') && value) {
            newSubjects[index].assigned = true;
        }

        setSubjects(newSubjects);
    };

    const calculateTotal = () => {
        return subjects.filter(s => s.assigned).reduce((sum, s) => sum + (s.max_marks || 0), 0);
    };

    /* ---------------- RENDER ---------------- */
    return (
        <div className="p-6 bg-white rounded-lg shadow-md min-h-screen">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Assign Subjects to Test</h2>
                {classTestId && (
                    <button
                        onClick={() => setIsCopyModalOpen(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
                    >
                        <Copy size={16} /> <span>Copy Structure</span>
                    </button>
                )}
            </div>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                {/* Academic Year */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Academic Year</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.academic_year_id}
                        disabled
                        onChange={e => setFilters({ ...filters, academic_year_id: e.target.value })}
                    >
                        <option value="">Select Year</option>
                        {academicYears.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
                    </select>
                </div>

                {/* Branch */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Branch</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.branch_id}
                        disabled
                        onChange={e => setFilters({ ...filters, branch_id: e.target.value })}
                    >
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>

                {/* Class */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Class</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.class_id}
                        onChange={e => setFilters({ ...filters, class_id: e.target.value })}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Test */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Test</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.test_id}
                        onChange={e => setFilters({ ...filters, test_id: e.target.value })}
                    >
                        <option value="">Select Test</option>
                        {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {/* Subject Type */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject Type</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.subject_type}
                        onChange={e => setFilters({ ...filters, subject_type: e.target.value })}
                    >
                        <option value="">All Types</option>
                        <option value="Academic">Academic</option>
                        <option value="Hifz">Hifz</option>
                    </select>
                </div>
            </div>

            {/* MAIN CONTENT */}
            {loading ? (
                <div className="text-center py-10">Loading Matrix...</div>
            ) : !classTestId ? (
                <div className="text-center py-10 text-gray-500 italic">Select filters to view assignment matrix</div>
            ) : (
                <div>
                    {/* Validation INFO */}
                    <div className="flex justify-between items-center mb-2 px-2">
                        <div className="text-sm">
                            Test Max Marks: <span className="font-bold">{testMaxMarks}</span>
                        </div>
                        <div className={`text-sm ${calculateTotal() > testMaxMarks ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                            Total Assigned: {calculateTotal()}
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto border rounded shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Subject Name</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-center">Assigned</th>
                                    <th className="px-4 py-3 w-32">Max Marks</th>
                                    <th className="px-4 py-3 w-32">Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {subjects.map((s, idx) => (
                                    <tr key={s.subject_id} className={`hover:bg-gray-50 ${s.assigned ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-2 font-medium">{s.subject_name}</td>
                                        <td className="px-4 py-2 text-gray-500">{s.subject_type}</td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-blue-600"
                                                checked={s.assigned}
                                                onChange={(e) => updateSubject(idx, 'assigned', e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className={`w-full border rounded p-1 ${!s.assigned ? 'bg-gray-100' : ''}`}
                                                disabled={!s.assigned}
                                                value={s.max_marks ?? ''}
                                                onChange={(e) => updateSubject(idx, 'max_marks', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className={`w-full border rounded p-1 ${!s.assigned ? 'bg-gray-100' : ''}`}
                                                disabled={!s.assigned}
                                                value={s.subject_order ?? ''}
                                                onChange={(e) => updateSubject(idx, 'subject_order', Number(e.target.value))}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ACTION BAR */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => loadMatrix()}
                            disabled={saving}
                            className="bg-gray-200 text-gray-700 px-8 py-3 rounded shadow hover:bg-gray-300 flex items-center space-x-2"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-8 py-3 rounded shadow hover:bg-blue-700 flex items-center space-x-2"
                        >
                            <Save size={16} /> <span>{saving ? "Saving..." : "Save Assignments"}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* COPY MODAL */}
            <CopySubjectTestModal
                isOpen={isCopyModalOpen}
                onClose={() => setIsCopyModalOpen(false)}
                sourceClassTestId={classTestId}
                currentAcademicYear={filters.academic_year_id}
                currentBranch={filters.branch_id}
                currentClass={filters.class_id}
                currentTest={filters.test_id}
            />
        </div>
    );
}
