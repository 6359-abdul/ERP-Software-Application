import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Edit, Save, XCircle } from "lucide-react";

interface StudentRow {
    student_id: number;
    admission_no: string;
    roll_number: string | number;
    name: string;
}

interface SubjectOption {
    id: number;
    subject_name: string;
    subject_type?: string;
}

interface SubjectColumn {
    id: number;
    name: string;
    maxMarks: number;
}

interface MarkEntry {
    value: string;
    is_absent: boolean;
}

const MultiSubjectMarksEntry: React.FC = () => {
    const [academicYear, setAcademicYear] = useState<string>("");
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>("");

    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>("");

    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubjectType, setSelectedSubjectType] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

    const [students, setStudents] = useState<StudentRow[]>([]);
    const [subjectColumns, setSubjectColumns] = useState<SubjectColumn[]>([]);
    const [marksByStudent, setMarksByStudent] = useState<Record<number, Record<number, MarkEntry>>>({});

    const [activeClassTestId, setActiveClassTestId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const storedYear = localStorage.getItem("academicYear") || "";
        const userStr = localStorage.getItem("user");
        let storedBranch = "All";

        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === "Admin" || user.branch === "All" || user.branch === "AllBranches") {
                    const selected = localStorage.getItem("currentBranch");
                    if (selected && selected !== "All" && selected !== "All Locations") {
                        storedBranch = selected;
                    }
                } else {
                    storedBranch = user.branch || "All";
                }
            } catch (e) {
                console.error("Error parsing user", e);
            }
        }

        setAcademicYear(storedYear);
        setSelectedBranch(storedBranch);
        setBranches([{ branch_name: storedBranch, branch_code: storedBranch }]);
    }, []);

    useEffect(() => {
        if (!selectedBranch) return;
        api.get(`/classes?branch=${selectedBranch}`)
            .then(res => setClasses(res.data.classes || res.data))
            .catch(err => console.error(err));
    }, [selectedBranch]);

    useEffect(() => {
        const clsObj = classes.find(c => c.id == selectedClass);
        if (!clsObj) {
            setSections([]);
            return;
        }

        api.get(`/sections?class=${clsObj.class_name}`)
            .then(res => setSections(res.data.sections || []))
            .catch(err => {
                console.error(err);
                setSections([]);
            });
    }, [selectedClass, classes]);

    useEffect(() => {
        if (!selectedClass || !academicYear) return;

        api.get(`/class-tests/list`, {
            params: {
                academic_year: academicYear,
                branch: selectedBranch,
                class_id: selectedClass
            }
        })
            .then(res => {
                setTests(res.data);
            })
            .catch(err => console.error(err));
    }, [selectedClass, academicYear, selectedBranch]);

    useEffect(() => {
        if (!selectedTestId) {
            setSubjects([]);
            return;
        }

        const selectedTest = tests.find(t => t.test_id == selectedTestId);
        if (selectedTest && selectedTest.subjects) {
            setSubjects(selectedTest.subjects);
        } else {
            setSubjects([]);
        }
    }, [selectedTestId, tests]);

    const subjectTypeOptions = useMemo(() => {
        const types = new Set<string>();
        subjects.forEach(s => {
            if (s.subject_type) {
                types.add(s.subject_type);
            }
        });
        return Array.from(types);
    }, [subjects]);

    const filteredSubjects = useMemo(() => {
        if (!selectedSubjectType) {
            return subjects;
        }
        return subjects.filter(s => s.subject_type === selectedSubjectType);
    }, [subjects, selectedSubjectType]);

    useEffect(() => {
        setSelectedSubjectId("");
    }, [selectedSubjectType, selectedTestId]);

    const handleGetMarks = async () => {
        if (!selectedTestId || !selectedClass) {
            setMessage({ type: "error", text: "Please select Class and Test" });
            return;
        }

        const selectedIds =
            selectedSubjectId === "ALL"
                ? filteredSubjects.map(s => s.id)
                : selectedSubjectId
                    ? [Number(selectedSubjectId)]
                    : [];

        if (selectedIds.length === 0) {
            setMessage({ type: "error", text: "Please select at least one subject" });
            return;
        }

        setLoading(true);
        setMessage(null);
        setStudents([]);
        setMarksByStudent({});
        setSubjectColumns([]);
        setActiveClassTestId(null);

        try {
            let classTestId: number | null = null;
            const responses = await Promise.all(
                selectedIds.map(subjectId =>
                    api.get(`/marks/entry/subject`, {
                        params: {
                            academic_year: academicYear,
                            branch: selectedBranch,
                            class_id: selectedClass,
                            section: selectedSection,
                            test_id: selectedTestId,
                            subject_id: subjectId
                        }
                    })
                )
            );

            const subjectColumnsData: SubjectColumn[] = [];
            const studentMap = new Map<number, StudentRow>();
            const marksState: Record<number, Record<number, MarkEntry>> = {};
            let hasExistingMarks = false;

            responses.forEach((response, index) => {
                const subjectId = selectedIds[index];
                const subject = subjects.find(s => s.id === subjectId);
                subjectColumnsData.push({
                    id: subjectId,
                    name: subject?.subject_name || `Subject ${subjectId}`,
                    maxMarks: response.data.subject_total_marks
                });

                response.data.students.forEach((student: any) => {
                    if (!studentMap.has(student.student_id)) {
                        studentMap.set(student.student_id, {
                            student_id: student.student_id,
                            admission_no: student.admission_no,
                            roll_number: student.roll_number,
                            name: student.name
                        });
                    }

                    if (!marksState[student.student_id]) {
                        marksState[student.student_id] = {};
                    }

                    const isAbsent = Boolean(student.is_absent);
                    const value = isAbsent ? "AB" : (student.marks_obtained ?? "");
                    if (isAbsent || value !== "") {
                        hasExistingMarks = true;
                    }

                    marksState[student.student_id][subjectId] = {
                        value: value === null ? "" : String(value),
                        is_absent: isAbsent
                    };
                });

                if (!classTestId && response.data.class_test_id) {
                    classTestId = response.data.class_test_id;
                }
            });

            const sortedStudents = Array.from(studentMap.values()).sort((a, b) => {
                const aRoll = Number(a.roll_number) || 0;
                const bRoll = Number(b.roll_number) || 0;
                return aRoll - bRoll;
            });

            setStudents(sortedStudents);
            setMarksByStudent(marksState);
            setSubjectColumns(subjectColumnsData);
            setActiveClassTestId(classTestId);
            setIsEditing(!hasExistingMarks);
        } catch (err: any) {
            console.error(err);
            setMessage({ type: "error", text: err.response?.data?.error || "Failed to load marks" });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (studentId: number, subjectId: number, value: string) => {
        setMarksByStudent(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [subjectId]: {
                    value,
                    is_absent: false
                }
            }
        }));
    };

    const handleInputBlur = (studentId: number, subjectId: number, maxMarks: number) => {
        setMarksByStudent(prev => {
            const current = prev[studentId]?.[subjectId];
            if (!current) return prev;

            let val = current.value;
            let isAbsent = false;

            if (typeof val === "string") {
                const trimmed = val.trim().toUpperCase();

                if (trimmed === "AB") {
                    isAbsent = true;
                    val = "AB";
                } else if (trimmed === "") {
                    val = "";
                } else {
                    const parsed = parseFloat(trimmed);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        let num = Math.round(parsed);
                        if (num < 0) {
                            num = 0;
                        }
                        if (num > maxMarks) {
                            alert(`Marks cannot exceed ${maxMarks}`);
                            val = "";
                        } else {
                            val = String(num);
                        }
                    } else {
                        val = "";
                    }
                }
            }

            return {
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    [subjectId]: {
                        value: val,
                        is_absent: isAbsent
                    }
                }
            };
        });
    };

    const handleSave = async () => {
        if (students.length === 0 || subjectColumns.length === 0) return;
        if (!activeClassTestId) {
            setMessage({ type: "error", text: "Internal Error: Missing Class Test ID. Please reload data." });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            await Promise.all(
                subjectColumns.map(subject => {
                    const payload = {
                        class_test_id: activeClassTestId,
                        subject_id: subject.id,
                        academic_year: academicYear,
                        branch: selectedBranch,
                        class_id: selectedClass,
                        section: selectedSection,
                        user_id: 1,
                        marks: students.map(student => {
                            const mark = marksByStudent[student.student_id]?.[subject.id];
                            const value = mark?.is_absent ? "AB" : mark?.value ?? "";
                            return {
                                student_id: student.student_id,
                                value
                            };
                        })
                    };
                    return api.post(`/marks/entry/subject`, payload);
                })
            );

            setMessage({ type: "success", text: "Marks saved successfully!" });
            setIsEditing(false);
        } catch (err: any) {
            console.error(err);
            setMessage({ type: "error", text: err.response?.data?.error || "Failed to save marks" });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        handleGetMarks();
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Enter Multi-Subject Marks</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        disabled={branches.length <= 1}
                    >
                        {branches.map(b => (
                            <option key={b.branch_code} value={b.branch_code}>
                                {b.branch_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Class</label>
                    <select
                        value={selectedClass}
                        onChange={e => setSelectedClass(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.class_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Section</label>
                    <select
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Section</option>
                        {sections.map(s => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Exam Type (Test)</label>
                    <select
                        value={selectedTestId}
                        onChange={e => setSelectedTestId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Test</option>
                        {tests.map(t => (
                            <option key={t.test_id} value={t.test_id}>
                                {t.test_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject Type</label>
                    <select
                        value={selectedSubjectType}
                        onChange={e => setSelectedSubjectType(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="">All Types</option>
                        {subjectTypeOptions.map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Subjects</label>
                    <select
                        value={selectedSubjectId}
                        onChange={e => setSelectedSubjectId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    >
                        <option value="">Select Subject</option>
                        <option value="ALL">All Subjects</option>
                        {filteredSubjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.subject_name}
                            </option>
                        ))}
                    </select>
                </div>

                
            </div>

            <div className="mb-4 flex items-center gap-3">
                <button
                    type="button"
                    onClick={handleGetMarks}
                    disabled={loading || !selectedTestId}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? "Loading..." : "Get"}
                </button>

                {subjectColumns.length > 0 && !isEditing && (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Edit size={16} />
                        Edit
                    </button>
                )}
            </div>

            {message && (
                <div
                    className={`p-3 rounded mb-4 ${
                        message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {students.length > 0 && subjectColumns.length > 0 && (
                <div className="bg-white shadow rounded overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                        <span className="font-semibold text-gray-700">
                            Subjects Loaded: {subjectColumns.length}
                        </span>
                        <div className="text-sm text-gray-500">
                            Valid inputs: 0-max, "AB" (Absent)
                        </div>
                    </div>

                    <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        S.No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Roll No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Admission No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student Name
                                    </th>
                                    {subjectColumns.map(subject => (
                                        <th
                                            key={subject.id}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            <div className="flex flex-col">
                                                <span>{subject.name}</span>
                                                <span className="text-[10px] text-gray-400">Max: {subject.maxMarks}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {students.map((student, index) => (
                                    <tr key={student.student_id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {student.roll_number}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {student.admission_no}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {student.name}
                                        </td>
                                        {subjectColumns.map(subject => {
                                            const mark = marksByStudent[student.student_id]?.[subject.id];
                                            return (
                                                <td key={subject.id} className="px-4 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        value={
                                                            mark?.is_absent
                                                                ? "AB"
                                                                : mark?.value !== undefined
                                                                    ? String(mark.value).split(".")[0]
                                                                    : ""
                                                        }
                                                        onChange={e =>
                                                            handleInputChange(student.student_id, subject.id, e.target.value)
                                                        }
                                                        onBlur={() =>
                                                            handleInputBlur(student.student_id, subject.id, subject.maxMarks)
                                                        }
                                                        className={`border rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 ${
                                                            mark?.is_absent
                                                                ? "bg-red-50 border-red-300 text-red-700 font-bold"
                                                                : "border-gray-300"
                                                        } ${!isEditing ? "bg-gray-100 cursor-not-allowed" : ""}`}
                                                        placeholder="-"
                                                        disabled={!isEditing}
                                                        readOnly={!isEditing}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {isEditing && (
                        <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className={`bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 flex items-center gap-2 ${
                                    saving ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            >
                                <XCircle size={18} />
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className={`bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2 ${
                                    saving ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            >
                                <Save size={18} />
                                {saving ? "Saving..." : "Save Marks"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSubjectMarksEntry;
