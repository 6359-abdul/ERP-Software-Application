import React, { useState, useEffect } from 'react';
import api from '../api';
import { Edit, Trash2, Plus, Save, RotateCcw, AlertCircle, Check, X } from 'lucide-react';

interface GradeScaleDetail {
    id?: number;
    grade: string;
    min_marks: number;
    max_marks: number;
    description: string;
}

interface GradeScale {
    id: number;
    scale_name: string;
    scale_description: string;
    location: string;
    branch: string;
    academic_year: string;
    total_marks: number;
}

const GradeScaleManager: React.FC = () => {
    // Context State
    const [academicYear, setAcademicYear] = useState<string>('');
    const [branch, setBranch] = useState<string>('');
    const [location, setLocation] = useState<string>('Hyderabad'); // Default
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);

    // Data State
    const [scales, setScales] = useState<GradeScale[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State (Master)
    const [selectedScaleId, setSelectedScaleId] = useState<number | null>(null);
    const [scaleName, setScaleName] = useState('');
    const [totalMarks, setTotalMarks] = useState<number>(100);
    const [scaleDescription, setScaleDescription] = useState('');

    // Form State (Details)
    const [details, setDetails] = useState<GradeScaleDetail[]>([]);

    // Row Editing State
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [tempRowData, setTempRowData] = useState<GradeScaleDetail | null>(null);

    // Validation State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Load User & Context from LocalStorage/API
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const storedYear = localStorage.getItem('academicYear');
                const storedBranch = localStorage.getItem('currentBranch') || user.branch;

                // Load Academic Years
                const resYears = await api.get('/org/academic-years');
                const yearsList = resYears.data.academic_years || [];
                setAcademicYears(yearsList);

                if (storedYear) {
                    // Resolve Name vs ID
                    const y = yearsList.find((y: any) => y.name === storedYear || String(y.id) === storedYear);
                    if (y) setAcademicYear(y.name);
                    else setAcademicYear(storedYear);
                } else if (yearsList.length > 0) {
                    setAcademicYear(yearsList[0].name);
                }

                // Load Branches
                const resBranches = await api.get('/branches');
                const branchList = resBranches.data.branches || [];
                setBranches(branchList);

                // Set Branch
                if (storedBranch) {
                    // Check if it matches a name or code
                    const b = branchList.find((br: any) => br.branch_name === storedBranch || String(br.id) === storedBranch);
                    if (b) {
                        setBranch(b.branch_name);
                        setLocation(b.location_name || "Hyderabad");
                    } else {
                        setBranch(storedBranch);
                    }
                } else if (branchList.length > 0) {
                    setBranch(branchList[0].branch_name);
                }

            } catch (err) {
                console.error("Failed to load context", err);
            }
        };
        init();
    }, []);

    // --- Fetch Scales ---
    useEffect(() => {
        if (!academicYear || !branch) return;
        fetchScales();
    }, [academicYear, branch]);

    const fetchScales = async () => {
        setLoading(true);
        try {
            const res = await api.get('/grade-scales', {
                params: { academic_year: academicYear, branch: branch, location: location }
            });
            setScales(res.data);
        } catch (err) {
            console.error("Failed to fetch scales", err);
        } finally {
            setLoading(false);
        }
    };

    // --- Load Specific Scale ---
    const loadScale = async (id: number) => {
        setLoading(true);
        setError(null);
        setEditingRowIndex(null);
        setTempRowData(null);
        try {
            const res = await api.get(`/grade-scales/${id}`);
            const data = res.data;

            setSelectedScaleId(data.id);
            setScaleName(data.scale_name);
            setTotalMarks(data.total_marks || 100);
            setScaleDescription(data.scale_description || '');
            setDetails(data.details || []);

        } catch (err) {
            console.error("Failed to load scale details", err);
            setError("Failed to load scale details");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleReset = () => {
        setSelectedScaleId(null);
        setSelectedScaleId(null);
        setScaleName('');
        setTotalMarks(100);
        setScaleDescription('');
        setDetails([]);
        setError(null);
        setSuccess(null);
        setEditingRowIndex(null);
        setTempRowData(null);
    };

    const handleAddDetailRow = () => {
        const newRow = { grade: '', min_marks: 0, max_marks: 0, description: '' };
        // Add to list and immediately start editing it
        const newDetails = [...details, newRow];
        setDetails(newDetails);

        // Start editing the new last row
        setEditingRowIndex(newDetails.length - 1);
        setTempRowData(newRow);
    };

    // Start Editing a Row
    const handleStartEdit = (index: number) => {
        // If already editing another row, maybe warn or auto-cancel? For now, nice switch.
        setEditingRowIndex(index);
        setTempRowData({ ...details[index] });
    };

    // Cancel Edit
    const handleCancelEdit = () => {
        // If the row was empty/new (brand new add), maybe remove it?
        // Logic: If we added a row and cancelled immediately, user might expect it to disappear if it was blank.
        // But for simplicity, we just revert to original state handling.
        // If it was a new row (no ID?) and completely empty, we could pop it.
        // Let's just reset state.

        // However, if we just added a row (useEffect logic missing), it might remain as blank in table.
        // Let's check if the currently editing row is "empty" (blank grade) and at the end? 
        // Or just leave it. Leaving it is safer UI behavior to avoid magic deletions.

        setEditingRowIndex(null);
        setTempRowData(null);
    };

    // Save Edit (Local State Save)
    const handleSaveEdit = () => {
        if (editingRowIndex === null || !tempRowData) return;

        // Basic Inline Validation
        if (!tempRowData.grade.trim()) {
            alert("Grade cannot be empty");
            return;
        }
        if (Number(tempRowData.min_marks) > Number(tempRowData.max_marks)) {
            alert("Min marks cannot be greater than Max marks");
            return;
        }
        if (Number(tempRowData.max_marks) > Number(totalMarks)) {
            alert(`Max marks cannot exceed Total Marks (${totalMarks})`);
            return;
        }

        const newDetails = [...details];
        newDetails[editingRowIndex] = tempRowData;
        setDetails(newDetails);

        setEditingRowIndex(null);
        setTempRowData(null);
    };

    const handleTempChange = (field: keyof GradeScaleDetail, value: any) => {
        if (!tempRowData) return;
        setTempRowData({ ...tempRowData, [field]: value });
    };

    const handleRemoveDetailRow = (index: number) => {
        if (editingRowIndex === index) {
            handleCancelEdit();
        }
        const newDetails = [...details];
        newDetails.splice(index, 1);
        setDetails(newDetails);

        // Adjust editing index if needed
        if (editingRowIndex !== null && editingRowIndex > index) {
            setEditingRowIndex(editingRowIndex - 1);
        }
    };

    const handleSave = async () => {
        if (!scaleName.trim()) {
            setError("Scale Name is required");
            return;
        }
        if (!academicYear || !branch) {
            setError("Context (Academic Year/Branch) is missing");
            return;
        }

        if (editingRowIndex !== null) {
            setError("Please save or cancel the currently editing row first.");
            return;
        }

        // Validate Details
        for (const d of details) {
            if (!d.grade.trim()) {
                setError("All rows must have a Grade defined");
                return;
            }
            if (d.min_marks < 0 || d.max_marks < 0) {
                setError("Marks cannot be negative");
                return;
            }
            if (Number(d.min_marks) > Number(d.max_marks)) {
                setError(`Min marks cannot be greater than Max marks for grade ${d.grade}`);
                return;
            }
            if (Number(d.max_marks) > Number(totalMarks)) {
                setError(`Max marks for grade ${d.grade} cannot exceed Total Marks (${totalMarks})`);
                return;
            }
        }

        // Check for overlap (simple check)
        // Sort by min
        const sorted = [...details].sort((a, b) => Number(a.min_marks) - Number(b.min_marks));
        for (let i = 0; i < sorted.length - 1; i++) {
            if (Number(sorted[i].max_marks) >= Number(sorted[i + 1].min_marks)) {
                setError(`Overlapping range detected between ${sorted[i].grade} and ${sorted[i + 1].grade}`);
                return;
            }
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        const payload = {
            scale_name: scaleName,
            scale_description: scaleDescription,
            location: location,
            branch: branch,
            academic_year: academicYear,
            total_marks: totalMarks,
            details: details
        };

        try {
            if (selectedScaleId) {
                // Update
                await api.put(`/grade-scales/${selectedScaleId}`, payload);
                setSuccess("Grade Scale updated successfully");
            } else {
                // Create
                await api.post('/grade-scales', payload);
                setSuccess("Grade Scale created successfully");
                handleReset(); // Reset form for new entry or keep? Usually reset.
            }
            fetchScales(); // Refresh list
        } catch (err: any) {
            console.error("Save failed", err);
            setError(err.response?.data?.error || "Failed to save Grade Scale");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this Grade Scale?")) return;

        setLoading(true);
        try {
            await api.delete(`/grade-scales/${id}`);
            setSuccess("Grade Scale deleted successfully");
            if (selectedScaleId === id) {
                handleReset();
            }
            fetchScales();
        } catch (err: any) {
            console.error("Delete failed", err);
            setError(err.response?.data?.error || "Failed to delete Grade Scale");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Context Header */}
            <div className="bg-blue-50 p-4 rounded border border-blue-100 flex justify-between items-center text-sm text-blue-800">
                <div className="flex gap-6">
                    <span><strong>Academic Year:</strong> {academicYear || 'Loading...'}</span>
                    {/* Branch is still relevant for user context, but Scale is Location Wide */}
                    <span><strong>User Branch:</strong> {branch || 'Loading...'}</span>
                    <span className="bg-blue-200 px-2 py-0.5 rounded text-blue-900 font-bold">Scope: {location} (All Branches)</span>
                </div>
                <div>
                    {!academicYear || !branch ? <span className="text-red-500 font-bold">Context Missing! Check Header.</span> : null}
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start h-full">

                {/* Left Panel: Master Form & List */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">

                    {/* Form */}
                    <div className="bg-white p-5 rounded shadow border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                Grade Scale Master
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Scale Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter Scale Name"
                                    value={scaleName}
                                    onChange={e => setScaleName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 100"
                                    value={totalMarks}
                                    onChange={e => setTotalMarks(Number(e.target.value))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Scale Description</label>
                                <textarea
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                    placeholder="Enter Description"
                                    value={scaleDescription}
                                    onChange={e => setScaleDescription(e.target.value)}
                                />
                            </div>

                            {error && (
                                <div className="p-2 bg-red-50 text-red-600 text-sm rounded flex items-center gap-2">
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-2 bg-green-50 text-green-600 text-sm rounded">
                                    {success}
                                </div>
                            )}

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-[#337ab7] text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600 flex items-center gap-2"
                                >
                                    <Save size={16} /> {selectedScaleId ? "Update" : "Save"}
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 border flex items-center gap-2"
                                >
                                    <RotateCcw size={16} /> Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="bg-white p-5 rounded shadow border flex-1">
                        <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Grade Scale List</h3>

                        <div className="overflow-auto max-h-[400px]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-2 text-left">Scale Name</th>
                                        <th className="p-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scales.length === 0 ? (
                                        <tr><td colSpan={2} className="p-4 text-center text-gray-500">No scales found.</td></tr>
                                    ) : (
                                        scales.map(s => (
                                            <tr key={s.id} className={`border-b hover:bg-gray-50 ${selectedScaleId === s.id ? 'bg-blue-50' : ''}`}>
                                                <td className="p-2 font-medium">{s.scale_name}</td>
                                                <td className="p-2 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => loadScale(s.id)}
                                                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(s.id)}
                                                        className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Right Panel: Details Table */}
                <div className="w-full md:w-2/3">
                    <div className="bg-white p-5 rounded shadow border min-h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-2 h-6 bg-gray-600 rounded-sm"></span>
                                {selectedScaleId ? scaleName : 'Grade Scale Details'}
                                {selectedScaleId && <span className="text-sm text-gray-500 font-normal ml-2">(Total Marks: {totalMarks})</span>}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddDetailRow}
                                    className={`p-1 text-white rounded ${selectedScaleId ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'}`}
                                    title={selectedScaleId ? "Add Row" : "Select a scale to add rows"}
                                    disabled={!selectedScaleId}
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                    <tr>
                                        <th className="p-3 text-center w-16">S.No</th>
                                        <th className="p-3 text-center w-24">Grade</th>
                                        <th className="p-3 text-center w-24">Min</th>
                                        <th className="p-3 text-center w-24">Maximum</th>
                                        <th className="p-3 text-left">Description</th>
                                        <th className="p-3 text-center w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                                {!selectedScaleId
                                                    ? "Please select/edit a Grade Scale from the list to manage details."
                                                    : "No grades added yet. Click + to add."}
                                            </td>
                                        </tr>
                                    ) : (
                                        details.map((row, idx) => {
                                            const isEditing = editingRowIndex === idx;
                                            const currentData = isEditing && tempRowData ? tempRowData : row;

                                            return (
                                                <tr key={idx} className={`border-b hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>
                                                    <td className="p-2 text-center text-gray-500">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                className="border p-1 rounded w-16 text-center uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                                                                value={currentData.grade}
                                                                onChange={e => handleTempChange('grade', e.target.value)}
                                                                placeholder="A1"
                                                            />
                                                        ) : (
                                                            <span className="font-medium text-gray-700">{row.grade}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="border p-1 rounded w-20 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                value={currentData.min_marks}
                                                                onChange={e => handleTempChange('min_marks', e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-600">{row.min_marks}</span>
                                                        )}

                                                    </td>
                                                    <td className="p-2 text-center">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="border p-1 rounded w-20 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                value={currentData.max_marks}
                                                                onChange={e => handleTempChange('max_marks', e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-600">{row.max_marks}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-left">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                className="border p-1 rounded w-full text-left focus:ring-2 focus:ring-blue-500 outline-none"
                                                                value={currentData.description || ''}
                                                                onChange={e => handleTempChange('description', e.target.value)}
                                                                placeholder="Grade Description"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-600">{row.description}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-center flex justify-center gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={handleSaveEdit}
                                                                    className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                                                    title="Save Changes"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                                    title="Cancel Changes"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStartEdit(idx)}
                                                                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                                                    title="Edit Row"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveDetailRow(idx)}
                                                                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                                                                    title="Remove Row"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default GradeScaleManager;
