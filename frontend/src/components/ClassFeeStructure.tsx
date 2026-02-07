import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

interface FeeType {
    id: number;
    fee_type: string;
    category: string;
    fee_type_group: string;
    type: string;
    display_name: string; 
    is_refundable: boolean;
}

interface Installment {
    month: string;
    amount: number;
    month_order: number;
}

interface FeeStructureItem {
    id?: number; // Database ID for saved structures
    fee_type_id: number;
    fee_type_name?: string;
    total_amount: number;
    is_new_admission: boolean;
    installments: Installment[];
}

interface ClassFeeStructure {
    id?: number;
    class: string;
    academic_year: string;
    fee_group: string;
    fees: FeeStructureItem[];
}

interface BranchOption {
    id: number | string;
    name: string;
    location_name: string;
}

const ClassFeeStructure: React.FC = () => {
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [feeGroups, setFeeGroups] = useState<string[]>(['Standard']);

    const [selectedClass, setSelectedClass] = useState('');
    const [academicYear, setAcademicYear] = useState(localStorage.getItem('academicYear') || '');
    const [selectedFeeGroup, setSelectedFeeGroup] = useState('Standard');
    const [newFeeGroup, setNewFeeGroup] = useState('');
    // const [selectedBranch, setSelectedBranch] = useState('All'); // Removed state
    const [selectedLocation, setSelectedLocation] = useState('Hyderabad');
    const [isAdmin, setIsAdmin] = useState(false);
    // const [isBranchLocked, setIsBranchLocked] = useState(false); // Removed state

    const [newAdmissionFees, setNewAdmissionFees] = useState<FeeStructureItem[]>([]);
    const [existingStudentFees, setExistingStudentFees] = useState<FeeStructureItem[]>([]);

    const [showNewAdmissionForm, setShowNewAdmissionForm] = useState(false);
    const [showExistingStudentForm, setShowExistingStudentForm] = useState(false);

    // START FIX: Add state to track effective branch
    const [effectiveBranch, setEffectiveBranch] = useState('All');
    const [isAllBranchesMode, setIsAllBranchesMode] = useState(false);

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

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setIsAdmin(user.role === 'Admin');

        if (user.location) {
            setSelectedLocation(user.location);
        }

        // Auto-set location based on current branch
        let globalBranch = localStorage.getItem('currentBranch') || 'All';

        if (user.role !== 'Admin' && user.branch && user.branch !== 'All' && user.branch !== 'All Branches') {
            globalBranch = user.branch;
        }
        setEffectiveBranch(globalBranch);

        const allMode = globalBranch === 'All' || globalBranch === 'All Branches';
        setIsAllBranchesMode(allMode);

        const storedLocation = localStorage.getItem('currentLocation');

        // Fetch all branches to populate state and resolve source ID
        api.get('/branches').then(res => {
            const branchList = res.data.branches || res.data || [];

            // Map for Dropdown
            const mappedBranches = branchList.map((b: any) => ({
                id: b.id,
                name: b.branch_name,
                location_name: b.location_name || 'Unknown Location'
            }));
            setAllBranches(mappedBranches);

            // Find Source Branch Info
            if (globalBranch && globalBranch !== 'All' && globalBranch !== 'All Branches') {
                const b = branchList.find((br: any) => br.branch_name.toLowerCase() === globalBranch.toLowerCase());
                if (b) {
                    setSourceBranchId(b.id); // Store ID for backend

                    const locMap: { [key: string]: string } = { 'HYD': 'Hyderabad', 'MUM': 'Mumbai' };
                    // Normalize location_code to upper case to handle Hyd/HYD/Mum/MUM
                    const code = (b.location_code || '').toUpperCase();
                    let resolvedLoc = locMap[code] || 'Hyderabad';
                    setSelectedLocation(resolvedLoc);
                }
            } else {
                if (storedLocation && storedLocation !== 'All') {
                    setSelectedLocation(storedLocation);
                } else {
                    setSelectedLocation('All');
                }
            }
        }).catch(err => console.error("Error fetching branch info:", err));

        fetchFeeTypes();
        fetchClasses();
    }, []);

    const fetchFeeTypes = async () => {
        try {
            const response = await api.get('/fee-types');
            setFeeTypes(response.data.fee_types || []);
        } catch (error) {
            console.error('Error fetching fee types:', error);
        }
    };

    useEffect(() => {
        if (selectedClass && academicYear) {
            // If in all branches mode, we might still want to see data or maybe not? 
            // The requirement says "should not allow to create". 
            // Often we still want to view existing ones. 
            // For now, let's allow fetching but block saving.
            fetchExistingFeeStructures();
        }
    }, [selectedClass, academicYear, selectedLocation, effectiveBranch]);

    const fetchExistingFeeStructures = async () => {
        try {
            const globalBranch = effectiveBranch;
            const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;
            const response = await api.get('/class-fee-structure', {
                params: {
                    class: selectedClass,
                    academic_year: academicYear,
                    branch: branchParam,
                    location: selectedLocation // Use local state
                }
            });

            const structures = response.data.fee_structures;
            if (structures && structures.length > 0) {
                // ... same logic ...
                const newFees: FeeStructureItem[] = [];
                const existingFees: FeeStructureItem[] = [];

                structures.forEach((s: any) => {
                    const feeItem: FeeStructureItem = {
                        id: s.id, // Include database ID
                        fee_type_id: s.fee_type_id,
                        fee_type_name: s.fee_type_name,
                        total_amount: s.total_amount,
                        is_new_admission: s.is_new_admission,
                        installments: s.installments
                    };

                    if (s.is_new_admission) {
                        newFees.push(feeItem);
                    } else {
                        existingFees.push(feeItem);
                    }

                    // Update fee group if found
                    if (s.fee_group) {
                        setSelectedFeeGroup(s.fee_group);
                    }
                });

                setNewAdmissionFees(newFees);
                setExistingStudentFees(existingFees);
            } else {
                // Clear forms if no data found
                setNewAdmissionFees([]);
                setExistingStudentFees([]);
            }
        } catch (error) {
            console.error('Error fetching existing fee structures:', error);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await api.get('/classes');
            const classNames = response.data.classes.map((c: any) => c.class_name);
            setClasses(classNames);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const addFeeGroup = () => {
        if (newFeeGroup && !feeGroups.includes(newFeeGroup)) {
            setFeeGroups([...feeGroups, newFeeGroup]);
            setSelectedFeeGroup(newFeeGroup);
            setNewFeeGroup('');
        }
    };

    const addFeeToStructure = async (feeTypeId: number, totalAmount: number, isNewAdmission: boolean) => {
        if (isAllBranchesMode) {
            alert('Please select a specific branch to add fee structures.');
            return;
        }

        const feeType = feeTypes.find(ft => ft.id === feeTypeId);
        if (!feeType) return;

        // Check for duplicates
        const currentFees = isNewAdmission ? newAdmissionFees : existingStudentFees;
        if (currentFees.some(f => f.fee_type_id === feeTypeId)) {
            alert(`Fee type "${feeType.fee_type}" already exists in the list.`);
            return;
        }

        let installments: Installment[] = [];

        // Auto-generate installments for installment-type fees
        if (feeType.type === 'Installment') { // Fixed: type was 'Installment'
            try {
                // Fetch configured installments for this fee type
                const globalBranch = localStorage.getItem('currentBranch') || 'All';
                const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;
                const response = await api.get('/installment-schedule', {
                    params: { fee_type_id: feeTypeId, branch: branchParam }
                });
                const configuredInstallments = response.data.installments || [];

                if (configuredInstallments.length > 0) {
                    // Use configured installments
                    const count = configuredInstallments.length;
                    const baseAmount = Math.floor((totalAmount / count) / 10) * 10;
                    const remainder = totalAmount - (baseAmount * count);

                    installments = configuredInstallments.map((inst: any, index: number) => ({
                        month: inst.title, // Use title as month/label
                        amount: index === 0 ? baseAmount + remainder : baseAmount,
                        month_order: inst.installment_no
                    }));
                } else {
                    alert('Installments not created for this fee type. Please configure installments first.');
                    return;
                }
            } catch (error) {
                console.error('Error fetching installments:', error);
                alert('Error fetching installment schedule. Please try again.');
                return;
            }
        }

        const newFee: FeeStructureItem = {
            fee_type_id: feeTypeId,
            fee_type_name: feeType.fee_type,
            total_amount: totalAmount,
            is_new_admission: isNewAdmission,
            installments
        };

        if (isNewAdmission) {
            setNewAdmissionFees([...newAdmissionFees, newFee]);
        } else {
            setExistingStudentFees([...existingStudentFees, newFee]);
        }
    };

    const removeFee = async (index: number, isNewAdmission: boolean) => {
        const fees = isNewAdmission ? newAdmissionFees : existingStudentFees;
        const feeToRemove = fees[index];

        // If the fee has an ID, it's saved in the database - delete it via API
        if (feeToRemove.id) {
            const confirmDelete = window.confirm(
                `Are you sure you want to delete this fee structure? This will also remove it from all students in this class.`
            );

            if (!confirmDelete) return;

            try {
                await api.delete(`/class-fee-structure/${feeToRemove.id}`);
                alert('Fee structure deleted successfully from database and student records!');
            } catch (error: any) {
                console.error('Error deleting fee structure:', error);
                alert(`Error: ${error.response?.data?.error || 'Failed to delete fee structure'}`);
                return; // Don't remove from UI if API call failed
            }
        }

        // Remove from UI state
        if (isNewAdmission) {
            setNewAdmissionFees(newAdmissionFees.filter((_, i) => i !== index));
        } else {
            setExistingStudentFees(existingStudentFees.filter((_, i) => i !== index));
        }
    };

    const recalculateInstallments = (index: number, isNewAdmission: boolean) => {
        const fees = isNewAdmission ? [...newAdmissionFees] : [...existingStudentFees];
        const fee = fees[index];

        if (fee.installments.length === 0) return;

        const totalAmount = fee.total_amount;
        const count = fee.installments.length;

        // Logic: Base = floor((Total/Count)/10)*10. First = Total - (Base*Count) + Base.
        const baseMonthly = Math.floor((totalAmount / count) / 10) * 10;
        const remainder = totalAmount - (baseMonthly * count);

        const newInstallments = fee.installments.map((inst, idx) => ({
            ...inst,
            amount: idx === 0 ? baseMonthly + remainder : baseMonthly
        }));

        fee.installments = newInstallments;

        if (isNewAdmission) {
            setNewAdmissionFees(fees);
        } else {
            setExistingStudentFees(fees);
        }
    };

    const updateInstallmentAmount = (feeIndex: number, monthIndex: number, amount: number, isNewAdmission: boolean) => {
        const fees = isNewAdmission ? [...newAdmissionFees] : [...existingStudentFees];
        fees[feeIndex].installments[monthIndex].amount = amount;

        // Update total amount based on sum of installments
        const newTotal = fees[feeIndex].installments.reduce((sum, inst) => sum + inst.amount, 0);
        fees[feeIndex].total_amount = newTotal;

        if (isNewAdmission) {
            setNewAdmissionFees(fees);
        } else {
            setExistingStudentFees(fees);
        }
    };

    const saveFeeStructure = async () => {
        if (isAllBranchesMode) {
            alert(
                'Class Fee Structure cannot be created at All Branches level. Please select a specific branch.'
            );
            return;
        }

        if (!selectedClass || !academicYear) {
            alert('Please select class and academic year');
            return;
        }

        const allFees = [...newAdmissionFees, ...existingStudentFees];
        const globalBranch = effectiveBranch;
        const branchParam = globalBranch === "All Branches" || globalBranch === "All" ? "All" : globalBranch;

        const payload = {
            class: selectedClass,
            academic_year: academicYear,
            fee_group: selectedFeeGroup,
            branch: branchParam,
            location: selectedLocation, // Explicit location
            fees: allFees.map(fee => {
                // Extract monthly amount from first installment if available
                let monthlyAmount = 0;
                if (fee.installments && fee.installments.length > 0) {
                    monthlyAmount = fee.installments[0].amount;
                }

                return {
                    id: fee.id, // Include ID for updates
                    fee_type_id: fee.fee_type_id,
                    total_amount: fee.total_amount,
                    monthly_amount: monthlyAmount,
                    is_new_admission: fee.is_new_admission,
                    installments: fee.installments,
                    location: selectedLocation // Pass location to individual item just in case (though backend uses top level mostly, but let's be safe)
                };
            })
        };

        try {
            await api.post('/class-fee-structure', payload);
            alert('Fee structure saved successfully!');
            resetForm();
        } catch (error: any) {
            console.error('Error saving fee structure:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save fee structure';
            alert(`Error: ${errorMessage}`);
        }
    };

    const resetForm = () => {
        setNewAdmissionFees([]);
        setExistingStudentFees([]);
        setShowNewAdmissionForm(false);
        setShowExistingStudentForm(false);
    };

    // Copy Feature Logic
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

        if (!selectedClass) {
            alert("Please select a class first.");
            return;
        }

        if (!confirm(`Are you sure you want to copy fee structure for ${selectedClass} to ${copyTargets.size} branches?\n(Merge Mode: Only missing fee types will be added)`)) {
            return;
        }

        setCopying(true);
        try {
            await api.post("/fees/copy-class-fee-structure", {
                source_branch_id: sourceBranchId,
                target_branch_ids: Array.from(copyTargets),
                academic_year: academicYear,
                class: selectedClass
            });
            alert("Fee structure copied successfully!");
            setCopyTargets(new Set()); // Reset selections
            setIsCopyDropdownOpen(false);
        } catch (error: any) {
            console.error("Copy failed", error);
            alert(error.response?.data?.error || "Failed to copy fee structure.");
        } finally {
            setCopying(false);
        }
    };

    // Prepare Grouped Branches for Copy
    const availableBranches = allBranches.filter(b => String(b.id) !== String(sourceBranchId) && b.name !== 'All Branches' && b.name !== 'All');
    const branchesByLocation: { [key: string]: BranchOption[] } = {};
    availableBranches.forEach(b => {
        if (!branchesByLocation[b.location_name]) {
            branchesByLocation[b.location_name] = [];
        }
        branchesByLocation[b.location_name].push(b);
    });

    return (
        <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Class Fee Structure</h2>

                {isAllBranchesMode && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <span className="font-bold">Cannot create fee structure in "All Branches" mode.</span>
                                    <br />
                                    Please select a specific branch from the header to create or modify fee structures.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Class and Academic Year Selection */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year *</label>
                        <input
                            type="text"
                            value={academicYear}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Fee Structure for New Admissions */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Fee for New Admissions</h3>
                        <button
                            onClick={() => setShowNewAdmissionForm(!showNewAdmissionForm)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            {showNewAdmissionForm ? 'Cancel' : '+ Add Fee'}
                        </button>
                    </div>

                    {showNewAdmissionForm && (
                        <AddFeeForm
                            feeTypes={feeTypes}
                            onAdd={(feeTypeId, amount) => {
                                addFeeToStructure(feeTypeId, amount, true);
                                setShowNewAdmissionForm(false);
                            }}
                        />
                    )}

                    <FeeStructureTable
                        fees={newAdmissionFees}
                        onRemove={(index) => removeFee(index, true)}
                        onUpdateInstallment={(feeIndex, monthIndex, amount) =>
                            updateInstallmentAmount(feeIndex, monthIndex, amount, true)
                        }
                        onRecalculate={(index) => recalculateInstallments(index, true)}
                    />
                </div>

                {/* Fee Structure for Existing Students */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Fee Structure for Existing Students</h3>
                        <button
                            onClick={() => setShowExistingStudentForm(!showExistingStudentForm)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            {showExistingStudentForm ? 'Cancel' : '+ Add Fee'}
                        </button>
                    </div>

                    {showExistingStudentForm && (
                        <AddFeeForm
                            feeTypes={feeTypes}
                            onAdd={(feeTypeId, amount) => {
                                addFeeToStructure(feeTypeId, amount, false);
                                setShowExistingStudentForm(false);
                            }}
                        />
                    )}

                    <FeeStructureTable
                        fees={existingStudentFees}
                        onRemove={(index) => removeFee(index, false)}
                        onUpdateInstallment={(feeIndex, monthIndex, amount) =>
                            updateInstallmentAmount(feeIndex, monthIndex, amount, false)
                        }
                        onRecalculate={(index) => recalculateInstallments(index, false)}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center gap-4 mt-8 pt-4 border-t">
                    {/* Copy Section */}
                    <div>
                        {!isAllBranchesMode && selectedClass && (
                            <div className="relative" ref={copyDropdownRef}>
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                                    onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                                >
                                    <span>Copy to Branches</span>
                                    <span className="text-xs">▼</span>
                                </button>
                                {/* Grouped Dropdown */}
                                {isCopyDropdownOpen && (
                                    <div className="absolute bottom-12 left-0 w-80 bg-white border shadow-xl rounded z-50 p-2 max-h-96 overflow-y-auto">
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

                    <div className="flex gap-4">
                        <button
                            onClick={resetForm}
                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                            Reset
                        </button>
                        <button
                            onClick={saveFeeStructure}
                            className="px-6 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 shadow-md"
                        >
                            Save Fee Structure
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add Fee Form Component
const AddFeeForm: React.FC<{
    feeTypes: FeeType[];
    onAdd: (feeTypeId: number, amount: number) => void;
}> = ({ feeTypes, onAdd }) => {
    const [selectedFeeType, setSelectedFeeType] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = () => {
        if (selectedFeeType && amount) {
            onAdd(parseInt(selectedFeeType), parseFloat(amount));
            setSelectedFeeType('');
            setAmount('');
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                    <select
                        value={selectedFeeType}
                        onChange={(e) => setSelectedFeeType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">Select Fee Type</option>
                        {feeTypes.map(ft => (
                            <option key={ft.id} value={ft.id}>
                                {ft.fee_type} ({ft.type})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="12000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleSubmit}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                        Add Fee
                    </button>
                </div>
            </div>
        </div>
    );
};

// Fee Structure Table Component
const FeeStructureTable: React.FC<{
    fees: FeeStructureItem[];
    onRemove: (index: number) => void;
    onUpdateInstallment: (feeIndex: number, monthIndex: number, amount: number) => void;
    onRecalculate: (index: number) => void;
}> = ({ fees, onRemove, onUpdateInstallment, onRecalculate }) => {
    if (fees.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                No fees added yet
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {fees.map((fee, feeIndex) => (
                <div key={feeIndex} className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="bg-blue-50 px-4 py-3 flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold text-gray-800">{fee.fee_type_name}</h4>
                            <p className="text-sm text-gray-600">Total: ₹{fee.total_amount.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                            {fee.installments.length > 0 && (
                                <button
                                    onClick={() => onRecalculate(feeIndex)}
                                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                                    title="Recalculate installments based on total amount"
                                >
                                    Recalculate
                                </button>
                            )}
                            <button
                                onClick={() => onRemove(feeIndex)}
                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    {fee.installments.length > 0 && (
                        <div className="p-4 bg-white">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Monthly Installments:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {fee.installments.map((inst, monthIndex) => (
                                    <div key={monthIndex} className="flex flex-col">
                                        <label className="text-xs text-gray-600 mb-1">{inst.month}</label>
                                        <input
                                            type="number"
                                            value={inst.amount}
                                            onChange={(e) => onUpdateInstallment(feeIndex, monthIndex, parseFloat(e.target.value) || 0)}
                                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ClassFeeStructure;
