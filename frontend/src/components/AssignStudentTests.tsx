import React, { useEffect, useState } from "react";
import api from "../api";
import { Save } from "lucide-react";

interface TestColumn {
    class_test_id: number;
    test_name: string;
    test_order: number;
} 

interface StudentRow {
    student_id: number;
    name: string;
    roll_number: number | null;
    admission_no: string;
    section: string | null;
}

interface AssignmentsMap {
    [studentId: number]: number[]; // List of assigned class_test_ids
}

export default function AssignStudentTests() {
    /* ---------------- STATE ---------------- */
    // Get initial values safely
    const getInitialBranch = () => {
        const storedBranch = localStorage.getItem("currentBranch");
        if (storedBranch && storedBranch !== "undefined") return storedBranch;

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.branch && user.branch !== "All") return user.branch;
            } catch (e) {
                console.error("Error parsing user from localStorage", e);
            }
        }
        return "";
    };

    const [filters, setFilters] = useState({
        academic_year_id: localStorage.getItem("academicYear") || "",
        branch_id: getInitialBranch(),
        class_id: "",
    });

    const [columns, setColumns] = useState<TestColumn[]>([]);
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [assignments, setAssignments] = useState<AssignmentsMap>({});

    const [dropdowns, setDropdowns] = useState({
        years: [],
        branches: [],
        classes: []
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");

    // Tracking changes for efficient save: { student_id, class_test_id, status }
    const [changes, setChanges] = useState<{ student_id: number, class_test_id: number, status: boolean }[]>([]);

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (filters.academic_year_id && filters.branch_id && filters.class_id) {
            fetchMatrix();
        } else {
            setStudents([]);
            setColumns([]);
            setAssignments({});
        }
    }, [filters]);

    /* ---------------- API CALLS ---------------- */
    const fetchDropdowns = async () => {
        try {
            const [y, b, c] = await Promise.all([
                api.get("/org/academic-years"),
                api.get("/branches"),
                api.get("/classes")
            ]);
            setDropdowns({
                years: y.data.academic_years,
                branches: b.data.branches,
                classes: c.data.classes
            });
        } catch (e) {
            console.error("Failed to load dropdowns", e);
        }
    };

    const fetchMatrix = async () => {
        setLoading(true);
        setLoadError("");
        setChanges([]); // Clear pending changes on reload
        try {
            const res = await api.get("/student-test-assignments", { params: filters });
            setColumns(res.data.columns);
            setStudents(res.data.rows);
            setAssignments(res.data.assignments);
        } catch (e: any) {
            console.error(e);
            setLoadError(e.response?.data?.error || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (changes.length === 0) {
            alert("No changes to save");
            return;
        }
        setSaving(true);
        try {
            await api.post("/student-test-assignments", {
                ...filters,
                updates: changes
            });
            alert("Saved successfully!");
            fetchMatrix(); // Reload to refresh state and clear changes
        } catch (e: any) {
            console.error(e);
            alert("Failed to save: " + (e.response?.data?.error || "Unknown error"));
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- HELPERS ---------------- */
    const isAssigned = (studentId: number, testId: number) => {
        // Check current state (including unsaved changes)
        // Actually, easier to let 'assignments' be source of truth + logic to update it
        // But for efficient patches, we track 'changes'.
        // Let's rely on 'assignments' state for rendering, and 'changes' for API.
        return assignments[studentId]?.includes(testId) || false;
    };

    const toggleAssignment = (studentId: number, testId: number, checked: boolean) => {
        // Update local UI state
        setAssignments(prev => {
            const currentList = prev[studentId] || [];
            if (checked) {
                return { ...prev, [studentId]: [...currentList, testId] };
            } else {
                return { ...prev, [studentId]: currentList.filter(id => id !== testId) };
            }
        });

        // Track change
        setChanges(prev => {
            // Remove any existing change for this exact cell to avoid duplicates/conflicts in patches
            const filtered = prev.filter(c => !(c.student_id === studentId && c.class_test_id === testId));
            return [...filtered, { student_id: studentId, class_test_id: testId, status: checked }];
        });
    };

    const toggleColumn = (testId: number, checked: boolean) => {
        // Setup bulk changes
        const newUpdates: { student_id: number, class_test_id: number, status: boolean }[] = [];
        const newAssignments = { ...assignments };

        students.forEach(s => {
            const currentAssigned = newAssignments[s.student_id]?.includes(testId);
            if (currentAssigned !== checked) {
                // Update map
                if (checked) {
                    newAssignments[s.student_id] = [...(newAssignments[s.student_id] || []), testId];
                } else {
                    newAssignments[s.student_id] = (newAssignments[s.student_id] || []).filter(id => id !== testId);
                }
                // Track update
                newUpdates.push({ student_id: s.student_id, class_test_id: testId, status: checked });
            }
        });

        setAssignments(newAssignments);
        setChanges(prev => {
            // Merge new bulk updates, removing old conflicting ones
            const prevFiltered = prev.filter(c => !(c.class_test_id === testId));
            return [...prevFiltered, ...newUpdates];
        });
    };

    /* ---------------- RENDER ---------------- */
    return (
        <div className="p-4 bg-white rounded shadow min-h-screen flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Assign Test to Students</h2>

            {/* FILTERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase">Academic Year</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.academic_year_id}
                        disabled
                        onChange={e => setFilters({ ...filters, academic_year_id: e.target.value })}
                    >
                        <option value="">Select Year</option>
                        {dropdowns.years.map((y: any) => <option key={y.id} value={y.name}>{y.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase">Branch</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.branch_id}
                        disabled
                        onChange={e => setFilters({ ...filters, branch_id: e.target.value })}
                    >
                        <option value="">Select Branch</option>
                        {dropdowns.branches.map((b: any) => <option key={b.id} value={b.branch_name}>{b.branch_name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase">Class</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={filters.class_id}
                        onChange={e => setFilters({ ...filters, class_id: e.target.value })}
                    >
                        <option value="">Select Class</option>
                        {dropdowns.classes.map((c: any) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                    </select>
                </div>
            </div>

            {/* CONTENT */}
            {loading && <div className="text-center py-10">Loading Data...</div>}
            {loadError && <div className="text-center py-10 text-red-600">{loadError}</div>}

            {!loading && !loadError && students.length > 0 && (
                <>
                    <div className="overflow-x-auto border rounded shadow-sm flex-1">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-700 uppercase sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 border w-12 text-center">S.No</th>
                                    <th className="px-3 py-2 border">Student Name</th>
                                    <th className="px-3 py-2 border">Sec</th>
                                    <th className="px-3 py-2 border w-24">Roll</th>
                                    <th className="px-3 py-2 border w-24">Adm No</th>
                                    {columns.map(col => (
                                        <th key={col.class_test_id} className="px-3 py-2 border text-center min-w-[100px]">
                                            <div className="flex flex-col items-center">
                                                <span className="mb-1">{col.test_name}</span>
                                                <input
                                                    type="checkbox"
                                                    title="Select All"
                                                    onChange={(e) => toggleColumn(col.class_test_id, e.target.checked)}
                                                />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s, idx) => (
                                    <tr key={s.student_id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 border text-center">{idx + 1}</td>
                                        <td className="px-3 py-2 border font-medium">{s.name}</td>
                                        <td className="px-3 py-2 border text-center">{s.section}</td>
                                        <td className="px-3 py-2 border">{s.roll_number}</td>
                                        <td className="px-3 py-2 border">{s.admission_no}</td>
                                        {columns.map(col => (
                                            <td key={col.class_test_id} className="px-3 py-2 border text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-blue-600"
                                                    checked={isAssigned(s.student_id, col.class_test_id)}
                                                    onChange={e => toggleAssignment(s.student_id, col.class_test_id, e.target.checked)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex justify-end space-x-2">
                        <button
                            onClick={() => fetchMatrix()}
                            disabled={saving || changes.length === 0}
                            className={`px-6 py-2 rounded text-gray-700 border transition hover:bg-gray-100
                                ${saving || changes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || changes.length === 0}
                            className={`flex items-center space-x-2 px-6 py-2 rounded text-white transition
                                ${saving || changes.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow'}
                            `}
                        >
                            <Save size={18} />
                            <span>{saving ? "Saving..." : "Save Assignments"}</span>
                        </button>
                    </div>
                </>
            )}

            {!loading && !loadError && students.length === 0 && filters.class_id && (
                <div className="text-center py-10 text-gray-500">
                    No students found or data not loaded. Check filters.
                </div>
            )}
        </div>
    );
}
