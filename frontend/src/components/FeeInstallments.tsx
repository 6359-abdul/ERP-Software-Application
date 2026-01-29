
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

interface FeeType {
    id: number;
    fee_type: string;
    type: string;
    branch?: string;
}
 
interface Installment {
    id?: number;
    installment_no: number;
    title: string;
    start_date: string;
    end_date: string;
    last_pay_date: string;
    is_admission: boolean;
    description?: string;
    fee_type_id?: number | null;
    fee_type_name?: string;
    branch?: string;
    location?: string;
    academic_year?: string;
}

interface BranchOption {
    id: number | string;
    name: string;
    location_name: string;
}

const FeeInstallments: React.FC = () => {
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [academicYearOptions, setAcademicYearOptions] = useState<string[]>([]);
    const [formData, setFormData] = useState<Installment>({
        installment_no: 1,
        title: '',
        start_date: '',
        end_date: '',
        last_pay_date: '',
        is_admission: false,
        description: '',
        fee_type_id: null,
        branch: '',
        location: '',
        academic_year: ''
    });

    // Bulk Generation State
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkConfig, setBulkConfig] = useState({
        fee_type_id: '',
        count: 12,
        start_month_idx: 1, // May (0=April, 1=May in our list)
        year: new Date().getFullYear() + 1, // Next year usually
        start_installment_no: 3,
        branch: '',
        location: '',
        academic_year: ''
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const MONTHS = ["April", "May", "June", "July", "August", "September",
        "October", "November", "December", "January", "February", "March"];

    const [selectedLocation, setSelectedLocation] = useState('All');

    // Copy Feature State
    const [allBranches, setAllBranches] = useState<BranchOption[]>([]);
    const [sourceBranchId, setSourceBranchId] = useState<string | number>('');
    const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set());
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const [copying, setCopying] = useState(false);
    const [selectedCopyFeeTypeId, setSelectedCopyFeeTypeId] = useState<number | string>('');
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

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isAdminUser = user.role === 'Admin';
        setIsAdmin(isAdminUser);

        // Initialize form data defaults
        let globalBranch = localStorage.getItem('currentBranch') || 'All';

        // HARDEN: If not admin, force user branch
        if (!isAdminUser && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
            globalBranch = user.branch;
        }

        const storedLocation = localStorage.getItem('currentLocation');
        // user already parsed above
        const initialLocation = user.location || 'Hyderabad';

        // If All Branches, default to All Locations (or 'All') for the view
        const isGlobal = globalBranch === 'All' || globalBranch === 'All Branches';
        let viewLoc = 'All';

        if (isGlobal) {
            // Check if we have a specific global location filter
            if (storedLocation && storedLocation !== 'All') {
                viewLoc = storedLocation;
            } else {
                viewLoc = 'All';
            }
        } else {
            viewLoc = initialLocation; // Default for now, resolved below
        }

        setSelectedLocation(viewLoc);

        const currentAcademicYear = localStorage.getItem('academicYear') || '';

        setFormData(prev => ({
            ...prev,
            branch: globalBranch,
            location: viewLoc === 'All' ? 'Hyderabad' : viewLoc,
            academic_year: currentAcademicYear
        }));
        setBulkConfig(prev => ({
            ...prev,
            branch: globalBranch,
            location: viewLoc === 'All' ? 'Hyderabad' : viewLoc,
            academic_year: currentAcademicYear
        }));

        // Resolve correct location from branch if specific branch
        if (!isGlobal) {
            api.get('/branches').then(res => {
                const branchList = res.data.branches || [];
                // Set all branches for copy logic
                const mappedBranches = branchList.map((b: any) => ({
                    id: b.id,
                    name: b.branch_name,
                    location_name: b.location_name || 'Unknown Location'
                }));
                setAllBranches(mappedBranches);

                const b = branchList.find((br: any) => br.branch_name.toLowerCase() === globalBranch.toLowerCase());
                if (b) {
                    const locMap: { [key: string]: string } = { 'HYD': 'Hyderabad', 'MUM': 'Mumbai' };
                    const code = (b.location_code || '').toUpperCase();
                    let resolvedLoc = locMap[code] || initialLocation;
                    setSelectedLocation(resolvedLoc);
                    setFormData(prev => ({ ...prev, location: resolvedLoc }));

                    setSourceBranchId(b.id);
                }
            }).catch(err => console.error("Error fetching branch info:", err));
        } else {
            // If Global Branch is selected, force location to All
            setSelectedLocation('All');
            setFormData(prev => ({ ...prev, location: 'All' }));
            setBulkConfig(prev => ({ ...prev, location: 'All' }));
        }
    }, []);

    useEffect(() => {
        fetchInstallments();
    }, [selectedLocation]); // Re-fetch when location filter changes

    useEffect(() => {
        fetchFeeTypes();
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = async () => {
        try {
            const res = await api.get('/org/academic-years');
            const years = res.data.academic_years?.map((y: any) => y.name) || [];
            setAcademicYearOptions(years);
        } catch (error) {
            console.error('Error fetching academic years:', error);
            setAcademicYearOptions([]); // Fallback
        }
    };

    // Auto-update installment number suggestion when list or branch changes (only in add mode)
    useEffect(() => {
        if (!editingId) {
            setFormData(prev => ({
                ...prev,
                installment_no: installments.length + 1
            }));
        }
    }, [installments, editingId]);

    const fetchInstallments = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            let globalBranch = localStorage.getItem('currentBranch') || 'All';
            if (user.role !== 'Admin' && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
                globalBranch = user.branch;
            }
            const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;
            const response = await api.get('/installment-schedule', {
                params: {
                    branch: branchParam,
                    location: selectedLocation // Use local state
                }
            });
            setInstallments(response.data.installments || []);
        } catch (error) {
            console.error('Error fetching installments:', error);
        }
    };

    const fetchFeeTypes = async () => {
        try {
            const response = await api.get('/fee-types');
            setFeeTypes(response.data.fee_types || []);
        } catch (error) {
            console.error('Error fetching fee types:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Handle checkbox manually
        // const checked = (e.target as HTMLInputElement).checked; 
        // type === 'checkbox' is not strictly sufficient if TS complains, safe to cast if needed or use logic below.
        // Assuming checked property exists on target if type is checkbox.

        const target = e.target as HTMLInputElement;
        const checked = target.checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBulkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBulkConfig(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const generateBulkInstallments = async () => {
        if (!bulkConfig.fee_type_id) {
            alert('Please select a Fee Type');
            return;
        }

        const count = parseInt(bulkConfig.count.toString());
        const startIdx = parseInt(bulkConfig.start_month_idx.toString());
        const year = parseInt(bulkConfig.year.toString());
        const startNo = parseInt(bulkConfig.start_installment_no.toString());

        const globalBranch = localStorage.getItem('currentBranch') || 'All';

        const newInstallments = [];
        let currentYear = year;

        for (let i = 0; i < count; i++) {
            const monthIdx = (startIdx + i) % 12;
            const monthName = MONTHS[monthIdx];

            if (monthIdx === 9 && i > 0) {
                currentYear++;
            }

            const calendarMonth = (monthIdx + 3) % 12;
            const startDate = new Date(currentYear, calendarMonth, 1);
            const endDate = new Date(currentYear, calendarMonth + 1, 0);

            const formatDate = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            newInstallments.push({
                installment_no: startNo + i,
                title: `${monthName} Fee`,
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                last_pay_date: formatDate(endDate),
                is_admission: false,
                description: `Monthly installment for ${monthName}`,
                fee_type_id: parseInt(bulkConfig.fee_type_id),
                branch: bulkConfig.branch || globalBranch || 'All',
                location: bulkConfig.location || 'Hyderabad',
                academic_year: bulkConfig.academic_year || ''
            });
        }

        try {
            await api.post('/installment-schedule', newInstallments);
            alert(`Successfully generated ${count} installments!`);
            fetchInstallments();
            setBulkMode(false);
        } catch (error) {
            console.error('Error generating bulk installments:', error);
            alert('Failed to generate installments');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.start_date || !formData.end_date || !formData.last_pay_date) {
            alert('Please fill all required fields');
            return;
        }

        const globalBranch = localStorage.getItem('currentBranch') || 'All';

        // Prepare payload with correct types
        const payload = {
            ...formData,
            installment_no: parseInt(formData.installment_no.toString()),
            fee_type_id: formData.fee_type_id ? parseInt(formData.fee_type_id.toString()) : null,
            branch: formData.branch || globalBranch || 'All', // Use form value (if set) or global
            location: formData.location || 'Hyderabad',
            academic_year: formData.academic_year || ''
        };

        try {
            if (editingId) {
                await api.put(`/installment-schedule/${editingId}`, payload);
                alert('Installment updated successfully!');
            } else {
                await api.post('/installment-schedule', payload);
                alert('Installment created successfully!');
            }

            fetchInstallments();
            handleReset();
        } catch (error) {
            console.error('Error saving installment:', error);
            alert('Failed to save installment');
        }
    };

    const handleEdit = (installment: Installment) => {
        setFormData({
            installment_no: installment.installment_no,
            title: installment.title,
            start_date: installment.start_date,
            end_date: installment.end_date,
            last_pay_date: installment.last_pay_date,
            is_admission: installment.is_admission,
            description: installment.description || '',
            fee_type_id: installment.fee_type_id || null,
            branch: installment.branch || 'All',
            location: installment.location || 'Hyderabad',
            academic_year: installment.academic_year || ''
        });
        setEditingId(installment.id || null);
        setBulkMode(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this installment?')) return;

        try {
            await api.delete(`/installment-schedule/${id}`);
            alert('Installment deleted successfully!');
            fetchInstallments();
        } catch (error) {
            console.error('Error deleting installment:', error);
            alert('Failed to delete installment');
        }
    };

    const handleReset = () => {
        setFormData({
            installment_no: installments.length + 1,
            title: '',
            start_date: '',
            end_date: '',
            last_pay_date: '',
            is_admission: false,
            description: '',
            fee_type_id: null,
            branch: localStorage.getItem('currentBranch') || 'All',
            location: 'Hyderabad',
            academic_year: ''
        });
        setEditingId(null);
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
        if (!selectedCopyFeeTypeId) {
            alert("Please select a Fee Type to copy installments for.");
            return;
        }

        if (!confirm(`Are you sure you want to copy installments for the selected fee type to ${copyTargets.size} branches?`)) {
            return;
        }

        setCopying(true);
        try {
            await api.post("/fees/copy-installments", {
                source_branch_id: sourceBranchId,
                target_branch_ids: Array.from(copyTargets),
                source_fee_type_id: selectedCopyFeeTypeId,
                academic_year: localStorage.getItem('academicYear') || ''
            });
            alert("Installments copied successfully!");
            setCopyTargets(new Set());
            setSelectedCopyFeeTypeId('');
            setIsCopyDropdownOpen(false);
        } catch (error: any) {
            console.error("Copy failed", error);
            alert(error.response?.data?.error || "Failed to copy installments.");
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

    // Filter Fee Types for the dropdown (only those relevant to current branch)
    const copyableFeeTypes = feeTypes.filter(ft => ft.branch === 'All' || ft.branch === currentBranch);

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Fee Installments</h2>
                    </div>

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
                                    <div className="mb-2 p-2 border-b bg-gray-50">
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Select Fee Type to Copy:
                                        </label>
                                        <select
                                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                                            value={selectedCopyFeeTypeId}
                                            onChange={(e) => setSelectedCopyFeeTypeId(e.target.value)}
                                        >
                                            <option value="">-- Select Fee Type --</option>
                                            {copyableFeeTypes.map(ft => (
                                                <option key={ft.id} value={ft.id}>{ft.fee_type} ({ft.type})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-2 text-sm font-semibold text-gray-700 pb-2 border-b px-2">
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
                                    <div className="mt-2 pt-2 border-t flex justify-between items-center sticky bottom-0 bg-white p-1">
                                        <span className="text-xs text-gray-500">{copyTargets.size} selected</span>
                                        <button
                                            onClick={handleCopy}
                                            disabled={copying || copyTargets.size === 0 || !selectedCopyFeeTypeId}
                                            className={`px-3 py-1 text-xs text-white rounded ${copying || copyTargets.size === 0 || !selectedCopyFeeTypeId ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                                        >
                                            {copying ? "Copying..." : "Confirm Copy"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingId ? 'Edit Installment' : 'Add New Installment'}
                    </h3>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                                <select
                                    name="fee_type_id"
                                    value={formData.fee_type_id || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Select FeeType</option>
                                    {feeTypes
                                        .filter(ft => {
                                            const currentBranch = formData.branch || localStorage.getItem('currentBranch') || 'All';
                                            return !ft.branch || ft.branch === 'All' || ft.branch === currentBranch;
                                        })
                                        .map(ft => (
                                            <option key={ft.id} value={ft.id}>{ft.fee_type}</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Installment No *
                                </label>
                                <input
                                    type="number"
                                    name="installment_no"
                                    value={formData.installment_no}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g., April Fee"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date *
                                </label>
                                <input
                                    type="date"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Pay Date *
                                </label>
                                <input
                                    type="date"
                                    name="last_pay_date"
                                    value={formData.last_pay_date}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Academic Year
                                    </label>
                                    <select
                                        name="academic_year"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        value={formData.academic_year}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Year</option>
                                        {academicYearOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                                placeholder="Optional description"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                                {editingId ? 'Update' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none"
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </div>


                {/* Installments Table */}
                <div className="overflow-x-auto">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Fee Installments</h3>
                    <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    No.
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Fee Type
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Title
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Start Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    End Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Last Pay Date
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                    Branch
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {installments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No installments added yet
                                    </td>
                                </tr>
                            ) : (
                                installments.map((installment) => (
                                    <tr key={installment.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-800 border-b">
                                            {installment.installment_no}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 border-b">
                                            {installment.fee_type_name || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 border-b">
                                            {installment.title}
                                            {installment.is_admission && (
                                                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                                    Admission
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 border-b">
                                            {new Date(installment.start_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 border-b">
                                            {new Date(installment.end_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 border-b">
                                            {new Date(installment.last_pay_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 border-b">
                                            {installment.branch || 'All'}
                                        </td>
                                        <td className="px-4 py-3 text-center border-b">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(installment)}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(installment.id!)}
                                                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                                >
                                                    🗑️ Delete
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

export default FeeInstallments;
