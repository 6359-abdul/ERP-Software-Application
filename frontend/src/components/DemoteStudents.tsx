import React, { useState, useEffect } from 'react';
import api from '../api';
import { Student } from '../types';

interface DemoteStudentsProps {
    onBack?: () => void;
}

const DemoteStudents: React.FC<DemoteStudentsProps> = ({ onBack }) => {
    // ── State ──────────────────────────────────────────────────────────────
    const [sourceYear, setSourceYear] = useState('');   // year to demote FROM (wrong promoted year)
    const [restoreYear, setRestoreYear] = useState(''); // year to restore TO (original year)
    const [years, setYears] = useState<string[]>([]);

    const [promotedStudents, setPromotedStudents] = useState<Student[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState('');

    // ── Load academic years on mount ───────────────────────────────────────
    useEffect(() => {
        api.get('/org/academic-years').then(res => {
            const y = res.data.academic_years?.map((item: any) => item.name) || [];
            setYears(y);
        });
    }, []);

    // ── Fetch promoted students when sourceYear changes ────────────────────
    useEffect(() => {
        if (!sourceYear) { setPromotedStudents([]); return; }
        setLoading(true);
        setSelectedIds([]);
        const branch = localStorage.getItem('currentBranch') || 'All';
        api.get('/students', {
            params: { branch, search, include_inactive: 'false' },
            headers: { 'X-Academic-Year': sourceYear }
        })
            .then(res => {
                // Only show students who have an academic record in source_year AND is_promoted=true
                const all: Student[] = res.data.students || [];
                const promoted = all.filter(s => s.is_promoted === true);
                setPromotedStudents(promoted);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load students: ' + (err.response?.data?.error || err.message));
            })
            .finally(() => setLoading(false));
    }, [sourceYear]);

    const filtered = promotedStudents.filter(s => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (s.admNo || '').toLowerCase().includes(q) ||
            (s.first_name || s.name || '').toLowerCase().includes(q) ||
            (s.last_name || '').toLowerCase().includes(q)
        );
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filtered.map(s => s.student_id!).filter(Boolean));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDemote = async () => {
        if (!sourceYear)  return alert('Select the year to demote FROM.');
        if (!restoreYear) return alert('Select the year to restore TO.');
        if (sourceYear === restoreYear) return alert('Source and Restore year cannot be the same.');
        if (selectedIds.length === 0) return alert('Select at least one student to demote.');

        const confirmed = window.confirm(
            `⚠️ DEMOTION CONFIRMATION\n\n` +
            `You are about to demote ${selectedIds.length} student(s):\n` +
            `  From: ${sourceYear}  →  To: ${restoreYear}\n\n` +
            `What will happen:\n` +
            `• The student will be moved back to ${restoreYear}\n` +
            `• Fee structures created in ${sourceYear} will be deactivated\n` +
            `• Collected payments are PRESERVED (audit trail)\n` +
            `• Attendance & marks remain in history\n\n` +
            `This action is intended to correct a mistaken promotion.\n` +
            `Are you sure?`
        );
        if (!confirmed) return;

        setProcessing(true);
        try {
            const res = await api.post('/students/demote-bulk', {
                student_ids: selectedIds,
                source_year: sourceYear,
                restore_year: restoreYear,
            });

            const { success_count, errors } = res.data;
            let msg = `✅ ${success_count} student(s) successfully demoted to ${restoreYear}.`;
            if (errors?.length) {
                msg += `\n\n⚠️ Warnings / Errors:\n${errors.slice(0, 5).join('\n')}`;
            }
            alert(msg);
            // Refresh the list
            setSelectedIds([]);
            setPromotedStudents(prev => prev.filter(s => !selectedIds.includes(s.student_id!)));
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message;
            alert('❌ Demotion failed: ' + msg);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-4 min-h-screen bg-gray-50">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">De-promote Students</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Correction tool — reverses a mistaken promotion. Financial records are preserved.
                    </p>
                </div>
                {onBack && (
                    <button onClick={onBack} className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100">
                        ← Back
                    </button>
                )}
            </div>

            {/* ── ERP Info Banner ── */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4 text-sm text-amber-800 flex gap-2">
                <span className="text-lg">ℹ️</span>
                <div>
                    <strong>ERP Rule — No Financial Data is Deleted:</strong> De-promotion deactivates fee
                    structures in the source year and moves the student pointer back to the restore year.
                    All collected payments, attendance, and marks remain in the system for audit.
                </div>
            </div>

            {/* ── Year Selectors ── */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-red-700 mb-1">
                            ① Demote FROM (Mistakenly Promoted Year)
                        </label>
                        <select
                            value={sourceYear}
                            onChange={e => { setSourceYear(e.target.value); setRestoreYear(''); }}
                            className="w-full border border-red-300 p-2 rounded bg-red-50 text-sm"
                        >
                            <option value="">— Select Year —</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <p className="text-xs text-red-500 mt-1">Fee structures in this year will be deactivated.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-green-700 mb-1">
                            ② Restore TO (Previous / Correct Year)
                        </label>
                        <select
                            value={restoreYear}
                            onChange={e => setRestoreYear(e.target.value)}
                            className="w-full border border-green-300 p-2 rounded bg-green-50 text-sm"
                        >
                            <option value="">— Select Year —</option>
                            {years.filter(y => y !== sourceYear).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <p className="text-xs text-green-600 mt-1">Student will be active in this year.</p>
                    </div>
                </div>

                {sourceYear && restoreYear && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-center text-sm font-medium text-gray-700">
                        {sourceYear} <span className="text-red-500 font-bold mx-2">→ UNDO →</span> {restoreYear}
                    </div>
                )}
            </div>

            {/* ── Student Table ── */}
            {sourceYear && (
                <div className="bg-white rounded-lg shadow">
                    {/* Table header */}
                    <div className="p-3 border-b flex items-center justify-between gap-3 bg-red-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-700">
                                🔍 Students promoted to: <strong>{sourceYear}</strong>
                            </span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                {promotedStudents.length} found
                            </span>
                        </div>
                        <input
                            placeholder="Search by name or adm no..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border p-1.5 rounded text-sm w-56"
                        />
                    </div>

                    <div className="overflow-auto max-h-[50vh]">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Loading promoted students...</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                {promotedStudents.length === 0
                                    ? `No promoted students found in ${sourceYear}.`
                                    : 'No students match your search.'
                                }
                            </div>
                        ) : (
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 border text-center w-10">
                                            <input
                                                type="checkbox"
                                                checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="p-2 border text-left">Adm No</th>
                                        <th className="p-2 border text-left">Student Name</th>
                                        <th className="p-2 border text-left">Class</th>
                                        <th className="p-2 border text-left">Section</th>
                                        <th className="p-2 border text-left">Branch</th>
                                        <th className="p-2 border text-center">In {sourceYear}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(s => (
                                        <tr
                                            key={s.student_id}
                                            className={`hover:bg-red-50 cursor-pointer ${selectedIds.includes(s.student_id!) ? 'bg-red-50' : ''}`}
                                            onClick={() => toggleOne(s.student_id!)}
                                        >
                                            <td className="p-2 border text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(s.student_id!)}
                                                    onChange={() => toggleOne(s.student_id!)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </td>
                                            <td className="p-2 border font-mono text-xs">{s.admNo}</td>
                                            <td className="p-2 border font-medium">
                                                {s.first_name || s.name} {s.last_name || ''}
                                            </td>
                                            <td className="p-2 border">{s.class}</td>
                                            <td className="p-2 border">{s.section}</td>
                                            <td className="p-2 border text-gray-500">{s.branch}</td>
                                            <td className="p-2 border text-center">
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                    Promoted ✓
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer action */}
                    <div className="p-3 border-t bg-gray-50 rounded-b-lg flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            {selectedIds.length} student(s) selected
                        </span>
                        <button
                            onClick={handleDemote}
                            disabled={selectedIds.length === 0 || !restoreYear || processing}
                            className={`px-6 py-2 rounded font-semibold text-sm transition-all
                                ${selectedIds.length > 0 && restoreYear && !processing
                                    ? 'bg-red-600 text-white hover:bg-red-700 shadow'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {processing ? '⏳ Processing...' : `⬇ De-promote ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''} to ${restoreYear || '...'}`}
                        </button>
                    </div>
                </div>
            )}

            {!sourceYear && (
                <div className="text-center p-12 text-gray-400">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="text-base">Select the <strong>Demote FROM</strong> year above to see promoted students.</p>
                </div>
            )}
        </div>
    );
};

export default DemoteStudents;
