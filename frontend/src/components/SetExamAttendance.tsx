import React, { useState, useEffect } from 'react';
import { Calendar, Save, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api';

interface TestType {
    id: number;
    test_name: string;
    is_active: boolean;
}

interface MonthOption {
    name: string;
    month: number;
    year: number;
    key: string;
}

interface ClassOption {
    id: number;
    class_name: string;
}

interface Branch {
    branch_code: string;
    branch_name: string;
}


const SetExamAttendance: React.FC = () => {
    // --- Context State ---
    const [academicYear, setAcademicYear] = useState(localStorage.getItem('academicYear') || '');
    const [userRole, setUserRole] = useState('');
    const [userBranch, setUserBranch] = useState('');

    // --- Selection State ---
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');

    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClass, setSelectedClass] = useState('');

    const [testTypes, setTestTypes] = useState<TestType[]>([]);
    const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

    // --- Data Loading State ---
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [loadingTests, setLoadingTests] = useState(false);

    // --- Mapping State ---
    const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
    const [loadingMapping, setLoadingMapping] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- Init ---
    // --- Init ---
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
            setUserBranch(user.branch);

            if (user.role === 'Admin' || user.branch === 'All' || user.branch === 'AllBranches') {
                fetchBranches().then((fetchedBranches) => {
                    // Auto-select current branch from localStorage if available and valid
                    const current = localStorage.getItem('currentBranch');

                    if (current && current !== 'All' && current !== 'All Locations' && fetchedBranches) {
                        // Check if 'current' matches a branch_code OR branch_name
                        const matched = fetchedBranches.find((b: Branch) => b.branch_code === current || b.branch_name === current);
                        if (matched) {
                            setSelectedBranch(matched.branch_code);
                        } else if (fetchedBranches.length > 0) {
                            setSelectedBranch(fetchedBranches[0].branch_code);
                        }
                    } else if (fetchedBranches && fetchedBranches.length > 0) {
                        setSelectedBranch(fetchedBranches[0].branch_code);
                    }
                });
            } else {
                setSelectedBranch(user.branch);
                setBranches([{ branch_code: user.branch, branch_name: user.branch }]);
            }
        }
    }, []);

    useEffect(() => {
        // Generate months for 2 full calendar years (Start & End year of academic year)
        // e.g. 2025-2026 => Jan 2025 to Dec 2026
        if (academicYear) {
            const [startYearStr, endYearStr] = academicYear.split('-');
            const startYear = parseInt(startYearStr);
            const endYear = parseInt(endYearStr);

            if (!isNaN(startYear) && !isNaN(endYear)) {
                const m: MonthOption[] = [];
                const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                // Full Start Year (2025)
                for (let i = 1; i <= 12; i++) {
                    m.push({ name: monthNames[i], month: i, year: startYear, key: `${i}-${startYear}` });
                }

                // Full End Year (2026)
                for (let i = 1; i <= 12; i++) {
                    m.push({ name: monthNames[i], month: i, year: endYear, key: `${i}-${endYear}` });
                }
                setAvailableMonths(m);
            }
        }
    }, [academicYear]);

    useEffect(() => {
        if (selectedBranch) {
            fetchClasses();
            // Clear class and test selection when branch changes
            setSelectedClass('');
            setTestTypes([]);
            setSelectedTestId(null);
        } else {
            setClasses([]);
            setTestTypes([]);
            setSelectedClass('');
        }
    }, [selectedBranch, academicYear]);

    useEffect(() => {
        if (selectedBranch && selectedClass) {
            fetchTestsForClass();
            setSelectedTestId(null);
        } else {
            setTestTypes([]);
            setSelectedTestId(null);
        }
    }, [selectedBranch, selectedClass, academicYear]);

    useEffect(() => {
        if (selectedTestId && selectedBranch && selectedClass) {
            fetchMapping();
        } else {
            setSelectedMonths(new Set());
        }
    }, [selectedTestId, selectedBranch, selectedClass]);

    // --- Actions ---
    const fetchBranches = async () => {
        setLoadingBranches(true);
        try {
            const res = await api.get('/branches');
            const b = res.data.branches || [];
            setBranches(b);
            return b;
        } catch (error) {
            console.error("Failed to fetch branches", error);
            return [];
        } finally {
            setLoadingBranches(false);
        }
    };

    const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
            const res = await api.get('/classes', { params: { branch: selectedBranch } });
            setClasses(res.data.classes || []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        } finally {
            setLoadingClasses(false);
        }
    };

    const fetchTestsForClass = async () => {
        setLoadingTests(true);
        try {
            // Use the specific endpoint that checks ClassTest assignments
            const res = await api.get('/class-tests/list', {
                params: {
                    academic_year: academicYear,
                    branch: selectedBranch,
                    class_id: selectedClass
                }
            });
            // Result is list of { test_id, test_name, ... }
            // Ensure unique tests if multiple entries (though unique constraint should prevent it)
            const uniqueTests = Array.from(new Map(res.data.map((item: any) => [item.test_id, item])).values());

            // Map to TestType interface
            const mappedTests: TestType[] = uniqueTests.map((t: any) => ({
                id: t.test_id, // ensure ID matches
                test_name: t.test_name,
                is_active: true // Assumed active if assigned
            }));

            setTestTypes(mappedTests);
        } catch (error) {
            console.error("Failed to fetch class tests", error);
            setTestTypes([]);
        } finally {
            setLoadingTests(false);
        }
    };

    const fetchMapping = async () => {
        if (!selectedTestId || !selectedBranch || !selectedClass) return;

        setLoadingMapping(true);
        setMessage(null);
        try {
            const res = await api.get('/test-attendance', {
                params: {
                    test_id: selectedTestId,
                    academic_year: academicYear,
                    branch: selectedBranch,
                    class_id: selectedClass // This is class ID
                }
            });
            const loaded = new Set<string>();
            res.data.forEach((m: any) => {
                loaded.add(`${m.month}-${m.year}`);
            });
            setSelectedMonths(loaded);
        } catch (error) {
            console.error("Failed to fetch mapping", error);
            setMessage({ type: 'error', text: "Failed to load existing attendance settings." });
        } finally {
            setLoadingMapping(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTestId || !selectedBranch || !selectedClass) return;

        setSaving(true);
        setMessage(null);

        try {
            const monthsPayload = Array.from(selectedMonths).map(key => {
                const [month, year] = key.split('-').map(Number);
                return { month, year };
            });

            await api.post('/test-attendance', {
                test_id: selectedTestId,
                academic_year: academicYear,
                branch: selectedBranch,
                class_id: selectedClass,
                months: monthsPayload
            });

            setMessage({ type: 'success', text: "Attendance settings saved successfully!" });
        } catch (error: any) {
            console.error("Save error", error);
            setMessage({ type: 'error', text: error.response?.data?.error || "Failed to save settings." });
        } finally {
            setSaving(false);
        }
    };

    const toggleMonth = (key: string) => {
        const newSet = new Set(selectedMonths);

        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            if (newSet.size >= 12) {
                alert("You cannot select more than 12 months.");
                return;
            }
            newSet.add(key);
        }
        setSelectedMonths(newSet);
    };

    const toggleAll = () => {
        // "Select All" logic with 12 months limit is tricky. 
        // For now, let's just make it "Deselect All" if not empty
        if (selectedMonths.size > 0) {
            setSelectedMonths(new Set());
        } else {
            setMessage({ type: 'error', text: 'Please manually select the months (Max 12).' });
        }
    };

    const renderYearSection = (year: number) => {
        const yearMonths = availableMonths.filter(m => m.year === year);
        if (yearMonths.length === 0) return null;

        return (
            <div className="mb-6">
                <h4 className="font-bold text-gray-700 mb-3 border-b pb-1">{year}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {yearMonths.map(m => (
                        <label
                            key={m.key}
                            className={`
                                flex items-center gap-3 p-3 rounded border cursor-pointer transition-all
                                ${selectedMonths.has(m.key)
                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                    : 'hover:bg-gray-50 border-gray-200'}
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={selectedMonths.has(m.key)}
                                onChange={() => toggleMonth(m.key)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-medium text-gray-800">{m.name}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-[#337ab7]" />
                Set Exam Attendance
            </h2>

            {/* Config Area */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Academic Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                        <div className="p-2 bg-gray-100 rounded border text-gray-700 font-medium">
                            {academicYear}
                        </div>
                    </div>

                    {/* Branch Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <select
                            value={selectedBranch}
                            disabled={true}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                setSelectedClass(''); // Reset class on branch change
                            }}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Select Branch --</option>
                            {branches.map(b => (
                                <option key={b.branch_code} value={b.branch_code}>{b.branch_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Class Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={!selectedBranch || loadingClasses}
                        >
                            <option value="">-- Select Class --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.class_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Test Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                        <select
                            value={selectedTestId || ''}
                            onChange={(e) => setSelectedTestId(Number(e.target.value) || null)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={loadingTests}
                        >
                            <option value="">-- Select Exam --</option>
                            {testTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.test_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm mb-6 flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5" />
                    <p>
                        Select the months that should be considered for attendance calculation for this specific <strong>Class & Exam</strong>.
                        <br />
                        Allowed range: <strong>Jan 2025 - Dec 2026</strong>. Max selection: <strong>12 months</strong>.
                    </p>
                </div>

                {/* Months Selection */}
                {selectedTestId && selectedBranch && selectedClass && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-gray-700">Attendance Months ({selectedMonths.size}/12)</h3>
                            <button
                                onClick={toggleAll}
                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                                Clear Selection
                            </button>
                        </div>

                        {loadingMapping ? (
                            <div className="py-8 text-center text-gray-500">Loading settings...</div>
                        ) : (
                            <div>
                                {academicYear.split('-').map(yearStr => {
                                    const year = parseInt(yearStr);
                                    return !isNaN(year) ? renderYearSection(year) : null;
                                })}
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-8 flex items-center justify-between border-t pt-4">
                            <div>
                                {message && (
                                    <span className={`text-sm flex items-center gap-1 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                                        {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                        {message.text}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving || loadingMapping || selectedMonths.size === 0}
                                className="bg-[#337ab7] text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                            >
                                {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                            </button>
                        </div>
                    </div>
                )}

                {(!selectedTestId || !selectedBranch || !selectedClass) && (
                    <div className="text-center py-10 text-gray-400">
                        Please select Branch, Class, and Exam to configure attendance.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SetExamAttendance;
