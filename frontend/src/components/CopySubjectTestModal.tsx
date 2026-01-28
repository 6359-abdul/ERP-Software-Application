import React, { useEffect, useState } from "react";
import api from "../api";

interface CopySubjectTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceClassTestId: number | null;
    currentAcademicYear: string;
    currentBranch: string; // Branch ID or 'All'
    currentClass: string; // Class ID
    currentTest: string; // Test ID
}

interface Option {
    id: string | number;
    label: string;
}

export default function CopySubjectTestModal({
    isOpen,
    onClose,
    sourceClassTestId,
    currentAcademicYear,
    currentBranch,
    currentClass,
    currentTest
}: CopySubjectTestModalProps) {
    const [copyMode, setCopyMode] = useState<"test_to_test" | "class_to_class" | "branch_to_branch">("test_to_test");
    const [options, setOptions] = useState<Option[]>([]);
    const [selectedTargets, setSelectedTargets] = useState<(string | number)[]>([]);
    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchOptions();
            setSelectedTargets([]);
        }
    }, [isOpen, copyMode]);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            let data: Option[] = [];

            if (copyMode === "test_to_test") {
                // Fetch Tests for current context
                const res = await api.get("/test-types", {
                    params: { academic_year: currentAcademicYear }
                });
                // Filter out current test
                data = res.data
                    .filter((t: any) => String(t.id) !== String(currentTest))
                    .map((t: any) => ({
                        id: t.id,
                        label: t.test_name
                    }));
            } else if (copyMode === "class_to_class") {
                // Fetch Classes
                // Note: API for classes usually returns all, we might filter if needed but generally all classes are valid targets
                const res = await api.get("/classes", {
                    headers: { "X-Academic-Year": currentAcademicYear }
                });
                data = res.data.classes
                    .filter((c: any) => String(c.id) !== String(currentClass))
                    .map((c: any) => ({
                        id: c.id,
                        label: c.class_name
                    }));

            } else if (copyMode === "branch_to_branch") {
                // Fetch Branches
                const res = await api.get("/branches");
                data = res.data.branches
                    .filter((b: any) => String(b.id) !== String(currentBranch))
                    .map((b: any) => ({
                        id: b.id,
                        label: b.branch_name
                    }));
            }

            setOptions(data);
        } catch (err) {
            console.error("Failed to fetch copy targets", err);
            alert("Failed to load target options");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (id: string | number) => {
        setSelectedTargets(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCopy = async () => {
        if (!sourceClassTestId) return;
        if (selectedTargets.length === 0) {
            alert("Please select at least one target.");
            return;
        }

        if (!confirm(`Are you sure you want to copy assignments to ${selectedTargets.length} targets? Existing assignments will be overwritten.`)) {
            return;
        }

        setCopying(true);
        try {
            await api.post("/class-test-subjects/copy", {
                source_class_test_id: sourceClassTestId,
                copy_mode: copyMode,
                target_ids: selectedTargets,
                current_academic_year: currentAcademicYear,
                current_branch: currentBranch,
                current_class: currentClass,
                current_test: currentTest
            });
            alert("Copy successful!");
            onClose();
        } catch (err: any) {
            alert(err.response?.data?.error || "Copy failed");
        } finally {
            setCopying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-6 w-[500px] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Copy Assignments</h3>
                    <button onClick={onClose} className="text-gray-500 text-xl font-bold">&times;</button>
                </div>

                {/* Mode Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Copy Mode</label>
                    <select
                        className="border p-2 rounded w-full"
                        value={copyMode}
                        onChange={(e: any) => setCopyMode(e.target.value)}
                    >
                        <option value="test_to_test">Test to Test (Same Class/Branch)</option>
                        <option value="class_to_class">Class to Class (Same Test/Branch)</option>
                        <option value="branch_to_branch">Branch to Branch (Same Test/Class)</option>
                    </select>
                </div>

                {/* Target Selection */}
                <div className="flex-1 overflow-auto border p-2 rounded mb-4">
                    {loading ? (
                        <p>Loading targets...</p>
                    ) : options.length === 0 ? (
                        <p className="text-gray-500">No targets found.</p>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 pb-2 border-b">
                                <input
                                    type="checkbox"
                                    checked={selectedTargets.length === options.length}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedTargets(options.map(o => o.id));
                                        else setSelectedTargets([]);
                                    }}
                                />
                                <span className="font-semibold">Select All</span>
                            </div>
                            {options.map(opt => (
                                <div key={opt.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedTargets.includes(opt.id)}
                                        onChange={() => handleToggle(opt.id)}
                                    />
                                    <span>{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={copying || selectedTargets.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {copying ? "Copying..." : "Copy"}
                    </button>
                </div>
            </div>
        </div>
    );
}
