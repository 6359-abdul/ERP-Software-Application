import React, { useEffect, useState } from "react";
import api from "../api";

interface Subject {
    id: number;
    subject_name: string;
    subject_type: "Academic" | "Hifz";
    academic_year: string;
    is_active: boolean;
}

const SubjectMaster: React.FC = () => {
    // Access Control
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'Admin') {
        return <div className="p-4 text-red-500">Access Denied: Only Admins can manage subjects.</div>;
    }

    // Context from Storage (Shared Header State)
    const academicYear = localStorage.getItem("academicYear") || "2024-2025";

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [name, setName] = useState("");
    const [group, setGroup] = useState<"Academic" | "Hifz">("Academic");

    // Editing states
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editGroup, setEditGroup] = useState<"Academic" | "Hifz">("Academic");

    const loadSubjects = async () => {
        try {
            const res = await api.get("/academic/subjects", {
                params: { academic_year: academicYear }
            });

            const sortedSubjects = [...res.data].sort(
                (a, b) => a.subject_name.localeCompare(b.subject_name)
            );

            setSubjects(sortedSubjects);
        } catch (error) {
            console.error("Failed to load subjects:", error);
        }
    };


    const addSubject = async () => {
        if (!name.trim()) return;

        try {
            await api.post("/academic/subjects", {
                subject_name: name,
                subject_type: group,
                academic_year: academicYear,
                is_active: true
            });
            setName("");
            setGroup("Academic"); // Reset to default
            loadSubjects();
        } catch (error: any) {
            console.error("Failed to add subject:", error);
            const errorMsg = error.response?.data?.error || error.message || "Failed to add subject. Please try again.";
            alert(errorMsg);
        }
    };

    const updateSubject = async (id: number) => {
        if (!editName.trim()) return;

        try {
            await api.put(`/academic/subjects/${id}`, {
                subject_name: editName,
                subject_type: editGroup
            });
            setEditingId(null);
            loadSubjects();
        } catch (error) {
            console.error("Failed to update subject:", error);
            alert("Failed to update subject. Please try again.");
        }
    };

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        try {
            await api.put(`/academic/subjects/${id}`, {
                is_active: !currentStatus
            });
            loadSubjects();
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status.");
        }
    };

    const deleteSubject = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;

        try {
            await api.delete(`/academic/subjects/${id}`);
            loadSubjects();
        } catch (error: any) {
            console.error("Failed to delete subject:", error);
            const errorMsg = error.response?.data?.error || error.message || "Failed to delete subject. Please try again.";
            alert(errorMsg);
        }
    };

    useEffect(() => {
        loadSubjects();
    }, [academicYear]); // Reload if context changes (though unlikely without page reload)

    return (
        <div className="bg-white border rounded-md p-6">
            <h2 className="text-lg font-semibold text-[#337ab7] mb-4 flex justify-between items-center">
                <span>Subject Master</span>
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Scope: {academicYear}
                </span>
            </h2>

            {/* Add Subject */}
            <div className="flex gap-3 mb-6 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border px-3 py-2 rounded w-64"
                        placeholder="Enter subject name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                    <select
                        value={group}
                        onChange={(e) => setGroup(e.target.value as "Academic" | "Hifz")}
                        className="border px-3 py-2 rounded w-40"
                    >
                        <option value="Academic">Academic</option>
                        <option value="Hifz">Hifz</option>
                    </select>
                </div>

                <button
                    onClick={addSubject}
                    className="px-4 py-2 bg-[#337ab7] text-white rounded hover:bg-[#286090] mb-[1px]"
                >
                    Add Subject
                </button>
            </div>

            {/* Subject Table */}
            <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border px-3 py-2 text-left">Subject Name</th>
                        <th className="border px-3 py-2 text-left">Group</th>
                        <th className="border px-3 py-2 text-center w-24">Status</th>
                        <th className="border px-3 py-2 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((s) => (
                        <tr key={s.id} className={`border-t ${!s.is_active ? 'bg-gray-50' : ''}`}>
                            <td className="border px-3 py-2">
                                {editingId === s.id ? (
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="border px-2 py-1 rounded w-full"
                                    />
                                ) : (
                                    <span className={!s.is_active ? 'text-gray-400' : ''}>{s.subject_name}</span>
                                )}
                            </td>

                            <td className="border px-3 py-2">
                                {editingId === s.id ? (
                                    <select
                                        value={editGroup}
                                        onChange={(e) => setEditGroup(e.target.value as "Academic" | "Hifz")}
                                        className="border px-2 py-1 rounded w-full"
                                    >
                                        <option value="Academic">Academic</option>
                                        <option value="Hifz">Hifz</option>
                                    </select>
                                ) : (
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${s.subject_type === 'Hifz' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {s.subject_type || 'Academic'}
                                    </span>
                                )}
                            </td>

                            {/* Status Toggle */}
                            <td className="border px-3 py-2 text-center">
                                <button
                                    onClick={() => toggleStatus(s.id, s.is_active)}
                                    className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${s.is_active ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                    title={s.is_active ? "Click to Deactivate" : "Click to Activate"}
                                >
                                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${s.is_active ? 'translate-x-5' : 'translate-x-0'
                                        }`} />
                                </button>
                            </td>

                            <td className="border px-3 py-2 flex gap-3">
                                {editingId === s.id ? (
                                    <>
                                        <button
                                            className="text-green-600 hover:text-green-800"
                                            onClick={() => updateSubject(s.id)}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="text-gray-500 hover:text-gray-700"
                                            onClick={() => setEditingId(null)}
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="text-blue-600 hover:text-blue-800"
                                            onClick={() => {
                                                setEditingId(s.id);
                                                setEditName(s.subject_name);
                                                setEditGroup(s.subject_type || "Academic");
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 hover:text-red-800"
                                            onClick={() => deleteSubject(s.id)}
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SubjectMaster;
