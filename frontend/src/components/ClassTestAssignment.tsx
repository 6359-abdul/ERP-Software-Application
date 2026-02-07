import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import { AlertTriangle } from "lucide-react";

interface ClassItem {
    id: number;
    name: string;
}

interface TestType {
    id: number; 
    name: string;
}

interface Assignment { 
    class_id: number;
    test_id: number;
    test_order: number;
    status: boolean;
}

interface BranchOption {
    id: number | string;
    name: string;
    location_name: string;
}

interface AcademicYearOption {
    id: number;
    name: string;
}
const ClassTestAssignment: React.FC = () => {
    // --- Metadata State ---
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]); // Primarily to map names if needed, or unused if strictly readonly

    // --- Selection State ---
    const [selectedYear, setSelectedYear] = useState<string>(""); // Name
    const [selectedBranch, setSelectedBranch] = useState<string>(""); // Name
    const [selectedLocation, setSelectedLocation] = useState<string>(""); // Captured from branch selection logic
    const [isAllBranchesMode, setIsAllBranchesMode] = useState(false);

    // --- Matrix Data State ---
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [testTypes, setTestTypes] = useState<TestType[]>([]);

    // Map: Key = `${class_id}-${test_id}` -> Assignment
    const [assignmentMap, setAssignmentMap] = useState<Map<string, Assignment>>(new Map());
    const [initialAssignmentMap, setInitialAssignmentMap] = useState<Map<string, Assignment>>(new Map());

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // --- Copy Feature State ---
    const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set()); // Set of "BranchName|LocationName" strings
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const copyDropdownRef = useRef<HTMLDivElement>(null);
    const [copying, setCopying] = useState(false);

    // --- Initial Load ---
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const storedYear = localStorage.getItem("academicYear");
                const storedBranch = localStorage.getItem("currentBranch");
                const storedLocation = localStorage.getItem("currentLocation");

                // Strictly rely on Global Context
                if (storedBranch === "All Branches" || storedBranch === "All" || !storedBranch) {
                    setIsAllBranchesMode(true);
                    // Even if All Branches, we might need to load metadata to show context, but user can't create.
                    // Actually, if All Branches, we usually just show the warning and stop.
                } else {
                    setIsAllBranchesMode(false);
                    setSelectedBranch(storedBranch);
                    setSelectedLocation(storedLocation || "Hyderabad"); // Default if missing
                }

                // 2. Fetch Academic Years
                const resYears = await api.get("/org/academic-years");
                const yearsList = resYears.data.academic_years || resYears.data || [];
                setAcademicYears(yearsList.map((y: any) => ({ id: y.id, name: y.name })));

                if (storedYear) {
                    const foundYear = yearsList.find((y: any) => y.name === storedYear);
                    if (foundYear) setSelectedYear(foundYear.name);
                    else if (yearsList.length > 0) setSelectedYear(yearsList[0].name);
                } else if (yearsList.length > 0) {
                    setSelectedYear(yearsList[0].name);
                }

                // Fetch branches solely for Copy targets (excluding current)
                const resBranches = await api.get("/branches");
                const branchList = resBranches.data.branches || resBranches.data || [];
                setBranches(branchList.map((b: any) => ({
                    id: b.id,
                    name: b.branch_name,
                    location_name: b.location_name || "Unknown"
                })));

            } catch (err) {
                console.error("Error loading metadata", err);
            }
        };
        fetchMetadata();

        // Click outside listener for copy dropdown
        function handleClickOutside(event: MouseEvent) {
            if (copyDropdownRef.current && !copyDropdownRef.current.contains(event.target as Node)) {
                setIsCopyDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    // --- Fetch Matrix Data ---
    const fetchMatrix = async () => {
        if (!selectedYear || !selectedBranch || isAllBranchesMode) return;
        setLoading(true);
        try {
            const res = await api.get("/class-tests/matrix", {
                params: {
                    academic_year: selectedYear,
                    branch: selectedBranch
                }
            });

            setClasses(res.data.classes);
            setTestTypes(res.data.test_types);

            const newMap = new Map<string, Assignment>();
            res.data.assignments.forEach((a: Assignment) => {
                newMap.set(`${a.class_id}-${a.test_id}`, a);
            });
            setAssignmentMap(newMap);
            // Deep copy for initial state tracking
            const initialMap = new Map<string, Assignment>();
            res.data.assignments.forEach((a: Assignment) => {
                initialMap.set(`${a.class_id}-${a.test_id}`, { ...a });
            });
            setInitialAssignmentMap(initialMap);

        } catch (e) {
            console.error("Error fetching matrix", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatrix();
    }, [selectedYear, selectedBranch, isAllBranchesMode]);


    // --- Handlers ---

    // Helper: Get next available order for a class
    const getNextOrder = (classId: number, currentMap: Map<string, Assignment>) => {
        let maxOrder = 0;
        for (const [key, val] of currentMap.entries()) {
            if (key.startsWith(`${classId}-`) && val.status) {
                if (val.test_order > maxOrder) maxOrder = val.test_order;
            }
        }
        return maxOrder + 1;
    };

    const handleCheck = (classId: number, testId: number, checked: boolean) => {
        const key = `${classId}-${testId}`;
        const newMap = new Map(assignmentMap);

        if (checked) {
            // Assigning
            const existing = newMap.get(key);
            if (existing) {
                newMap.set(key, { ...existing, status: true });
            } else {
                const nextOrder = getNextOrder(classId, newMap);
                newMap.set(key, {
                    class_id: classId,
                    test_id: testId,
                    test_order: nextOrder,
                    status: true
                });
            }
        } else {
            // Unassigning
            const existing = newMap.get(key);
            if (existing) {
                newMap.set(key, { ...existing, status: false });
            }
        }
        setAssignmentMap(newMap);
    };

    // Toggle Column (Test Type)
    const toggleColumn = (testId: number) => {
        const newMap = new Map(assignmentMap);
        let allChecked = true;

        // Check current state
        for (const cls of classes) {
            const key = `${cls.id}-${testId}`;
            const entry = newMap.get(key);
            if (!entry || !entry.status) {
                allChecked = false;
                break;
            }
        }

        // Toggle
        classes.forEach(cls => {
            const key = `${cls.id}-${testId}`;
            if (allChecked) {
                // Uncheck all
                const existing = newMap.get(key);
                if (existing) newMap.set(key, { ...existing, status: false });
            } else {
                // Check all
                const existing = newMap.get(key);
                if (existing) {
                    if (!existing.status) newMap.set(key, { ...existing, status: true });
                } else {
                    const nextOrder = getNextOrder(cls.id, newMap);
                    newMap.set(key, {
                        class_id: cls.id,
                        test_id: testId,
                        test_order: nextOrder,
                        status: true
                    });
                }
            }
        });
        setAssignmentMap(newMap);
    };

    // Toggle Row (Class)
    const toggleRow = (classId: number) => {
        const newMap = new Map(assignmentMap);
        let allChecked = true;

        for (const t of testTypes) {
            const key = `${classId}-${t.id}`;
            const entry = newMap.get(key);
            if (!entry || !entry.status) {
                allChecked = false;
                break;
            }
        }

        testTypes.forEach(t => {
            const key = `${classId}-${t.id}`;
            if (allChecked) {
                // Uncheck all
                const existing = newMap.get(key);
                if (existing) newMap.set(key, { ...existing, status: false });
            } else {
                // Check all
                const existing = newMap.get(key);
                if (existing) {
                    if (!existing.status) newMap.set(key, { ...existing, status: true });
                } else {
                    // Need to be careful about getNextOrder in loop. 
                    // Since we are modifying newMap in place, getNextOrder should see previous additions if we calculate correctly.
                    // But getNextOrder iterates newMap. So it should work!
                    const nextOrder = getNextOrder(classId, newMap);
                    newMap.set(key, {
                        class_id: classId,
                        test_id: t.id,
                        test_order: nextOrder,
                        status: true
                    });
                }
            }
        });
        setAssignmentMap(newMap);
    };


    const handleOrderChange = (classId: number, testId: number, order: number) => {
        const key = `${classId}-${testId}`;
        const newMap = new Map(assignmentMap);
        const existing = newMap.get(key);
        if (existing) {
            newMap.set(key, { ...existing, test_order: order });
            setAssignmentMap(newMap);
        }
    };

    const handleSave = async () => {
        if (!selectedYear || !selectedBranch) return;
        setSaving(true);

        const promises: Promise<any>[] = [];

        // Check for duplicate orders in a class
        for (const cls of classes) {
            const orders = new Set<number>();
            for (const test of testTypes) {
                const key = `${cls.id}-${test.id}`;
                const item = assignmentMap.get(key);
                if (item && item.status) {
                    if (orders.has(item.test_order)) {
                        alert(`Duplicate order number ${item.test_order} in Class ${cls.name}. Please fix before saving.`);
                        setSaving(false);
                        return;
                    }
                    orders.add(item.test_order);
                }
            }
        }

        // Identify changes
        assignmentMap.forEach((val, key) => {
            const initial = initialAssignmentMap.get(key);
            let hasChanged = false;
            if (!initial) {
                // New item
                if (val.status) hasChanged = true;
            } else {
                // Existing item
                if (initial.status !== val.status || initial.test_order !== val.test_order) {
                    hasChanged = true;
                }
            }

            if (hasChanged) {
                promises.push(api.post('/class-tests/assign', {
                    academic_year: selectedYear,
                    branch: selectedBranch,
                    location: selectedLocation,
                    class_id: val.class_id,
                    test_id: val.test_id,
                    test_order: val.test_order,
                    status: val.status
                }));
            }
        });

        try {
            await Promise.all(promises);
            alert("Assignments saved successfully");
            fetchMatrix(); // Refresh
        } catch (e: any) {
            console.error("Save error", e);
            alert("Error saving: " + (e.response?.data?.error || e.message));
        } finally {
            setSaving(false);
        }
    };

    // --- Copy Logic ---
    const branchesByLocation: { [key: string]: BranchOption[] } = {};
    branches.filter(b => b.name !== selectedBranch && b.name !== 'All Branches').forEach(b => {
        if (!branchesByLocation[b.location_name]) branchesByLocation[b.location_name] = [];
        branchesByLocation[b.location_name].push(b);
    });

    const handleCopy = async () => {
        if (copyTargets.size === 0) return alert("Select target branches");
        if (!confirm(`Copy assignments to ${copyTargets.size} branches?`)) return;

        setCopying(true);
        try {
            for (const targetKey of Array.from(copyTargets)) {
                // targetKey is "BranchName|LocationName" - we need both
                const [targetBranch, targetLocation] = targetKey.split('|');

                await api.post('/class-tests/copy', {
                    from_branch: selectedBranch,
                    to_branch: targetBranch,
                    to_location: targetLocation,
                    academic_year: selectedYear
                });
            }
            alert("Copy successful");
            setIsCopyDropdownOpen(false);
            setCopyTargets(new Set());
        } catch (e: any) {
            alert("Copy failed: " + e.message);
        } finally {
            setCopying(false);
        }
    };

    if (isAllBranchesMode) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex items-center">
                        <AlertTriangle className="text-yellow-500 mr-2" size={24} />
                        <div>
                            <h3 className="font-bold text-yellow-700">Cannot create tests in "All Branches" mode.</h3>
                            <p className="text-sm text-yellow-600">Please select a specific branch from the header to create or modify assignments.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 bg-white rounded shadow border">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-800">Assign Tests to Classes</h2>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                    <div className="border p-2 rounded bg-gray-100 min-w-[150px] text-gray-700">
                        {selectedYear || "Loading..."}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    <div className="border p-2 rounded bg-gray-100 min-w-[200px] text-gray-700">
                        {selectedBranch || "Loading..."}
                    </div>
                </div>
            </div>

            {/* Matrix */}
            <div className="border rounded overflow-x-auto mb-4">
                <table className="w-full text-sm text-left collapse-borders">
                    <thead className="bg-[#1a202c] text-white">
                        <tr>
                            <th className="p-3 border-r border-gray-600 sticky left-0 z-10 bg-[#1a202c]">Class</th>
                            {testTypes.map(t => (
                                <th key={t.id} className="p-3 text-center border-r border-gray-600 min-w-[100px]">
                                    <div>{t.name}</div>
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-3 h-3 accent-blue-400 cursor-pointer"
                                        title={`Assign ${t.name} to all classes`}
                                        onClick={(e) => { e.stopPropagation(); toggleColumn(t.id); }}
                                    />
                                </th>
                            ))}
                            <th className="p-3 text-center border-r border-gray-600 min-w-[50px] bg-[#1a202c]">
                                All
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map(cls => (
                            <tr key={cls.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-semibold text-gray-800 bg-gray-50 sticky left-0 border-r">{cls.name}</td>
                                {testTypes.map(t => {
                                    const key = `${cls.id}-${t.id}`;
                                    const entry = assignmentMap.get(key);
                                    const isChecked = entry?.status || false;
                                    const order = entry?.test_order;

                                    return (
                                        <td key={t.id} className="p-2 border-r text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => handleCheck(cls.id, t.id, e.target.checked)}
                                                    className="w-4 h-4 accent-purple-600 cursor-pointer"
                                                />
                                                {isChecked && (
                                                    <div className="flex items-center">
                                                        <span className="text-gray-500 text-xs mr-1">(</span>
                                                        <input
                                                            type="number"
                                                            value={order || ''}
                                                            onChange={e => handleOrderChange(cls.id, t.id, parseInt(e.target.value) || 0)}
                                                            className="w-8 p-0.5 text-center border rounded text-xs no-spinner"
                                                        />
                                                        <span className="text-gray-500 text-xs ml-1">)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                                {/* Row Check All */}
                                <td className="p-2 border-r text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                        title={`Assign all tests to ${cls.name}`}
                                        onClick={(e) => { e.stopPropagation(); toggleRow(cls.id); }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {loading && <div className="p-4 text-center">Loading...</div>}
                {!loading && classes.length === 0 && <div className="p-4 text-center">No data. Please verify Academic Year and Branch selection.</div>}
            </div>

            <div className="flex justify-between items-center">
                {/* Copy Button */}
                <div className="relative" ref={copyDropdownRef}>
                    <button
                        onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                        className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 flex items-center gap-2"
                    >
                        Copy to Branches ▼
                    </button>
                    {isCopyDropdownOpen && (
                        <div className="absolute left-full top-0 ml-2 w-72 bg-white border shadow-xl rounded z-20 max-h-80 overflow-y-auto">
                            <div className="p-2 border-b font-bold bg-gray-50">Select Target Branches</div>
                            {Object.keys(branchesByLocation).map(loc => (
                                <div key={loc}>
                                    <div className="bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 uppercase">{loc}</div>
                                    {branchesByLocation[loc].map(b => {
                                        const compositeKey = `${b.name}|${b.location_name}`;
                                        return (
                                            <label key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={copyTargets.has(compositeKey)}
                                                    onChange={() => {
                                                        const s = new Set(copyTargets);
                                                        if (s.has(compositeKey)) s.delete(compositeKey);
                                                        else s.add(compositeKey);
                                                        setCopyTargets(s);
                                                    }}
                                                />
                                                <span className="text-sm">{b.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ))}
                            <div className="p-2 border-t flex justify-end">
                                <button
                                    onClick={handleCopy}
                                    disabled={copying || copyTargets.size === 0}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                    {copying ? 'Copying...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-4 justify-end">
                    <button
                        onClick={() => fetchMatrix()}
                        disabled={saving}
                        className={`px-6 py-2 rounded text-blue-700 border transition hover:bg-blue-100 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#337ab7] text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClassTestAssignment;
