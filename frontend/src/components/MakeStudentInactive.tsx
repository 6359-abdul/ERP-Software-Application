import React, { useState, useEffect } from 'react';
import api from '../api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ClassItem {
    id: number;
    class_name: string;
}

interface StudentOption {
    student_id: number;
    name: string;
    admNo: string;
    rollNo: string | number;
    class: string;
    section: string;
    father: string;
    fatherMobile: string;
    Motherfirstname?: string;
    SecondaryPhone?: string;
    status?: string;
}

interface FeeInstallment {
    id: number;
    title: string;
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    concession: number;
    status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const MakeStudentInactive: React.FC = () => {
    // ── Search state ──────────────────────────────────────────────────────────
    const [admSearch, setAdmSearch] = useState('');
    const [nameSearch, setNameSearch] = useState('');
    const [classOptions, setClassOptions] = useState<ClassItem[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

    // ── Loaded student data ────────────────────────────────────────────────────
    const [student, setStudent] = useState<StudentOption | null>(null);
    const [fees, setFees] = useState<FeeInstallment[]>([]);

    // ── Form ──────────────────────────────────────────────────────────────────
    const [inactivationDate, setInactivationDate] = useState('');
    const [reason, setReason] = useState('');

    // ── UI state ──────────────────────────────────────────────────────────────
    const [loadingFees, setLoadingFees] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [nullifying, setNullifying] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ── Load classes on mount ─────────────────────────────────────────────────
    useEffect(() => {
        api.get('/classes')
            .then(res => setClassOptions(res.data.classes || []))
            .catch(() => { });
    }, []);

    // ── When class changes, load students for that class ──────────────────────
    useEffect(() => {
        setStudentOptions([]);
        setSelectedStudentId(null);
        if (!selectedClass) return;

        const branch = localStorage.getItem('currentBranch') || 'All';
        api.get('/students', {
            params: { class: selectedClass, branch: branch === 'All Branches' ? 'All' : branch }
        })
            .then(res => setStudentOptions(res.data.students || []))
            .catch(() => setStudentOptions([]));
    }, [selectedClass]);

    // ── Go: load the selected student's details + fee structure ───────────────
    const handleGo = async () => {
        // Resolve student id – by admission number search or dropdown
        let targetId = selectedStudentId;

        if (!targetId && admSearch.trim()) {
            // Search by admission number
            try {
                const res = await api.get('/students', { params: { search: admSearch.trim() } });
                const found: StudentOption[] = res.data.students || [];
                const match = found.find(s => s.admNo?.toLowerCase() === admSearch.trim().toLowerCase());
                if (match) {
                    targetId = match.student_id;
                    setStudent(match);
                } else {
                    setMessage({ type: 'error', text: 'No student found with that admission number.' });
                    return;
                }
            } catch {
                setMessage({ type: 'error', text: 'Error searching student.' });
                return;
            }
        } else if (!targetId && nameSearch.trim()) {
            try {
                const res = await api.get('/students', { params: { search: nameSearch.trim() } });
                const found: StudentOption[] = res.data.students || [];
                if (found.length > 0) {
                    targetId = found[0].student_id;
                    setStudent(found[0]);
                } else {
                    setMessage({ type: 'error', text: 'No student found with that name.' });
                    return;
                }
            } catch {
                setMessage({ type: 'error', text: 'Error searching student.' });
                return;
            }
        } else if (targetId) {
            const s = studentOptions.find(s => s.student_id === targetId);
            if (s) setStudent(s);
        }

        if (!targetId) {
            setMessage({ type: 'error', text: 'Please select or search for a student first.' });
            return;
        }

        setMessage(null);
        setLoadingFees(true);
        try {
            const res = await api.get(`/fees/student-details/${targetId}`);
            const installments: FeeInstallment[] = (res.data.installments || []).map((i: any) => ({
                id: i.id,
                title: i.title,
                totalFee: parseFloat(i.totalFee ?? i.total_fee ?? 0),
                paidAmount: parseFloat(i.paidAmount ?? i.paid_amount ?? 0),
                dueAmount: parseFloat(i.dueAmount ?? i.due_amount ?? 0),
                concession: parseFloat(i.concession ?? 0),
                status: i.status ?? 'Pending',
            }));
            setFees(installments);
        } catch {
            setMessage({ type: 'error', text: 'Failed to load fee structure.' });
        } finally {
            setLoadingFees(false);
        }
    };

    // ── Make Inactive ──────────────────────────────────────────────────────────
    const handleMakeInactive = async () => {
        if (!student) return;

        const hasDueFees = fees.some(fee => fee.dueAmount > 0);
        if (hasDueFees) {
            setMessage({ type: 'error', text: 'student has fee to pay unable to deactivate' });
            return;
        }

        if (!inactivationDate) {
            setMessage({ type: 'error', text: 'Please enter an inactivation date.' });
            return;
        }
        if (!window.confirm(`Are you sure you want to make ${student.name} inactive?`)) return;

        setSubmitting(true);
        setMessage(null);
        try {
            await api.put(`/students/${student.student_id}`, {
                status: 'Inactive',
                inactivation_date: inactivationDate,
                inactivation_reason: reason,
            });
            setMessage({ type: 'success', text: `${student.name} has been marked as Inactive successfully.` });
            // Reset
            setStudent(null);
            setFees([]);
            setSelectedClass('');
            setSelectedStudentId(null);
            setAdmSearch('');
            setNameSearch('');
            setInactivationDate('');
            setReason('');
        } catch (err: any) {
            const errMsg = err?.response?.data?.error || 'Failed to make student inactive.';
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Nullify Fee Structure ──────────────────────────────────────────────────
    const handleNullify = async () => {
        if (!student) return;
        if (!window.confirm('This will zero out all unpaid fee installments. Continue?')) return;

        setNullifying(true);
        setMessage(null);
        try {
            const res = await api.post(`/fees/nullify/${student.student_id}`);
            setMessage({ type: 'success', text: res.data.message || 'Fee structure nullified.' });
            // Reload fees
            const feeRes = await api.get(`/fees/student-details/${student.student_id}`);
            const installments: FeeInstallment[] = (feeRes.data.installments || []).map((i: any) => ({
                id: i.id,
                title: i.title,
                totalFee: parseFloat(i.totalFee ?? i.total_fee ?? 0),
                paidAmount: parseFloat(i.paidAmount ?? i.paid_amount ?? 0),
                dueAmount: parseFloat(i.dueAmount ?? i.due_amount ?? 0),
                concession: parseFloat(i.concession ?? 0),
                status: i.status ?? 'Pending',
            }));
            setFees(installments);
        } catch (err: any) {
            setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to nullify fees.' });
        } finally {
            setNullifying(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="flex gap-6">
                {/* ── LEFT PANEL ──────────────────────────────────────────── */}
                <div className="w-1/2">
                    {/* Search Panel */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
                        <h3 className="text-base font-semibold text-gray-700 mb-3">
                            Make Student Inactive
                            <span className="ml-2 text-xs text-blue-500 cursor-pointer hover:underline">Get Help</span>
                        </h3>

                        {/* Row 1: adm search + name search */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="search adm. number"
                                value={admSearch}
                                onChange={e => setAdmSearch(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                            <input
                                type="text"
                                placeholder="search student name"
                                value={nameSearch}
                                onChange={e => setNameSearch(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                            />
                        </div>

                        {/* Row 2: class dropdown + student dropdown + Go button */}
                        <div className="flex gap-2 mb-2 items-center">
                            <select
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                            >
                                <option value="">Select Class</option>
                                {classOptions.map(c => (
                                    <option key={c.id} value={c.class_name}>{c.class_name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedStudentId ?? ''}
                                onChange={e => setSelectedStudentId(Number(e.target.value) || null)}
                                disabled={!selectedClass}
                                className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-violet-400 disabled:bg-gray-100"
                            >
                                <option value="">Select Student</option>
                                {studentOptions.map(s => (
                                    <option key={s.student_id} value={s.student_id}>
                                        {s.rollNo ? `${s.rollNo} ${s.name}` : s.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={handleGo}
                                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                            >
                                Go ▶
                            </button>
                        </div>

                        {/* Row 3: date + reason + Make Inactive button */}
                        <div className="flex gap-2 items-center">
                            {student && (
                                <>
                                    <input
                                        type="date"
                                        value={inactivationDate}
                                        onChange={e => setInactivationDate(e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                        placeholder="date"
                                    />
                                    <input
                                        type="text"
                                        placeholder="reason"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                    />
                                    <button
                                        onClick={handleMakeInactive}
                                        disabled={submitting}
                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-60"
                                    >
                                        {submitting ? 'Saving...' : 'Make Inactive'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Message Banner */}
                    {message && (
                        <div className={`mb-3 px-4 py-2 rounded text-sm font-medium ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Fee Table */}
                    {student && (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            {/* Fee Header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                                <span className="font-semibold text-gray-700 flex items-center gap-1">
                                    <span className="text-green-600">₹</span> Fee
                                </span>
                                <button
                                    onClick={handleNullify}
                                    disabled={nullifying}
                                    className="bg-violet-500 hover:bg-violet-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-60"
                                >
                                    <span>⊘</span> {nullifying ? 'Nullifying...' : 'Nullify fee Structure'}
                                </button>
                            </div>

                            {loadingFees ? (
                                <div className="p-6 text-center text-gray-500 text-sm">Loading fee structure...</div>
                            ) : fees.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No fee records found.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600 text-xs">
                                            <th className="w-8 px-2 py-2">
                                                <input type="checkbox" className="rounded" />
                                            </th>
                                            <th className="px-3 py-2 text-left">Sr.</th>
                                            <th className="px-3 py-2 text-left">Title</th>
                                            <th className="px-3 py-2 text-left">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fees.map((fee, idx) => {
                                            const isPaid = fee.paidAmount > 0;
                                            const rowBg = isPaid ? 'bg-green-100' : 'bg-white';
                                            return (
                                                <tr key={fee.id} className={`${rowBg} border-t border-gray-100`}>
                                                    <td className="px-2 py-2 text-center">
                                                        {!isPaid && (
                                                            <input type="checkbox" className="rounded" />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-gray-800">{fee.title}</td>
                                                    <td className="px-3 py-2 text-gray-600 text-xs">
                                                        {isPaid
                                                            ? `Payable = ${fee.totalFee.toFixed(0)}, Paid = ${fee.paidAmount.toFixed(0)}, Due = ${fee.dueAmount.toFixed(0)}`
                                                            : `Payable = ${fee.totalFee.toFixed(0)}`
                                                        }
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
                <div className="w-1/2">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                        <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-1">
                            <span className="text-blue-500">ℹ</span> Student Detail
                        </h3>

                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 font-semibold text-gray-600 w-1/3">Student Name:</td>
                                    <td className="py-3 pr-4 text-gray-800">{student?.name || ''}</td>
                                    <td className="py-3 pr-4 font-semibold text-gray-600 w-1/4">Admission no.:</td>
                                    <td className="py-3 text-gray-800">{student?.admNo || ''}</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Roll No:</td>
                                    <td className="py-3 pr-4 text-gray-800">{student?.rollNo || ''}</td>
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Class:</td>
                                    <td className="py-3 text-gray-800">
                                        {student ? `${student.class} ${student.section}` : ''}
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Father name:</td>
                                    <td className="py-3 pr-4 text-gray-800">{student?.father || ''}</td>
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Mother Name:</td>
                                    <td className="py-3 text-gray-800">{student?.Motherfirstname || ''}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Father Mobile:</td>
                                    <td className="py-3 pr-4 text-gray-800">{student?.fatherMobile || ''}</td>
                                    <td className="py-3 pr-4 font-semibold text-gray-600">Mother Mobile:</td>
                                    <td className="py-3 text-gray-800">{student?.SecondaryPhone || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MakeStudentInactive;
