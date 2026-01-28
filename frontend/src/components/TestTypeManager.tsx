import React, { useState, useEffect } from 'react';
import { Pencil, ArrowUp, ArrowDown, Plus, ToggleLeft, ToggleRight, X, Save } from 'lucide-react';
import api from '../api';

interface TestType {
    id: number;
    test_name: string;
    max_marks: number;
    display_order?: number;
    is_active: boolean;
    academic_year: string;
}

const TestTypeManager: React.FC = () => {
    // --- State ---
    const [testTypes, setTestTypes] = useState<TestType[]>([]);
    const [loading, setLoading] = useState(false);

    // Context Filters
    const [academicYear, setAcademicYear] = useState(localStorage.getItem('academicYear') || '');
    const [branch, setBranch] = useState(localStorage.getItem('currentBranch') || 'All');
    const [location, setLocation] = useState(localStorage.getItem('currentLocation') || 'Hyderabad');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<TestType>>({
        test_name: '',
        max_marks: 50,
        display_order: undefined
    });

    // --- Effects ---
    useEffect(() => {
        // Handle User Role / Context initialization similar to ClassFeeStructure if needed
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'Admin' && user.branch) {
            setBranch(user.branch);
        }
        if (user.location) {
            setLocation(user.location);
        }
    }, []);

    // Initialize Academic Year
    useEffect(() => {
        const initializeAcademicYear = async () => {
            const storedYear = localStorage.getItem('academicYear');
            try {
                const resYears = await api.get("/org/academic-years");
                const yearsList = resYears.data.academic_years || [];

                if (storedYear) {
                    const foundYear = yearsList.find((y: any) => y.name === storedYear);
                    if (foundYear) {
                        setAcademicYear(foundYear.name);
                    } else if (yearsList.length > 0) {
                        setAcademicYear(yearsList[0].name);
                    }
                } else if (yearsList.length > 0) {
                    setAcademicYear(yearsList[0].name);
                }
            } catch (err) {
                console.error("Failed to fetch academic years", err);
                // Fallback: If no API, use stored or empty. 
                // We rely on backend validation or user to fix config.
            }
        };

        initializeAcademicYear();
    }, []);

    useEffect(() => {
        if (academicYear) {
            fetchTestTypes();
        }
    }, [academicYear]);

    // --- Actions ---
    const fetchTestTypes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/test-types/', {
                params: {
                    academic_year: academicYear
                }
            });
            setTestTypes(res.data);
        } catch (error: any) {
            console.error("Failed to fetch test types", error);
            const msg = error.response?.data?.error || error.message || "Unknown error";
            const status = error.response?.status ? ` (${error.response.status})` : "";
            alert(`Failed to fetch test types${status}: ${msg}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...formData,
                academic_year: academicYear
            };

            if (editingId) {
                await api.put(`/test-types/${editingId}`, payload);
            } else {
                // If creating, display_order handled by backend if 0 or null? 
                // We initialized display_order to 0. 
                // Let's pass null if we want backend to decide, or let user edit.
                // If user didn't touch it, maybe send null?
                // The Modal will show suggested order.
                await api.post('/test-types/', payload);
            }
            setShowModal(false);
            fetchTestTypes();
        } catch (error: any) {
            console.error("Save error:", error);
            const msg = error.response?.data?.error || error.message || "Failed to save";
            alert(`Error: ${msg}`);
        }
    };



    const toggleStatus = async (id: number) => {
        try {
            await api.patch(`/test-types/${id}/status`);
            fetchTestTypes();
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    const openAddModal = () => {
        setFormData({
            test_name: '',
            max_marks: 50,
            display_order: undefined
        });
        setEditingId(null);
        setShowModal(true);
    };

    const openEditModal = (t: TestType) => {
        setFormData({
            test_name: t.test_name,
            max_marks: t.max_marks,
            display_order: t.display_order
        });
        setEditingId(t.id);
        setShowModal(true);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create-TestType
                </h2>
                <button
                    onClick={openAddModal}
                    disabled={!academicYear}
                    className="flex items-center gap-2 bg-[#337ab7] text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
                >
                    <Plus size={18} /> Add Test Type
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded shadow-sm border">
                <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Academic Year</label>
                    <div className="px-3 py-2 bg-gray-100 rounded text-gray-700 border min-w-[150px]">
                        {academicYear}
                    </div>
                </div>
                <div>
                    {/* Branch and Location are no longer used for filtering tests */}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow text-sm">
                <div className="grid grid-cols-12 bg-gray-100 p-3 font-semibold text-gray-700 border-b">
                    <div className="col-span-1 text-center">Order</div>
                    <div className="col-span-5">Test Name</div>
                    <div className="col-span-3 text-center">Max Marks (Ref)</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-1 text-center">Actions</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : testTypes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No test types found. Add one to get started.</div>
                ) : (
                    testTypes.map((t, idx) => (
                        <div key={t.id} className="grid grid-cols-12 p-3 border-b hover:bg-gray-50 items-center">
                            <div className="col-span-1 text-center font-mono bg-gray-100 rounded mx-2 py-1">
                                {t.display_order ?? idx + 1}
                            </div>
                            <div className="col-span-5 font-medium text-gray-800">
                                {t.test_name}
                            </div>
                            <div className="col-span-3 text-center text-gray-600">
                                {t.max_marks}
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <button
                                    onClick={() => toggleStatus(t.id)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                                >
                                    {t.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                    {t.is_active ? 'Active' : 'Inactive'}
                                </button>
                            </div>
                            <div className="col-span-1 flex justify-center gap-2">
                                <button onClick={() => openEditModal(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                    <Pencil size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">
                                {editingId ? 'Edit Test Type' : 'Add Test Type'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
                                <input
                                    type="text"
                                    value={formData.test_name}
                                    onChange={e => setFormData({ ...formData, test_name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Unit Test 1"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks (Ref) *</label>
                                    <input
                                        type="number"
                                        value={formData.max_marks}
                                        onChange={e => setFormData({ ...formData, max_marks: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                <input
                                    type="number"
                                    value={formData.display_order ?? ''}
                                    onChange={e => setFormData({ ...formData, display_order: e.target.value ? parseInt(e.target.value) : undefined })}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Auto"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave empty for auto-increment</p>
                            </div>

                            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                                <p><strong>Context:</strong> {academicYear} (Global)</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.test_name}
                                className="px-4 py-2 bg-[#337ab7] text-white rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16} /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestTypeManager;
