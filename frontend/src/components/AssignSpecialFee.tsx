import React, { useState, useEffect } from 'react';
import api from '../api';

interface Student {
    student_id: number;
    admission_no: string;
    name: string;
    class: string;
    section: string;
    fatherMobile: string; 
}

interface FeeType {
    id: number;
    fee_type: string;
    category: string;
    fee_type_group: string;
    type: string;
    display_name: string;
}

interface SelectedFee {
    fee_type_id: number;
    amount: number;
}

const AssignSpecialFee: React.FC = () => {
    const [classes, setClasses] = useState<string[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [isAdmin, setIsAdmin] = useState(false);
    const [academicYear, setAcademicYear] = useState(localStorage.getItem('academicYear') || '');
    const [isBranchLocked, setIsBranchLocked] = useState(false);

    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [selectedFees, setSelectedFees] = useState<SelectedFee[]>([]);

    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restrictedFeeTypeIds, setRestrictedFeeTypeIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const globalBranch = localStorage.getItem('currentBranch');

        setIsAdmin(user.role === 'Admin');

        if (user.role === 'Admin') {
            if (globalBranch && globalBranch !== 'All') {
                setSelectedBranch(globalBranch);
                setIsBranchLocked(true);
            } else {
                setSelectedBranch('All');
                setIsBranchLocked(false);
            }
        } else {
            if (user.branch) {
                setSelectedBranch(user.branch);
                setIsBranchLocked(true);
            }
        }

        fetchClasses();
    }, []);

    useEffect(() => {
        fetchFeeTypes();
    }, [selectedClass]);

    useEffect(() => {
        if (selectedClass) {
            fetchSections(selectedClass);
        } else {
            setSections([]);
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedClass && selectedSection) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedClass, selectedSection, selectedBranch]); // Re-fetch when branch changes

    const fetchClasses = async () => {
        try {
            const response = await api.get('/classes');
            if (response.data && Array.isArray(response.data.classes)) {
                const classNames: string[] = response.data.classes.map((c: any) => String(c.class_name));
                setClasses([...new Set(classNames)]);
            } else {
                setClasses([]);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
            setError('Failed to load classes.');
        }
    };

    const fetchSections = async (className: string) => {
        try {
            const response = await api.get(`/sections?class=${className}`);
            if (response.data && Array.isArray(response.data.sections)) {
                setSections(response.data.sections);
            } else {
                setSections(['A', 'B', 'C', 'D']);
            }
        } catch (error) {
            console.error('Error fetching sections:', error);
            setSections(['A', 'B', 'C', 'D']);
        }
    };

    const fetchFeeTypes = async () => {
        try {
            const feeTypesResponse = await api.get('/fee-types');
            let availableFeeTypes = feeTypesResponse.data.fee_types || [];

            if (selectedClass) {
                try {
                    const structureResponse = await api.get('/class-fee-structure', {
                        params: { class: selectedClass, academic_year: academicYear }
                    });

                    const existingStructures = structureResponse.data.fee_structures || [];
                    const assignedIds = new Set<number>();

                    existingStructures.forEach((s: any) => {
                        assignedIds.add(s.fee_type_id);
                    });

                    setRestrictedFeeTypeIds(assignedIds);
                } catch (err) {
                    console.error('Error fetching class fee structure for filtering:', err);
                    setRestrictedFeeTypeIds(new Set());
                }
            } else {
                setRestrictedFeeTypeIds(new Set());
            }

            setFeeTypes(availableFeeTypes.filter((ft: FeeType) => ft.fee_type !== 'Tuition Fee'));

        } catch (error) {
            console.error('Error fetching fee types:', error);
            setError('Failed to load fee types.');
        }
    };

    const fetchStudents = async () => {
        if (!selectedClass || !selectedSection) return;

        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/students', {
                params: {
                    class: selectedClass,
                    section: selectedSection,
                    branch: selectedBranch // Pass selected branch
                }
            });
            if (response.data && Array.isArray(response.data.students)) {
                setStudents(response.data.students);
            } else {
                setStudents([]);
            }
            setSelectedStudentIds([]);
        } catch (error) {
            console.error('Error fetching students:', error);
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    };

    // ... (handlers remain same)
    const handleSelectAllStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(students.map(s => s.student_id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectStudent = (id: number) => {
        if (selectedStudentIds.includes(id)) {
            setSelectedStudentIds(selectedStudentIds.filter(sid => sid !== id));
        } else {
            setSelectedStudentIds([...selectedStudentIds, id]);
        }
    };

    const handleFeeSelection = (feeTypeId: number, checked: boolean) => {
        if (checked) {
            setSelectedFees([...selectedFees, { fee_type_id: feeTypeId, amount: 0 }]);
        } else {
            setSelectedFees(selectedFees.filter(f => f.fee_type_id !== feeTypeId));
        }
    };

    const handleFeeAmountChange = (feeTypeId: number, amount: string) => {
        const newAmount = parseFloat(amount) || 0;
        setSelectedFees(selectedFees.map(f =>
            f.fee_type_id === feeTypeId ? { ...f, amount: newAmount } : f
        ));
    };

    const handleAssignFees = async () => {
        if (selectedStudentIds.length === 0) {
            alert('Please select at least one student');
            return;
        }
        if (selectedFees.length === 0) {
            alert('Please select at least one fee type');
            return;
        }

        const restrictedFees = selectedFees.filter(f => restrictedFeeTypeIds.has(f.fee_type_id));
        if (restrictedFees.length > 0) {
            const feeNames = restrictedFees.map(f => {
                const ft = feeTypes.find(t => t.id === f.fee_type_id);
                return ft ? ft.fee_type : 'Unknown Fee';
            }).join(', ');
            alert(`The following fees are already assigned in the Class Fee Structure and cannot be assigned again: ${feeNames}`);
            return;
        }

        const invalidFees = selectedFees.filter(f => f.amount <= 0);
        if (invalidFees.length > 0) {
            alert('Please enter valid amounts for all selected fees');
            return;
        }

        if (!window.confirm(`Assign selected fees to ${selectedStudentIds.length} students?`)) {
            return;
        }

        setAssigning(true);
        try {
            const payload = {
                student_ids: selectedStudentIds,
                fee_assignments: selectedFees.map(f => ({
                    fee_type_id: f.fee_type_id,
                    amount: f.amount,
                    academic_year: academicYear
                }))
            };

            const response = await api.post('/fees/assign-special', payload);
            alert(`Success! ${response.data.assigned_count} fees assigned. ${response.data.skipped_count} skipped (duplicates).`);

            setSelectedFees([]);
            setSelectedStudentIds([]);

        } catch (error: any) {
            console.error('Error assigning fees:', error);
            alert(`Error: ${error.response?.data?.error || 'Failed to assign fees'}`);
        } finally {
            setAssigning(false);
        }
    };

    if (error) {
        return (
            <div className="p-6 text-red-600">
                <h2 className="text-xl font-bold mb-4">Error</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h2 className="text-2xl font-bold mb-6 text-[#4318FF]">Assign Special Fee Type</h2>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                        className="border rounded-lg px-3 py-2 w-40"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select
                        className="border rounded-lg px-3 py-2 w-40"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                    >
                        <option value="">Select Section</option>
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-6">
                <div className="w-1/3 bg-white p-4 rounded-xl shadow-sm h-fit">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Special Fee Type</h3>
                        <button className="bg-green-500 text-white px-2 py-1 rounded text-sm">+ Add Special Fee Type</button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between font-medium text-gray-500 text-sm pb-2 border-b">
                            <span>Fee Type</span>
                            <span>Amount</span>
                        </div>

                        {feeTypes.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No special fee types found.</p>
                        ) : (
                            feeTypes.map(ft => {
                                const isSelected = selectedFees.some(f => f.fee_type_id === ft.id);
                                const selectedFee = selectedFees.find(f => f.fee_type_id === ft.id);

                                return (
                                    <div key={ft.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleFeeSelection(ft.id, e.target.checked)}
                                                className="w-4 h-4 text-[#4318FF]"
                                            />
                                            <span>{ft.display_name || ft.fee_type}</span>
                                        </div>
                                        {isSelected && (
                                            <input
                                                type="number"
                                                className="border rounded px-2 py-1 w-24 text-right"
                                                placeholder="0"
                                                value={selectedFee?.amount || ''}
                                                onChange={(e) => handleFeeAmountChange(ft.id, e.target.value)}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            className={`px-6 py-2 rounded-lg text-white font-medium ${selectedStudentIds.length > 0 && selectedFees.length > 0
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gray-300 cursor-not-allowed'
                                }`}
                            onClick={handleAssignFees}
                            disabled={selectedStudentIds.length === 0 || selectedFees.length === 0 || assigning}
                        >
                            {assigning ? 'Assigning...' : 'Assign >'}
                        </button>
                    </div>
                </div>

                <div className="w-2/3 bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Student List</h3>
                        <input
                            type="text"
                            placeholder="Search"
                            className="border rounded-lg px-3 py-1 text-sm"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b text-gray-500 text-sm">
                                    <th className="p-2 w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAllStudents}
                                            checked={students.length > 0 && selectedStudentIds.length === students.length}
                                        />
                                    </th>
                                    <th className="p-2">Admission No.</th>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Class</th>
                                    <th className="p-2">Father Mobile</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">
                                            Loading students...
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">
                                            No students found. Select Class and Section to load.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(student => (
                                        <tr key={student.student_id} className="border-b hover:bg-gray-50">
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.student_id)}
                                                    onChange={() => handleSelectStudent(student.student_id)}
                                                />
                                            </td>
                                            <td className="p-2">{student.admission_no}</td>
                                            <td className="p-2 font-medium">{student.name}</td>
                                            <td className="p-2">{student.class} {student.section}</td>
                                            <td className="p-2">{student.fatherMobile}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignSpecialFee;
