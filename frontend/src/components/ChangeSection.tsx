import React, { useState, useEffect } from 'react';
import api from '../api';
import { ArrowBackIcon } from './icons';

interface ChangeSectionProps {
    onBack?: () => void;
}

const ChangeSection: React.FC<ChangeSectionProps> = ({ onBack }) => {
    // -------------------------------------------------------------
    // Source State 
    // -------------------------------------------------------------
    const [academicYear] = useState(localStorage.getItem('academicYear') || '');
    const [sourceClass, setSourceClass] = useState('');
    const [sourceSection, setSourceSection] = useState('');
    const [sourceStudents, setSourceStudents] = useState<any[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [sourceSearch, setSourceSearch] = useState('');

    // -------------------------------------------------------------
    // Target State
    // -------------------------------------------------------------
    const [targetSection, setTargetSection] = useState('');

    // -------------------------------------------------------------
    // Common Data
    // -------------------------------------------------------------
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [loadingSource, setLoadingSource] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        // Fetch Classes
        api.get('/classes')
            .then(res => setClasses(res.data.classes || []))
            .catch(err => {
                console.error('Failed to fetch classes:', err);
            });
    }, []);

    useEffect(() => {
        if (!sourceClass) {
            setSections([]);
            setSourceSection('');
            return;
        }
        const branch = localStorage.getItem('currentBranch') || 'All';
        api.get('/sections', {
            params: {
                class: sourceClass,
                branch,
                academic_year: academicYear,
            }
        })
            .then(res => setSections(res.data.sections || []))
            .catch(() => setSections([]));
    }, [sourceClass, academicYear]);

    // Fetch Source Students
    useEffect(() => {
        if (!academicYear || !sourceClass || !sourceSection) {
            setSourceStudents([]);
            return;
        }
        setLoadingSource(true);
        const globalBranch = localStorage.getItem('currentBranch') || 'All';

        api.get('/students', {
            params: {
                class: sourceClass,
                section: sourceSection,
                search: sourceSearch,
                branch: globalBranch,
            },
            headers: {
                'X-Academic-Year': academicYear
            }
        })
            .then(res => setSourceStudents(res.data.students || []))
            .catch(err => {
                console.error(err);
                alert("Error fetching students: " + (err.response?.data?.error || err.message));
            })
            .finally(() => setLoadingSource(false));
    }, [academicYear, sourceClass, sourceSection, sourceSearch]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudentIds(sourceStudents.map(s => s.student_id).filter((id): id is number => id !== undefined));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectOne = (id: number | undefined) => {
        if (!id) return;
        if (selectedStudentIds.includes(id)) {
            setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
        } else {
            setSelectedStudentIds([...selectedStudentIds, id]);
        }
    };

    const handleChangeSection = async () => {
        if (selectedStudentIds.length === 0) return alert("Select students to change section");
        if (!targetSection) return alert("Select target section");
        if (sourceSection === targetSection) return alert("Source and Target section cannot be same");

        if (!confirm(`Change section for ${selectedStudentIds.length} students to ${sourceClass} - ${targetSection}?`)) return;

        setProcessing(true);
        try {
            await api.post('/students/change-section-bulk', {
                student_ids: selectedStudentIds,
                target_class: sourceClass,
                target_section: targetSection
            }, {
                headers: { 'X-Academic-Year': academicYear }
            });
            alert("Sections changed successfully!");

            // Refresh source students
            setSourceStudents(prev =>
                prev.filter(s => s.student_id === undefined || !selectedStudentIds.includes(s.student_id))
            );
            setSelectedStudentIds([]);
            setTargetSection('');

        } catch (error: any) {
            console.error(error);
            alert("Failed to change sections: " + (error.response?.data?.error || error.message));
        } finally {
            setProcessing(false);
        }
    };

    const selectedStudentsList = sourceStudents.filter(s => s.student_id && selectedStudentIds.includes(s.student_id));

    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full" aria-label="Go back">
                            <ArrowBackIcon className="w-5 h-5 text-gray-600" />
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-gray-800">Change in Section</h2>
                </div>
                <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-md font-semibold border border-orange-200">
                    Academic Year: {academicYear}
                </div>
            </div>

            <div className="flex gap-6 h-[75vh]">
                {/* ----------------- LEFT PANEL: SOURCE STUDENTS ----------------- */}
                <div className="flex-[1.5] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 bg-violet-50 border-b border-gray-200">
                        <h3 className="font-bold text-violet-800 mb-3 uppercase tracking-wider text-sm">Students</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <select
                                value={sourceClass}
                                onChange={e => { setSourceClass(e.target.value); setSourceSection(''); }}
                                className="border border-gray-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                            >
                                <option value="">Select Class</option>
                                {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
                            </select>
                            <select
                                value={sourceSection}
                                onChange={e => setSourceSection(e.target.value)}
                                className="border border-gray-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                disabled={!sourceClass}
                            >
                                <option value="">Select Section</option>
                                {sections.map(section => <option key={section} value={section}>{section}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                            <input
                                placeholder="Search students by name or admission no..."
                                className="w-full border border-gray-300 p-2 rounded-md text-sm pl-10 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                                value={sourceSearch}
                                onChange={e => setSourceSearch(e.target.value)}
                            />
                            <span className="absolute left-3 top-2.5 opacity-40">🔍</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                <tr className="text-left text-gray-600 font-bold border-b">
                                    <th className="p-3 w-12"><input type="checkbox" onChange={handleSelectAll} checked={sourceStudents.filter(s => s.student_id !== undefined).length > 0 && selectedStudentIds.length === sourceStudents.filter(s => s.student_id !== undefined).length} className="w-4 h-4 rounded text-violet-600" /></th>
                                    <th className="p-3">Admission No</th>
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Father Name</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingSource ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-gray-500 italic">Loading students...</td></tr>
                                ) : sourceStudents.length === 0 ? (
                                    <tr><td colSpan={4} className="p-10 text-center text-gray-500 italic">No records found. Please select class and section.</td></tr>
                                ) : (
                                    sourceStudents.map((s) => (
                                        <tr key={s.student_id ?? s.admNo ?? s.admission_no} className={`hover:bg-violet-50 transition-colors ${s.student_id && selectedStudentIds.includes(s.student_id) ? 'bg-violet-50/50' : ''}`}>
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={s.student_id ? selectedStudentIds.includes(s.student_id) : false}
                                                    onChange={() => handleSelectOne(s.student_id)}
                                                    className="w-4 h-4 rounded text-violet-600"
                                                />
                                            </td>
                                            <td className="p-3 font-mono text-gray-600">{s.admNo || s.admission_no}</td>
                                            <td className="p-3 font-semibold text-gray-800">{s.name}</td>
                                            <td className="p-3 text-gray-600">{s.father}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-gray-50 border-t flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Total: <b className="text-violet-700">{sourceStudents.length}</b></span>
                        <span className="text-gray-600 font-medium">Selected: <b className="text-violet-700">{selectedStudentIds.length}</b></span>
                    </div>
                </div>

                {/* ----------------- RIGHT PANEL: SELECTED STUDENTS & ACTION ----------------- */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-4 bg-emerald-50 border-b border-gray-200">
                        <h3 className="font-bold text-emerald-800 mb-3 uppercase tracking-wider text-sm">Selected Students</h3>
                        <div className="flex gap-3">
                            <select
                                value={targetSection}
                                onChange={e => setTargetSection(e.target.value)}
                                className="flex-1 border border-gray-300 p-2 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="">Select Target Section</option>
                                {sections.filter(s => s !== sourceSection).map(section => <option key={section} value={section}>{section}</option>)}
                            </select>
                            <button
                                onClick={handleChangeSection}
                                disabled={selectedStudentIds.length === 0 || !targetSection || processing}
                                className={`px-4 py-2 rounded-md font-bold shadow-md transition-all whitespace-nowrap
                                    ${selectedStudentIds.length > 0 && targetSection && !processing
                                        ? 'bg-violet-600 text-white hover:bg-violet-700 active:transform active:scale-95'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                                `}
                            >
                                {processing ? 'Processing...' : 'Click here for change section'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50/30">
                        <table className="min-w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm border-b">
                                <tr className="text-left text-gray-600 font-bold">
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Adm No</th>
                                    <th className="p-3">Father Name</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {selectedStudentsList.length === 0 ? (
                                    <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">No students selected from the left panel.</td></tr>
                                ) : (
                                    selectedStudentsList.map((s) => (
                                        <tr key={s.student_id} className="bg-white">
                                            <td className="p-3 font-semibold text-gray-800">{s.name}</td>
                                            <td className="p-3 font-mono text-gray-600">{s.admNo || s.admission_no}</td>
                                            <td className="p-3 text-gray-600">{s.father}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-gray-50 border-t flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Selected Count: <b className="text-emerald-700">{selectedStudentIds.length}</b></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangeSection;
