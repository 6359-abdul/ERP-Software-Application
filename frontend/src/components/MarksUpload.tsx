import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import { Upload, FileDown, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

interface MarksUploadProps { }

const MarksUpload: React.FC<MarksUploadProps> = () => {
    // --- State ---
    const [academicYear, setAcademicYear] = useState<string>("");
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>("");

    const [tests, setTests] = useState<any[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<string>("");

    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

    const [students, setStudents] = useState<any[]>([]); // For template generation
    const [subjectTotalMarks, setSubjectTotalMarks] = useState<number>(0);
    const [gradingScale, setGradingScale] = useState<any[]>([]);
    const [activeClassTestId, setActiveClassTestId] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Init ---
    useEffect(() => {
        const storedYear = localStorage.getItem("academicYear") || "";
        const userStr = localStorage.getItem("user");
        let storedBranch = "All";

        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.role === 'Admin' || user.branch === 'All' || user.branch === 'AllBranches') {
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

    // --- Fetch Classes ---
    useEffect(() => {
        if (!selectedBranch) return;
        api.get(`/classes?branch=${selectedBranch}`)
            .then(res => setClasses(res.data.classes || res.data))
            .catch(err => console.error(err));
    }, [selectedBranch]);

    // --- Fetch Tests for Class ---
    useEffect(() => {
        if (!selectedClass || !academicYear) return;
        api.get(`/class-tests/list`, {
            params: {
                academic_year: academicYear,
                branch: selectedBranch,
                class_id: selectedClass
            }
        })
            .then(res => setTests(res.data))
            .catch(err => console.error(err));
    }, [selectedClass, academicYear, selectedBranch]);

    // --- Fetch Subjects for Test ---
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

    // --- Fetch Context (Students & Max Marks) Only for Validation/Template ---
    // We need this to generate template OR validate uploads (max marks)
    useEffect(() => {
        if (!selectedTestId || !selectedSubjectId || !selectedClass) return;

        setLoading(true);
        api.get(`/marks/entry/subject`, {
            params: {
                academic_year: academicYear,
                branch: selectedBranch,
                class_id: selectedClass,
                section: selectedSection, // optional
                test_id: selectedTestId,
                subject_id: selectedSubjectId
            }
        })
            .then(res => {
                setStudents(res.data.students);
                setSubjectTotalMarks(res.data.subject_total_marks);
                setGradingScale(res.data.grading_scale);
                setActiveClassTestId(res.data.class_test_id);
            })
            .catch(err => {
                console.error(err);
                setMessage({ type: 'error', text: "Failed to load class configuration." });
            })
            .finally(() => setLoading(false));

    }, [selectedTestId, selectedSubjectId, selectedClass, selectedSection]);


    // --- Template Download ---
    const handleDownloadTemplate = () => {
        if (students.length === 0) {
            setMessage({ type: 'error', text: "No students found to generate template." });
            return;
        }

        const className = classes.find(c => c.id == selectedClass)?.class_name || 'Class';
        const subjectName = subjects.find(s => s.id == selectedSubjectId)?.subject_name || 'Subject';
        const testName = tests.find(t => t.test_id == selectedTestId)?.test_name || 'Test';

        const header = ["Student ID", "Roll No", "Admission No", "Student Name", "Marks (Max: " + subjectTotalMarks + ")"];
        const data = students.map((student) => [
            student.student_id,
            student.roll_number,
            student.admission_no,
            student.name,
            ""
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MarksEntry");

        const fileName = `${className}_${subjectName}_${testName}_Template.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    // --- Upload & Save ---
    const handleTriggerUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!activeClassTestId) {
            setMessage({ type: 'error', text: "System Error: Missing active class test ID." });
            return;
        }

        setSaving(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                // Process Data
                const pendingUpdates: any[] = [];
                let errors: string[] = [];

                // Skip header (index 0)
                for (let i = 1; i < data.length; i++) {
                    const row: any = data[i];
                    if (!row || row.length === 0) continue;

                    const sId = parseInt(row[0]);
                    let rawMark = row[4];

                    // Validate generic logic
                    const studentExists = students.find(s => s.student_id === sId);
                    if (!studentExists) continue;

                    let val: string | number | null = "";
                    let isAbsent = false;

                    if (rawMark === undefined || rawMark === null || String(rawMark).trim() === "") {
                        continue; // Skip empty rows? or clear? Let's skip empty to avoid overwriting with null unless intended
                    } else {
                        const sVal = String(rawMark).trim().toUpperCase();
                        if (sVal === "AB" || sVal === "ABSENT") {
                            isAbsent = true;
                            val = "AB";
                        } else {
                            const pVal = parseFloat(sVal);
                            if (isNaN(pVal)) {
                                errors.push(`Row ${i + 1}: Invalid mark '${rawMark}' for ${studentExists.name}`);
                                continue;
                            }
                            if (pVal < 0 || pVal > subjectTotalMarks) {
                                errors.push(`Row ${i + 1}: Mark ${pVal} exceeds max ${subjectTotalMarks} for ${studentExists.name}`);
                                continue;
                            }
                            val = pVal;
                        }
                    }

                    pendingUpdates.push({
                        student_id: sId,
                        value: isAbsent ? "AB" : val
                    });
                }

                if (errors.length > 0) {
                    alert("Issues found in Excel:\n" + errors.slice(0, 10).join("\n"));
                    setSaving(false);
                    return;
                }

                if (pendingUpdates.length === 0) {
                    setMessage({ type: 'error', text: "No valid marks found in file." });
                    setSaving(false);
                    return;
                }

                // Send to Backend
                const payload = {
                    class_test_id: activeClassTestId,
                    subject_id: selectedSubjectId,
                    academic_year: academicYear,
                    branch: selectedBranch,
                    class_id: selectedClass,
                    user_id: 1, // TODO: Auth
                    marks: pendingUpdates
                };

                api.post(`/marks/entry/subject`, payload)
                    .then(res => {
                        setMessage({ type: 'success', text: `Successfully saved marks for ${pendingUpdates.length} students!` });
                    })
                    .catch(err => {
                        console.error(err);
                        setMessage({ type: 'error', text: err.response?.data?.error || "Failed to save marks" });
                    })
                    .finally(() => setSaving(false));

            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: "Failed to parse Excel file." });
                setSaving(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-4">
            {/* Instructions Box */}
            <div className="mb-6 bg-rose-50 border border-rose-200 p-4 rounded text-sm text-gray-700">
                <h3 className="text-red-600 font-bold mb-2">Important!!</h3>
                <p className="mb-1 text-gray-800 font-medium">Note :Please read the following instructions:</p>
                <ul className="list-decimal pl-5 space-y-1">
                    <li>Please don't make any changes in given template.</li>
                    <li>Only 80 records are accepted in the list at a time.</li>
                    <li>The data should be in valid format to upload successfully.</li>
                    <li>For Ispresent column enter score for Absent  use 'AB' in Marks column</li>
                    <li>In mark column you can enter mark, grade and absent remark.</li>
                </ul>
            </div>

            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Upload size={24} className="text-blue-600" />
                Import Subject Marks
            </h2>

            <div className="bg-white p-4 rounded shadow-sm border mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Class */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Class <span className="text-red-500">*</span></label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                        </select>
                    </div>

                    {/* Test */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Schedule Test <span className="text-red-500">*</span></label>
                        <select
                            value={selectedTestId}
                            onChange={e => setSelectedTestId(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        >
                            <option value="">Select Test</option>
                            {tests.map(t => <option key={t.test_id} value={t.test_id}>{t.test_name}</option>)}
                        </select>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject <span className="text-red-500">*</span></label>
                        <select
                            value={selectedSubjectId}
                            onChange={e => setSelectedSubjectId(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white"
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                        </select>
                    </div>


                </div>

                {/* Upload Section */}
                <div className="flex flex-col md:flex-row items-end gap-4 border-t pt-4">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Browse for the excel sheet:</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                placeholder="No file chosen"
                                className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-gray-50 text-gray-500"
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                            />
                            <button
                                type="button"
                                onClick={handleTriggerUpload}
                                className="bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-xs whitespace-nowrap"
                            >
                                Choose File
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleTriggerUpload}
                        disabled={saving || !selectedTestId || !selectedSubjectId}
                        className={`bg-blue-500 text-white px-6 py-2.5 rounded hover:bg-blue-600 flex items-center gap-2 font-medium ${saving || !selectedTestId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? "Uploading..." : "Upload Excel"}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        disabled={loading || !selectedTestId || students.length === 0}
                        className={`bg-emerald-500 text-white px-6 py-2.5 rounded hover:bg-emerald-600 flex items-center gap-2 font-medium ${students.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <FileDown size={18} />
                        Download Template
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded mb-4 flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message.type === 'error' ? <AlertCircle size={18} /> : <Upload size={18} />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default MarksUpload;
