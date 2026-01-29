import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

interface FeeType {
    id?: number;
    fee_type: string;
    category: string;
    fee_type_group: string;
    type: string;
    display_name: string;
    is_refundable: boolean;
    description?: string;
    branch?: string;
    academic_year?: string;
}

interface BranchOption {
    id: number | string;
    name: string;
    location_name: string;
}

const FeeTypeManagement: React.FC = () => {
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<FeeType>({
        fee_type: '',
        category: '',
        fee_type_group: '',
        type: 'Installment',
        display_name: '',
        is_refundable: false,
        description: '',
        branch: 'All',
        academic_year: localStorage.getItem('academicYear') || ''
    });
    const [editingId, setEditingId] = useState<number | null>(null);

    // Copy Feature State
    const [allBranches, setAllBranches] = useState<BranchOption[]>([]);
    const [sourceBranchId, setSourceBranchId] = useState<string | number>('');
    const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const [copying, setCopying] = useState(false);
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

    // Fetch fee types on component mount
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        let globalBranch = localStorage.getItem('currentBranch') || 'All';

        // HARDEN: If not admin, force user branch logic
        if (user.role !== 'Admin' && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
            globalBranch = user.branch;
        }

        setFormData(prev => ({ ...prev, branch: globalBranch }));
        fetchFeeTypes();

        // Fetch Branches for Copy Logic
        if (globalBranch && globalBranch !== 'All' && globalBranch !== 'All Branches') {
            api.get('/branches').then(res => {
                const branchList = res.data.branches || res.data || [];
                const mappedBranches = branchList.map((b: any) => ({
                    id: b.id,
                    name: b.branch_name,
                    location_name: b.location_name || 'Unknown Location'
                }));
                setAllBranches(mappedBranches);

                const b = branchList.find((br: any) => br.branch_name.toLowerCase() === globalBranch.toLowerCase());
                if (b) {
                    setSourceBranchId(b.id);
                }
            }).catch(err => console.error("Error fetching branches:", err));
        }

    }, []);

    // ... (keep existing functions fetchFeeTypes, handleInputChange, handleSubmit, handleEdit, handleDelete, resetForm)
    const fetchFeeTypes = async () => {
        try {
            const response = await api.get('/fee-types');
            const data = response.data;
            const allTypes = Array.isArray(data) ? data : data.fee_types || [];

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            let globalBranch = localStorage.getItem('currentBranch') || 'All';

            if (user.role !== 'Admin' && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
                globalBranch = user.branch;
            }

            const filtered = globalBranch === 'All' || globalBranch === 'All Branches'
                ? allTypes
                : allTypes.filter((ft: FeeType) => !ft.branch || ft.branch === 'All' || ft.branch === globalBranch);

            setFeeTypes(filtered);
        } catch (error) {
            console.error('Error fetching fee types:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            let globalBranch = localStorage.getItem('currentBranch') || 'All';

            if (user.role !== 'Admin' && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
                globalBranch = user.branch;
            }

            const payload = { ...formData, branch: formData.branch || globalBranch || 'All' };

            if (editingId) {
                await api.put(`/fee-types/${editingId}`, payload);
            } else {
                await api.post('/fee-types', payload);
            }

            resetForm();
            fetchFeeTypes();
        } catch (error) {
            console.error('Error saving fee type:', error);
            alert('Error saving fee type. Please try again.');
        }
    };

    const handleEdit = (feeType: FeeType) => {
        setFormData(feeType);
        setEditingId(feeType.id || null);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this fee type?')) {
            try {
                await api.delete(`/fee-types/${id}`);
                fetchFeeTypes();
            } catch (error) {
                console.error('Error deleting fee type:', error);
                alert('Error deleting fee type. Please try again.');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            fee_type: '',
            category: '',
            fee_type_group: '',
            type: 'Installment',
            display_name: '',
            is_refundable: false,
            description: '',
            branch: localStorage.getItem('currentBranch') || 'All',
            academic_year: localStorage.getItem('academicYear') || ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    // Copy Logic
    const toggleCopyTarget = (branchId: string) => {
        const newTargets = new Set(copyTargets);
        if (newTargets.has(branchId)) {
            newTargets.delete(branchId);
        } else {
            newTargets.add(branchId);
        }
        setCopyTargets(newTargets);
    };

    const handleCopy = async () => {
        if (copyTargets.size === 0) {
            alert("Please select at least one branch to copy to.");
            return;
        }

        if (!confirm(`Are you sure you want to copy Fee Types to ${copyTargets.size} branches?`)) {
            return;
        }

        setCopying(true);
        try {
            await api.post("/fees/copy-fee-types", {
                source_branch_id: sourceBranchId,
                target_branch_ids: Array.from(copyTargets),
                academic_year: localStorage.getItem('academicYear') || ''
            });
            alert("Fee Types copied successfully!");
            setCopyTargets(new Set());
            setIsCopyDropdownOpen(false);
        } catch (error: any) {
            console.error("Copy failed", error);
            alert(error.response?.data?.error || "Failed to copy fee types.");
        } finally {
            setCopying(false);
        }
    };

    // Group Branches
    const availableBranches = allBranches.filter(b => String(b.id) !== String(sourceBranchId) && b.name !== 'All Branches' && b.name !== 'All');
    const branchesByLocation: { [key: string]: BranchOption[] } = {};
    availableBranches.forEach(b => {
        if (!branchesByLocation[b.location_name]) {
            branchesByLocation[b.location_name] = [];
        }
        branchesByLocation[b.location_name].push(b);
    });

    const currentBranch = localStorage.getItem('currentBranch');
    const isSpecificBranch = currentBranch && currentBranch !== 'All' && currentBranch !== 'All Branches';

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">Fee Types</h2>
                    <div className="flex gap-2">
                        {/* Copy Button */}
                        {isSpecificBranch && (
                            <div className="relative" ref={copyDropdownRef}>
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                                    onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                                >
                                    <span>Copy to Branches</span>
                                    <span className="text-xs">▼</span>
                                </button>
                                {isCopyDropdownOpen && (
                                    <div className="absolute top-12 right-0 w-80 bg-white border shadow-xl rounded z-50 p-2 max-h-96 overflow-y-auto">
                                        <div className="mb-2 text-sm font-semibold text-gray-700 pb-2 border-b">
                                            Select Target Branches
                                        </div>
                                        {Object.keys(branchesByLocation).length === 0 ? (
                                            <div className="text-gray-500 text-sm p-4 text-center">No other branches available</div>
                                        ) : (
                                            Object.keys(branchesByLocation).map(loc => (
                                                <div key={loc} className="mb-1">
                                                    <div className="text-sm font-bold text-gray-900 px-3 py-2 bg-gray-50 border-b border-gray-100">
                                                        {loc}
                                                    </div>
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

                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
                        >
                            <span>⊕</span> Add New Fee Type
                        </button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {editingId ? 'Edit Fee Type' : 'Add New Fee Type'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Fee Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fee Type <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fee_type"
                                    value={formData.fee_type}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="e.g., Transport Fee"
                                />
                            </div>

                            {/* Fee Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fee Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="">Select Fee category</option>
                                    <option value="Academic">Academic</option>
                                    <option value="Tuition">Tuition</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Hostel">Hostel</option>
                                    <option value="Library">Library</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Examination">Examination</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>


                            {/* Branch Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Branch
                                </label>
                                <input
                                    type="text"
                                    name="branch"
                                    value={formData.branch}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                                />
                            </div>

                            {/* Academic Year Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Academic Year
                                </label>
                                <input
                                    type="text"
                                    name="academic_year"
                                    value={formData.academic_year}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                                />
                            </div>

                            {/* Fee Type Group */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fee Type Group
                                </label>
                                <select
                                    name="fee_type_group"
                                    value={formData.fee_type_group}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="">Select Fee Type Group</option>
                                    <option value="Standard">Standard</option>
                                    <option value="Special">Special</option>
                                    <option value="Optional">Optional</option>
                                </select>
                            </div>

                            {/* Display Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    name="display_name"
                                    value={formData.display_name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    placeholder="Display name for receipts"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Type
                                </label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="Installment">Installment</option>
                                    <option value="One-Time">One-Time</option>
                                </select>
                            </div>
                        </div>

                        {/* Is Fee Refundable Checkbox */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="is_refundable"
                                id="is_refundable"
                                checked={formData.is_refundable}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                            />
                            <label htmlFor="is_refundable" className="ml-2 text-sm text-gray-700">
                                Is Fee Refundable?
                            </label>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Optional description"
                            />
                        </div>

                        {/* Form Buttons */}
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
                            >
                                ✓ Save Fee Type
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Fee Types Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fee Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Branch
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fee Type Group
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Display Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fee Refundable
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {feeTypes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                        No fee types found. Click "Add New Fee Type" to create one.
                                    </td>
                                </tr>
                            ) : (
                                feeTypes.map((feeType) => (
                                    <tr key={feeType.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {feeType.fee_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-1 rounded-full text-xs ${!feeType.branch || feeType.branch === 'All'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {feeType.branch || 'All'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {feeType.category || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {feeType.fee_type_group || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                {feeType.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {feeType.display_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 py-1 rounded-full text-xs ${feeType.is_refundable
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {feeType.is_refundable ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(feeType)}
                                                    className="text-blue-600 hover:text-blue-900 px-3 py-1 bg-blue-50 rounded"
                                                >
                                                    ✎ Edit
                                                </button>
                                                <button
                                                    onClick={() => feeType.id && handleDelete(feeType.id)}
                                                    className="text-red-600 hover:text-red-900 px-3 py-1 bg-red-50 rounded"
                                                >
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FeeTypeManagement;
