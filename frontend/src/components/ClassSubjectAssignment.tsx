import React, { useEffect, useState, useRef } from "react";
import api from "../api";

interface Option {
    id: number | string;
    name: string;
}

interface BranchOption extends Option {
    location_name: string;
} 

interface Subject {
    id: number;
    name: string;
    type: string; // 'Academic' or 'Hifz'
}

interface ClassItem {
    id: number;
    name: string;
}

const ClassSubjectAssignment: React.FC = () => {
    // Dropdown Data
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [academicYears, setAcademicYears] = useState<Option[]>([]);

    // Selections
    const [selectedBranch, setSelectedBranch] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedSubjectType, setSelectedSubjectType] = useState<string>("Academic");

    // Matrix Data: map of "classId-subjectId" -> boolean
    const [assignments, setAssignments] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    // Copy Feature State
    const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const copyDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (copyDropdownRef.current && !copyDropdownRef.current.contains(event.target as Node)) {
                setIsCopyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    // Initial Load
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // Get user from localStorage
                const user = JSON.parse(localStorage.getItem('user') || '{}');

                // Auto-populate from Header (LocalStorage)
                const storedYear = localStorage.getItem("academicYear");
                let storedBranch = localStorage.getItem("currentBranch");

                // Fallback: If no storedBranch but user has a branch, use user.branch
                if (!storedBranch && user.branch) {
                    storedBranch = user.branch;
                }

                // Fetch Classes
                const resClasses = await api.get("/classes");
                const classList = resClasses.data.classes || resClasses.data || [];
                setClasses(classList.map((c: any) => ({ id: c.id, name: c.class_name })));



                // Fetch Branches (And Filter based on Context)
                const resBranches = await api.get("/branches");
                const branchList = resBranches.data.branches || resBranches.data || [];

                let formattedBranches: BranchOption[] = Array.isArray(branchList) ? branchList.map((b: any) => ({
                    id: b.id,
                    name: b.branch_name,
                    branch_name: b.branch_name,
                    branch_code: b.branch_code,
                    location_name: b.location_name || "Unknown Location"
                })) : [];

                // Check user role
                const isAdmin = user.role === 'Admin';

                // Find the branch that matches storedBranch from Header
                const matchedBranch = formattedBranches.find((b: any) =>
                    b.name === storedBranch ||
                    b.branch_name === storedBranch ||
                    b.branch_code === storedBranch
                );

                if (isAdmin) {
                    // Admin: Show All option + all branches
                    // We keep 'All' for the main dropdown, but for Copy destinations we exclude 'All'
                    const allOption = {
                        id: "All",
                        name: "All Branches",
                        branch_name: "All Branches",
                        branch_code: "ALL",
                        location_name: "Global"
                    };
                    setBranches([allOption, ...formattedBranches]);

                    if (storedBranch === "All" || storedBranch === "All Branches") {
                        setSelectedBranch("All");
                    } else if (matchedBranch) {
                        setSelectedBranch(String(matchedBranch.id));
                    } else {
                        setSelectedBranch("All");
                    }
                } else {
                    // Non-Admin: Show only their branch
                    if (matchedBranch) {
                        setBranches([matchedBranch]);
                        setSelectedBranch(String(matchedBranch.id));
                    } else {
                        console.warn("User branch not found in branch list:", storedBranch);
                        setBranches(formattedBranches);
                        if (formattedBranches.length > 0) {
                            setSelectedBranch(String(formattedBranches[0].id));
                        }
                    }
                }

                // Academic Years
                const resAcademicYears = await api.get("/org/academic-years");
                const academicYearsList = resAcademicYears.data.academic_years || resAcademicYears.data || [];
                setAcademicYears(academicYearsList.map((y: any) => ({ id: y.id, name: y.name })));

                if (storedYear) {
                    const foundYear = academicYearsList.find((y: any) => y.name.trim() === storedYear.trim());
                    if (foundYear) {
                        setSelectedYear(foundYear.id.toString());
                    } else if (academicYearsList.length > 0) {
                        setSelectedYear(academicYearsList[0].id.toString());
                    }
                } else if (academicYearsList.length > 0) {
                    setSelectedYear(academicYearsList[0].id.toString());
                }
            } catch (err) {
                console.error("Error loading metadata", err);
            }
        };
        fetchMetadata();
    }, []);

    // Fetch Subjects when Academic Year changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!selectedYear) {
                setSubjects([]);
                return;
            }

            // Resolve Year Name
            const yearObj = academicYears.find(y => String(y.id) === String(selectedYear));
            const academicYearName = yearObj ? yearObj.name : "";

            try {
                // Fetch subjects specific to this academic year
                // Note: The backend logic creates subjects with an academic_year string.
                const resSubjects = await api.get("/academic/subjects", {
                    params: { academic_year: academicYearName }
                });

                setSubjects(resSubjects.data.map((s: any) => ({
                    id: s.id,
                    name: s.subject_name,
                    type: s.subject_type || "Academic"
                })));
            } catch (err) {
                console.error("Error loading subjects", err);
                setSubjects([]);
            }
        };

        // Only fetch if we have academic years loaded
        if (academicYears.length > 0) {
            fetchSubjects();
        }
    }, [selectedYear, academicYears]);

    // Fetch Existing Assignments for Matrix (Load Initial State)
    useEffect(() => {
        const fetchMatrixData = async () => {
            if (!selectedYear || !selectedBranch) return;

            setLoading(true);
            try {
                const res = await api.get("/academic/assigned-subjects", {
                    params: {
                        academic_year_id: selectedYear,
                        branch_id: selectedBranch === "All" ? undefined : selectedBranch
                    }
                });

                const assignmentSet = new Set<string>();
                res.data.forEach((a: any) => {
                    const subj = subjects.find(s => s.name === a.subject_name);
                    if (subj) {
                        assignmentSet.add(`${a.class_id}-${subj.id}`);
                    }
                });
                setAssignments(assignmentSet);
                setInitialAssignments(new Set(assignmentSet));

            } catch (error) {
                console.error("Failed to fetch matrix data", error);
            } finally {
                setLoading(false);
            }
        };

        if (subjects.length > 0) {
            fetchMatrixData();
        }
    }, [selectedYear, selectedBranch, subjects]);


    // Local State Toggle (Sync with local Set only)
    const handleToggle = (classId: number, subjectId: number) => {
        const key = `${classId}-${subjectId}`;
        const newSet = new Set(assignments);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setAssignments(newSet);
    };

    // Check All for a Subject Row (Horizontal)
    const handleCheckAllRow = (subjectId: number) => {
        const newSet = new Set(assignments);
        let allChecked = true;

        // Check if all visible classes are already checked
        for (const cls of classes) {
            if (!newSet.has(`${cls.id}-${subjectId}`)) {
                allChecked = false;
                break;
            }
        }

        // Toggle: If all checked, uncheck all. Else check all.
        classes.forEach(cls => {
            const key = `${cls.id}-${subjectId}`;
            if (allChecked) {
                newSet.delete(key); // Uncheck all
            } else {
                newSet.add(key); // Check all
            }
        });
        setAssignments(newSet);
    };

    // NEW: Check All for a Class Column (Vertical)
    const handleCheckAllColumn = (classId: number) => {
        const newSet = new Set(assignments);
        let allChecked = true;

        // Check if all visible subjects are already checked for this class
        for (const subj of filteredSubjects) {
            if (!newSet.has(`${classId}-${subj.id}`)) {
                allChecked = false;
                break;
            }
        }

        // Toggle: If all checked, uncheck all. Else check all.
        filteredSubjects.forEach(subj => {
            const key = `${classId}-${subj.id}`;
            if (allChecked) {
                newSet.delete(key); // Uncheck all
            } else {
                newSet.add(key); // Check all
            }
        });
        setAssignments(newSet);
    };

    // Filter Subjects by Type
    const filteredSubjects = subjects.filter(s =>
        selectedSubjectType === "All" || s.type === selectedSubjectType
    );

    // Save Changes
    const [saving, setSaving] = useState(false);
    const [initialAssignments, setInitialAssignments] = useState<Set<string>>(new Set());

    const handleSave = async () => {
        if (!selectedYear || !selectedBranch) return;
        setSaving(true);

        // Calculate Diff
        const updates: any[] = [];

        // 1. Find Added (Present in Current NOT in Initial)
        assignments.forEach(key => {
            if (!initialAssignments.has(key)) {
                const [cId, sId] = key.split('-');
                updates.push({ class_id: parseInt(cId), subject_id: parseInt(sId), action: "assign" });
            }
        });

        // 2. Find Removed (Present in Initial NOT in Current)
        initialAssignments.forEach(key => {
            if (!assignments.has(key)) {
                const [cId, sId] = key.split('-');
                updates.push({ class_id: parseInt(cId), subject_id: parseInt(sId), action: "remove" });
            }
        });

        if (updates.length === 0) {
            alert("No changes to save.");
            setSaving(false);
            return;
        }

        try {
            await api.post("/academic/manage-subject-assignment/bulk", {
                updates: updates,
                academic_year_id: selectedYear,
                branch_id: selectedBranch,
                location_id: 1
            });

            // On success, update Initial to match Current
            setInitialAssignments(new Set(assignments));
            alert("Assignments saved successfully!");
        } catch (error: any) {
            console.error("Failed to save assignments", error);
            let alertMessage = "Failed to save assignments. Please check the console for details.";

            if (error.response && error.response.data) {
                // Check for the specific "in use by students" message
                const inUseMessages = error.response.data.details && Array.isArray(error.response.data.details)
                    ? error.response.data.details.filter((detail: string) => detail.includes("is assigned to students"))
                    : [];

                if (inUseMessages.length > 0) {
                    alertMessage = "Students assigned to this subject. Unable to unassign.";
                    // If there are multiple specific messages, append them
                } else if (error.response.data.error) {
                    alertMessage = error.response.data.error;
                }
            }
            alert(alertMessage);
            setAssignments(new Set(initialAssignments)); // Revert state to initial on save failure
        } finally {
            setSaving(false);
        }
    };

    // Copy Targets Logic
    const toggleCopyTarget = (branchId: string) => {
        const newTargets = new Set(copyTargets);
        if (newTargets.has(branchId)) {
            newTargets.delete(branchId);
        } else {
            newTargets.add(branchId);
        }
        setCopyTargets(newTargets);
    };

    // Group Available Branches by Location
    // Exclude currently selected branch and "All"
    const availableBranches = branches.filter(b => b.id !== "All" && String(b.id) !== selectedBranch);

    const branchesByLocation: { [key: string]: BranchOption[] } = {};
    availableBranches.forEach(b => {
        if (!branchesByLocation[b.location_name]) {
            branchesByLocation[b.location_name] = [];
        }
        branchesByLocation[b.location_name].push(b);
    });

    const [copying, setCopying] = useState(false);

    const handleCopy = async () => {
        if (copyTargets.size === 0) {
            alert("Please select at least one branch to copy to.");
            return;
        }

        if (!confirm(`Are you sure you want to copy assignments to ${copyTargets.size} branches?\n(Merge Mode: Only missing assignments will be added)`)) {
            return;
        }

        setCopying(true);
        try {
            await api.post("/academic/copy-subject-assignments", {
                source_branch_id: selectedBranch,
                target_branch_ids: Array.from(copyTargets),
                academic_year_id: selectedYear
            });
            alert("Assignments copied successfully!");
            setCopyTargets(new Set()); // Reset selections
            setIsCopyDropdownOpen(false);
        } catch (error: any) {
            console.error("Copy failed", error);
            alert(error.response?.data?.error || "Failed to copy assignments.");
        } finally {
            setCopying(false);
        }
    };

    return (
        <div>
            <div className="bg-white p-6 rounded shadow border mb-4">
                <h2 className="text-xl font-semibold mb-4">Class-Subject Assignment</h2>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6 items-end">
                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                        <select
                            className="w-full border p-2 rounded bg-gray-50"
                            value={selectedYear}
                            disabled={true}
                            onChange={e => setSelectedYear(e.target.value)}
                        >
                            <option value="">Select Year</option>
                            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </select>
                    </div>

                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select
                            className="w-full border p-2 rounded bg-gray-50"
                            value={selectedBranch}
                            disabled={true}
                            onChange={e => setSelectedBranch(e.target.value)}
                        >
                            <option value="">Select Branch</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Group</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={selectedSubjectType}
                            onChange={e => setSelectedSubjectType(e.target.value)}
                        >
                            <option value="Academic">Academic</option>
                            <option value="Hifz">Hifz</option>
                            <option value="All">All Types</option>
                        </select>
                    </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto border rounded">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-2 min-w-[150px] text-left">Subjects \ Classes</th>
                                {classes.map(c => (
                                    <th key={c.id} className="border p-2 text-center min-w-[60px]">
                                        <div className="flex flex-col items-center gap-1">
                                            <span>{c.name}</span>
                                            <button
                                                onClick={() => handleCheckAllColumn(c.id)}
                                                className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded"
                                                title="Check/Uncheck all subjects for this class"
                                            >
                                                ✓ All
                                            </button>
                                        </div>
                                    </th>
                                ))}
                                <th className="border p-2 text-center min-w-[80px]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && assignments.size === 0 ? (
                                <tr><td colSpan={classes.length + 2} className="p-4 text-center">Loading Assignments...</td></tr>
                            ) : filteredSubjects.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="border p-2 font-medium bg-gray-50">
                                        {s.name}
                                    </td>
                                    {classes.map(c => {
                                        const key = `${c.id}-${s.id}`;
                                        const isAssigned = assignments.has(key);

                                        return (
                                            <td key={c.id} className="border p-1 text-center">
                                                <div className="flex justify-center items-center h-full">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAssigned}
                                                        onChange={() => handleToggle(c.id, s.id)}
                                                        className="w-5 h-5 cursor-pointer accent-[#337ab7]"
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                    {/* Action Column: Check All Row */}
                                    <td className="border p-1 text-center">
                                        <button
                                            onClick={() => handleCheckAllRow(s.id)}
                                            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                                            title="Toggle All Classes for this Subject"
                                        >
                                            Check/Uncheck All
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredSubjects.length === 0 && (
                    <div className="p-4 text-center text-gray-500">No subjects found for selected group.</div>
                )}

                <div className="mt-4 flex justify-between items-center">
                    {/* Copy Section Button */}
                    <div>
                        {selectedBranch && selectedBranch !== "All" && (
                            <div className="relative" ref={copyDropdownRef}>
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                                    onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                                >
                                    <span>Copy to Branches</span>
                                    <span className="text-xs">▼</span>
                                </button>
                                {/* Grouped Dropdown */}
                                {isCopyDropdownOpen && (
                                    <div className="absolute left-full top-0 ml-2 w-72 bg-white border shadow-xl rounded z-20 max-h-80 overflow-y-auto">
                                        <div className="mb-2 text-sm font-semibold text-gray-700 pb-2 border-b">
                                            Select Target Branches
                                        </div>
                                        {Object.keys(branchesByLocation).length === 0 ? (
                                            <div className="text-gray-500 text-sm p-4 text-center">No other branches available</div>
                                        ) : (
                                            Object.keys(branchesByLocation).map(loc => (
                                                <div key={loc} className="mb-1">
                                                    {/* Header - Clean & Bold */}
                                                    <div className="text-sm font-bold text-gray-900 px-3 py-2 bg-gray-50 border-b border-gray-100">
                                                        {loc}
                                                    </div>
                                                    {/* Items - Indented */}
                                                    <div className="py-1">
                                                        {branchesByLocation[loc].map(b => (
                                                            <label key={b.id} className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors pl-6">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={copyTargets.has(String(b.id))}
                                                                    onChange={() => toggleCopyTarget(String(b.id))}
                                                                    className="w-4 h-4 accent-blue-600 rounded border-gray-300"
                                                                />
                                                                <span className="text-sm text-gray-700">{b.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <div className="mt-2 pt-2 border-t flex justify-between items-center sticky bottom-0 bg-white">
                                            <span className="text-xs text-gray-500">{copyTargets.size} selected</span>
                                            <button
                                                onClick={handleCopy}
                                                disabled={copying || copyTargets.size === 0}
                                                className={`px-3 py-1 text-xs text-white rounded ${copying || copyTargets.size === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                            >
                                                {copying ? "Copying..." : "Confirm Copy"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 justify-end">
                        <button
                            onClick={() => {
                                // Reset to initial assignments
                                setAssignments(new Set(initialAssignments));
                            }}
                            disabled={saving}
                            className={`px-6 py-2 rounded text-white-700 border transition hover:bg-gray-100 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`px-6 py-2 rounded text-white font-medium ${saving ? 'bg-gray-400' : 'bg-[#337ab7] hover:bg-blue-600'}`}
                        >
                            {saving ? "Saving..." : "Save Assignments"}
                        </button>
                    </div>

                </div>


            </div>
        </div>
    );
};

export default ClassSubjectAssignment;