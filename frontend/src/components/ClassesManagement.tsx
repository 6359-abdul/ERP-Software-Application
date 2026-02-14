import React, { useState, useEffect } from 'react';
import api from '../api';

interface Branch {
    id: number;
    branch_name: string;
    branch_code: string;
}

interface SectionDetail {
    id: number;
    name: string;
    strength: number;
    branch_id: number;
}

interface ClassData {
    id: number;
    class_name: string;
    class_teacher?: string;
    class_monitor?: string;
    total_students?: number;
    section?: string;
    sections?: SectionDetail[];
}

interface SectionData {
    id: number;
    name: string;
    studentStrength: string;
}

interface ClassesManagementProps {
    navigateTo?: (page: any) => void;
}

const ClassesManagement: React.FC<ClassesManagementProps> = ({ navigateTo }) => {
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [newClassName, setNewClassName] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [classSummary, setClassSummary] = useState<ClassData[]>([]); // For Create View Summary
    const [branches, setBranches] = useState<Branch[]>([]);
    const [masterClasses, setMasterClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [sections, setSections] = useState<SectionData[]>([{ id: 1, name: '', studentStrength: '' }]);

    // Mock data for list view
    const mockClasses: ClassData[] = [

    ];


    useEffect(() => {
        setClasses(mockClasses);
        fetchBranches();
        fetchMasterClasses();
    }, []);

    // Effect to set default branch from localStorage and fetch summary
    useEffect(() => {
        if (branches.length > 0) {
            const storedBranchName = localStorage.getItem('currentBranch');
            if (storedBranchName && storedBranchName !== 'All') {
                const matchingBranch = branches.find(b => b.branch_name === storedBranchName);
                if (matchingBranch) {
                    setSelectedBranch(matchingBranch.id.toString());
                    fetchClassSummary(matchingBranch.id.toString());
                } else {
                    fetchClassSummary(); // Fetch all if active branch mapping fails
                }
            } else {
                fetchClassSummary(); // Fetch all
            }
        }
    }, [branches]);


    const fetchMasterClasses = async () => {
        try {
            const res = await api.get('/classes');
            if (res.data && res.data.classes) {
                setMasterClasses(res.data.classes);
            }
        } catch (error) {
            console.error("Failed to fetch master classes", error);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            if (res.data && res.data.branches) {
                setBranches(res.data.branches);
            }
        } catch (error) {
            console.error("Failed to fetch branches", error);
        }
    };

    const fetchClassSummary = async (branchId?: string) => {
        try {
            setLoading(true);
            const academicYear = localStorage.getItem('academicYear') || "2025-2026";
            let url = `/classes/summary?academic_year=${academicYear}`;

            // If branchId is passed, use it. Otherwise use state or default.
            // Note: State might not be updated yet if called from effect, so prefer arg.
            const bid = branchId || selectedBranch;
            if (bid) {
                url += `&branch_id=${bid}`;
            }

            const res = await api.get(url);
            if (res.data) {
                setClassSummary(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch class summary", error);
        } finally {
            setLoading(false);
        }
    };


    const filteredClasses = classes.filter(cls => {
        const classMatch = selectedClass === 'all' || cls.class_name.includes(selectedClass);
        const sectionMatch = selectedSection === 'all' || cls.section === selectedSection;
        return classMatch && sectionMatch;
    });

    const addSection = () => {
        const newSection: SectionData = {
            id: sections.length + 1,
            name: '',
            studentStrength: ''
        };
        setSections([...sections, newSection]);
    };

    const removeSection = (id: number) => {
        if (sections.length > 1) {
            setSections(sections.filter(section => section.id !== id));
        }
    };

    const updateSection = (id: number, field: 'name' | 'studentStrength', value: string) => {
        setSections(sections.map(section =>
            section.id === id ? { ...section, [field]: value } : section
        ));
    };

    const handleSaveClass = async () => {
        if (!newClassName.trim()) {
            alert("Class Name is required");
            return;
        }
        if (!selectedBranch) {
            alert("Please select a branch");
            return;
        }

        const sectionsPayload = sections.map(s => ({
            name: s.name,
            strength: parseInt(s.studentStrength) || 0
        })).filter(s => s.name && s.strength > 0);

        if (sectionsPayload.length === 0) {
            alert("Please add at least one valid section with strength");
            return;
        }

        const payload = {
            class_name: newClassName,
            branch_id: parseInt(selectedBranch),
            academic_year: localStorage.getItem('academicYear') || "2025-26",
            sections: sectionsPayload
        };

        try {
            await api.post('/classes/create_with_sections', payload);
            alert("Class saved successfully!");
            handleReset();
            // Refresh summary with current selection
            fetchClassSummary();
        } catch (error: any) {
            console.error("Save failed", error);
            alert(error.response?.data?.error || "Failed to save class");
        }
    };

    const handleReset = () => {
        setNewClassName('');
        setSelectedBranch('');
        setSections([{ id: 1, name: '', studentStrength: '' }]);
    };

    const handleEditClass = (cls: ClassData) => {
        setNewClassName(cls.class_name);
        if (cls.sections && cls.sections.length > 0) {
            const formSections: SectionData[] = cls.sections.map((s, index) => ({
                id: index + 1,
                name: s.name,
                studentStrength: s.strength.toString()
            }));
            setSections(formSections);

            if (cls.sections[0].branch_id) {
                setSelectedBranch(cls.sections[0].branch_id.toString());
            }
        } else {
            setSections([{ id: 1, name: '', studentStrength: '' }]);
        }
    };

    // List View - First screen
    if (viewMode === 'list') {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="w-full">
                    {/* Header Section */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-600 text-white p-2 rounded-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800">Classes</h1>
                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                Get Help
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md">
                                Assign Class Teachers
                            </button>
                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md">
                                Assign Display Order
                            </button>
                            <button
                                onClick={() => setViewMode('create')}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add/Edit Class
                            </button>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Class Selection
                                </label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="all">All classes</option>

                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Section Selection
                                </label>
                                <select
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="all">Class Group</option>

                                </select>
                            </div>
                            <div className="flex items-end">
                                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-purple-600 text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Class Name</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Class Teacher</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Class Monitor</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Total Students</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredClasses.map((cls, index) => (
                                        <tr
                                            key={cls.id}
                                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{cls.class_name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {cls.class_teacher || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {cls.class_monitor || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{cls.total_students}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors">
                                                        Assign Roll No
                                                    </button>
                                                    <button className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors">
                                                        Assign Subject Teacher
                                                    </button>
                                                    <button className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors">
                                                        Assign Class Monitor
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredClasses.length === 0 && (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by adding a new class.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Create/Edit View - Second screen
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-xl font-bold text-gray-800">CREATE CLASS AND SECTION /</h1>
                    <button
                        onClick={() => setViewMode('list')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Back
                    </button>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Class Summary */}
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                </svg>
                                <h2 className="font-semibold text-gray-800">Class Summary</h2>
                            </div>
                            <button className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create New Class
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Class</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Section</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                <div className="flex justify-center items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                                    <span className="ml-2">Loading classes...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : classSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                No classes found for this branch/year.
                                            </td>
                                        </tr>
                                    ) : (
                                        classSummary.map((cls) => (
                                            <tr key={cls.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">{cls.class_name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {cls.sections?.map(s => s.name).join(', ') || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditClass(cls)}
                                                            className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        <button className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column - Create Class Form */}
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-4 border-b flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" />
                            </svg>
                            <h2 className="font-semibold text-gray-800">Create Class</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Class Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Class<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    list="master-classes-list"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    placeholder="5"
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                <datalist id="master-classes-list">
                                    {masterClasses.map((c) => (
                                        <option key={c.id} value={c.class_name} />
                                    ))}
                                </datalist>
                            </div>


                            {/* Section Management */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <label className="text-sm font-medium text-gray-700">Section</label>
                                    <button
                                        onClick={addSection}
                                        className="bg-blue-500 text-white w-6 h-6 rounded flex items-center justify-center hover:bg-blue-600 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="border rounded overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Section Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Student Strength</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {sections.map((section) => (
                                                <tr key={section.id} className="bg-white">
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={section.name}
                                                            onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                                                            placeholder="Section Name"
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={section.studentStrength}
                                                            onChange={(e) => updateSection(section.id, 'studentStrength', e.target.value)}
                                                            placeholder="Student Strength"
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            onClick={() => removeSection(section.id)}
                                                            disabled={sections.length === 1}
                                                            className={`bg-red-500 text-white w-7 h-7 rounded flex items-center justify-center hover:bg-red-600 transition-colors ${sections.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assign to the Branch<span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                        // Optional: Refresh summary when user manually changes branch in form? 
                                        // Usually create form doesn't affect summary view filter immediately unless we want it to.
                                        // But the summary view is on the left. So yes, if they change branch, maybe update summary?
                                        // Let's keep it simple for now and only update on save or load.
                                        fetchClassSummary(e.target.value);
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">- Select-Branch -</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={handleReset}
                                    className="px-5 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleSaveClass}
                                    className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassesManagement;
