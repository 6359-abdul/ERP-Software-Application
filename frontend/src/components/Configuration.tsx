import React, { useState, useEffect, useCallback } from 'react';
import { Page } from '../App';
import { ChevronDown, Trash2, Edit2, Plus, RotateCcw, Calendar, Clock } from 'lucide-react';
import api from '../api';

interface ConfigurationProps {
    navigateTo?: (page: Page) => void;
}

interface DropdownItem {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}

interface DropdownProps {
    title: string;
    items: DropdownItem[];
    isActive?: boolean;
}

interface BranchOption {
    id: number;
    branch_name: string;
    branch_code: string;
}

interface ClassOption {
    id: number;
    class_name: string;
}

interface WeekoffRule {
    id: number;
    branch_id: number;
    branch_name: string;
    class_id: number | null;
    weekday: number;
    weekday_name: string;
    week_number: number | null;
    week_label: string;
    title: string;
    academic_year: string;
}

interface Holiday {
    id: number;
    branch_id: number;
    branch_name: string;
    class_id: number | null;
    title: string;
    start_date: string;
    end_date: string;
    holiday_for: string;
    description: string;
    display_order: number | null;
    academic_year: string;
}

const WEEKDAYS = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

const WEEK_OPTIONS = [
    { value: null, label: 'Every Week' },
    { value: 1, label: 'First Week' },
    { value: 2, label: 'Second Week' },
    { value: 3, label: 'Third Week' },
    { value: 4, label: 'Fourth Week' },
    { value: 5, label: 'Fifth Week' },
];

/** Resolve the user's current branch to a branch object */
function resolveCurrentBranch(branches: BranchOption[]): BranchOption | null {
    if (branches.length === 0) return null;
    const currentBranchName = localStorage.getItem('currentBranch') || '';
    if (currentBranchName && currentBranchName !== 'All' && currentBranchName !== 'All Branches') {
        const match = branches.find(
            b => b.branch_name === currentBranchName || b.branch_code === currentBranchName
        );
        if (match) return match;
    }
    return branches[0]; // fallback to first branch
}

const NavDropdown: React.FC<DropdownProps> = ({ title, items, isActive }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${isActive ? 'bg-violet-700 text-white' : 'text-white bg-violet-600 hover:bg-violet-700'}`}>
                {title} <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="absolute left-0 z-50 w-48 bg-white border shadow-lg rounded-md py-1 mt-1">
                    {items.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (!item.disabled && item.onClick) {
                                    item.onClick();
                                    setIsOpen(false);
                                }
                            }}
                            disabled={item.disabled}
                            className={`block w-full text-left px-4 py-2 text-sm
                ${item.disabled
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-gray-700 hover:bg-violet-50 hover:text-violet-700"
                                }
              `}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ================================================================
// WEEKOFF POLICY COMPONENT
// ================================================================
const WeekoffPolicy: React.FC<{ branches: BranchOption[] }> = ({ branches }) => {
    const [rules, setRules] = useState<WeekoffRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [selectedDay, setSelectedDay] = useState<number>(6); // Default Sunday
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null); // Every
    const [selectedBranch, setSelectedBranch] = useState<number>(0);
    const [selectedClass, setSelectedClass] = useState<number | ''>(''); // '' = All Classes
    const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

    // Auto-select current branch on mount
    useEffect(() => {
        const resolved = resolveCurrentBranch(branches);
        if (resolved) setSelectedBranch(resolved.id);
    }, [branches]);

    // Fetch classes when branch changes
    useEffect(() => {
        if (!selectedBranch) {
            setClassOptions([]);
            return;
        }
        const branchObj = branches.find(b => b.id === selectedBranch);
        const branchName = branchObj?.branch_name || '';
        api.get('/classes', { params: { branch: branchName } })
            .then(res => setClassOptions(res.data?.classes || []))
            .catch(err => {
                console.error('Error fetching classes:', err);
                setClassOptions([]);
            });
    }, [selectedBranch, branches]);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/config/weekoff');
            setRules(res.data || []);
        } catch (err: any) {
            console.error('Error fetching weekoff rules:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleSave = async () => {
        if (!selectedBranch) {
            setMessage({ type: 'error', text: 'Please select a branch' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await api.post('/config/weekoff', {
                weekday: selectedDay,
                week_number: selectedWeek,
                branch_id: selectedBranch,
                class_id: selectedClass || null,
            });
            setMessage({ type: 'success', text: 'Weekoff rule created successfully!' });
            fetchRules();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to create rule';
            setMessage({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this weekoff rule?')) return;
        try {
            await api.delete(`/config/weekoff/${id}`);
            setMessage({ type: 'success', text: 'Rule deleted' });
            fetchRules();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to delete rule' });
        }
    };

    const handleReset = () => {
        setSelectedDay(6);
        setSelectedWeek(null);
        setSelectedClass('');
        const resolved = resolveCurrentBranch(branches);
        if (resolved) setSelectedBranch(resolved.id);
        setMessage(null);
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <Clock className="text-violet-600" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Week-off Policy</h2>
                <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {rules.length} Rules
                </span>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Form */}
                <div className="bg-gray-50 border rounded-lg p-5">
                    <h3 className="font-semibold text-gray-700 mb-4">Add New Weekoff Rule</h3>

                    <div className="space-y-4">
                        {/* Branch */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Branch</label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value={0}>--Select Branch--</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Class */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">All Classes</option>
                                {classOptions.map(c => (
                                    <option key={c.id} value={c.id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Day */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Day</label>
                            <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                {WEEKDAYS.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Week Rule */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Rule</label>
                            <div className="space-y-2">
                                {WEEK_OPTIONS.map(opt => (
                                    <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="week_rule"
                                            checked={selectedWeek === opt.value}
                                            onChange={() => setSelectedWeek(opt.value)}
                                            className="text-violet-600 focus:ring-violet-500"
                                        />
                                        <span className="text-sm text-gray-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                            <span className="text-xs text-violet-500 font-medium">Preview:</span>
                            <p className="text-sm font-semibold text-violet-700 mt-1">
                                {selectedWeek === null ? 'Every' : WEEK_OPTIONS.find(o => o.value === selectedWeek)?.label?.replace(' Week', '')} – {WEEKDAYS.find(d => d.value === selectedDay)?.label}
                                {selectedClass ? ` (${classOptions.find(c => c.id === selectedClass)?.class_name})` : ' (All Classes)'}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                            >
                                <Plus size={16} />
                                {saving ? 'Saving...' : 'Save Rule'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Table */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-4">Existing Rules</h3>
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading...</div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <Clock className="mx-auto mb-2 text-gray-300" size={32} />
                            <p className="text-sm">No weekoff rules configured yet</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">S.No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rule Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Branch</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {rules.map((rule, idx) => (
                                        <tr key={rule.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{rule.title}</td>
                                            <td className="px-4 py-3 text-gray-600">{rule.branch_name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ================================================================
// HOLIDAY POLICY COMPONENT
// ================================================================
const HolidayPolicy: React.FC<{ branches: BranchOption[] }> = ({ branches }) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [holidayFor, setHolidayFor] = useState('All');
    const [description, setDescription] = useState('');
    const [displayOrder, setDisplayOrder] = useState<number | ''>('');
    const [selectedBranch, setSelectedBranch] = useState<number>(0);
    const [selectedClass, setSelectedClass] = useState<number | ''>(''); // '' = All Classes
    const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

    // Auto-select current branch on mount
    useEffect(() => {
        const resolved = resolveCurrentBranch(branches);
        if (resolved) setSelectedBranch(resolved.id);
    }, [branches]);

    // Fetch classes when branch changes
    useEffect(() => {
        if (!selectedBranch) {
            setClassOptions([]);
            return;
        }
        const branchObj = branches.find(b => b.id === selectedBranch);
        const branchName = branchObj?.branch_name || '';
        api.get('/classes', { params: { branch: branchName } })
            .then(res => setClassOptions(res.data?.classes || []))
            .catch(err => {
                console.error('Error fetching classes:', err);
                setClassOptions([]);
            });
    }, [selectedBranch, branches]);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/config/holiday');
            setHolidays(res.data || []);
        } catch (err: any) {
            console.error('Error fetching holidays:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const handleSave = async () => {
        if (!title.trim() || !startDate || !endDate || !selectedBranch) {
            setMessage({ type: 'error', text: 'Title, Start Date, End Date, and Branch are required' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const payload = {
                title: title.trim(),
                start_date: startDate,
                end_date: endDate,
                holiday_for: holidayFor,
                description: description.trim(),
                display_order: displayOrder || null,
                branch_id: selectedBranch,
                class_id: selectedClass || null,
            };

            if (editingId) {
                await api.put(`/config/holiday/${editingId}`, payload);
                setMessage({ type: 'success', text: 'Holiday updated successfully!' });
            } else {
                await api.post('/config/holiday', payload);
                setMessage({ type: 'success', text: 'Holiday created successfully!' });
            }
            handleReset();
            fetchHolidays();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to save holiday';
            setMessage({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (h: Holiday) => {
        setEditingId(h.id);
        setTitle(h.title);
        setStartDate(h.start_date);
        setEndDate(h.end_date);
        setHolidayFor(h.holiday_for);
        setDescription(h.description || '');
        setDisplayOrder(h.display_order || '');
        setSelectedBranch(h.branch_id);
        setSelectedClass(h.class_id || '');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this holiday?')) return;
        try {
            await api.delete(`/config/holiday/${id}`);
            setMessage({ type: 'success', text: 'Holiday deleted' });
            fetchHolidays();
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to delete holiday' });
        }
    };

    const handleReset = () => {
        setEditingId(null);
        setTitle('');
        setStartDate('');
        setEndDate('');
        setHolidayFor('All');
        setDescription('');
        setDisplayOrder('');
        setSelectedClass('');
        const resolved = resolveCurrentBranch(branches);
        if (resolved) setSelectedBranch(resolved.id);
        setMessage(null);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Parse YYYY-MM-DD string into local time to avoid UTC shift
        const parts = dateStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <Calendar className="text-violet-600" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Holiday Policy</h2>
                <span className="bg-violet-100 text-violet-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {holidays.length} Holidays
                </span>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Form */}
                <div className="bg-gray-50 border rounded-lg p-5">
                    <h3 className="font-semibold text-gray-700 mb-4">
                        {editingId ? 'Edit Holiday' : 'Add New Holiday'}
                    </h3>

                    <div className="space-y-4">
                        {/* Branch */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Branch</label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value={0}>--Select Branch--</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.branch_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Class */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="">All Classes</option>
                                {classOptions.map(c => (
                                    <option key={c.id} value={c.id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Holiday Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Republic Day, Eid-ul-Fitr"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>

                        {/* Holiday For */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Holiday For</label>
                            <select
                                value={holidayFor}
                                onChange={(e) => setHolidayFor(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            >
                                <option value="All">All (Students & Staff)</option>
                                <option value="StudentOnly">Students Only</option>
                                <option value="StaffOnly">Staff Only</option>
                            </select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Start Date *</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        if (!endDate) setEndDate(e.target.value);
                                    }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">End Date *</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                        </div>

                        {/* Display Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Display Order</label>
                            <input
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(e.target.value ? Number(e.target.value) : '')}
                                placeholder="Optional ordering"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description..."
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                            >
                                <Plus size={16} />
                                {saving ? 'Saving...' : (editingId ? 'Update Holiday' : 'Save Holiday')}
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <RotateCcw size={16} />
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Table */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-4">Holiday Calendar</h3>
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading...</div>
                    ) : holidays.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <Calendar className="mx-auto mb-2 text-gray-300" size={32} />
                            <p className="text-sm">No holidays configured yet</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">S.No</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">For</th>
                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {holidays.map((h, idx) => (
                                        <tr key={h.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-3 text-gray-600">{idx + 1}</td>
                                            <td className="px-3 py-3">
                                                <div className="font-medium text-gray-800">{h.title}</div>
                                                {h.description && <div className="text-xs text-gray-400 mt-0.5">{h.description}</div>}
                                            </td>
                                            <td className="px-3 py-3 text-gray-600 text-xs">
                                                {formatDate(h.start_date)}
                                                {h.start_date !== h.end_date && (
                                                    <> – {formatDate(h.end_date)}</>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${h.holiday_for === 'All' ? 'bg-blue-50 text-blue-700'
                                                    : h.holiday_for === 'StudentOnly' ? 'bg-green-50 text-green-700'
                                                        : 'bg-orange-50 text-orange-700'
                                                    }`}>
                                                    {h.holiday_for === 'All' ? 'All' : h.holiday_for === 'StudentOnly' ? 'Students' : 'Staff'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(h)}
                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(h.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ================================================================
// MAIN CONFIGURATION COMPONENT
// ================================================================
const Configuration: React.FC<ConfigurationProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<string>('masters');
    const [activeMaster, setActiveMaster] = useState<string | null>(null);
    const [branches, setBranches] = useState<BranchOption[]>([]);

    // Fetch branches on mount
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data?.branches || []);
            } catch (err) {
                console.error('Error fetching branches:', err);
            }
        };
        fetchBranches();
    }, []);

    const handleMastersClick = (masterType: string) => {
        setActiveTab('masters');
        setActiveMaster(masterType);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="p-1 bg-violet-100 rounded text-violet-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </span>
                                Configuration Management
                                <span className="text-sm font-normal text-violet-600 ml-2 cursor-pointer hover:underline">Get Help</span>
                            </h1>
                        </div>
                        <div className="flex items-center space-x-2">
                            <NavDropdown
                                title="Masters"
                                isActive={activeTab === 'masters'}
                                items={[
                                    { label: "Departments", onClick: () => handleMastersClick("Departments") },
                                    { label: "Designations", onClick: () => handleMastersClick("Designations") },
                                    { label: "Week-off Policy", onClick: () => handleMastersClick("Week-off Policy") },
                                    { label: "Holiday Policy", onClick: () => handleMastersClick("Holiday Policy") },
                                ]}
                            />
                            <button
                                onClick={() => { setActiveTab('settings'); setActiveMaster(null); }}
                                className={`px-3 py-2 text-sm font-medium border rounded transition-colors ${activeTab === 'settings' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-violet-600 border-transparent hover:bg-violet-50'}`}
                            >
                                Setting
                            </button>
                            <button
                                onClick={() => { setActiveTab('academic-year'); setActiveMaster(null); }}
                                className={`px-3 py-2 text-sm font-medium border rounded transition-colors ${activeTab === 'academic-year' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-violet-600 border-transparent hover:bg-violet-50'}`}
                            >
                                Academic Year
                            </button>
                            <button
                                onClick={() => { setActiveTab('export-data'); setActiveMaster(null); }}
                                className={`px-3 py-2 text-sm font-medium border rounded transition-colors ${activeTab === 'export-data' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-violet-600 border-transparent hover:bg-violet-50'}`}
                            >
                                Export Data From Old Academic Year
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-6">
                <div className="bg-white rounded-lg shadow min-h-[500px] p-6">

                    {/* Masters Tab */}
                    {activeTab === 'masters' && !activeMaster && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Masters Configuration</h2>
                            <p className="mt-2">Select a master from the dropdown to configure.</p>
                        </div>
                    )}

                    {activeTab === 'masters' && activeMaster === 'Week-off Policy' && (
                        <WeekoffPolicy branches={branches} />
                    )}

                    {activeTab === 'masters' && activeMaster === 'Holiday Policy' && (
                        <HolidayPolicy branches={branches} />
                    )}

                    {activeTab === 'masters' && activeMaster === 'Departments' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Departments</h2>
                            <p className="mt-2">Department management coming soon.</p>
                        </div>
                    )}

                    {activeTab === 'masters' && activeMaster === 'Designations' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Designations</h2>
                            <p className="mt-2">Designation management coming soon.</p>
                        </div>
                    )}

                    {/* Other Tabs */}
                    {activeTab === 'settings' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">System Settings</h2>
                            <p className="mt-2">General system configuration options will appear here.</p>
                        </div>
                    )}
                    {activeTab === 'academic-year' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Academic Year Settings</h2>
                            <p className="mt-2">Manage academic years here.</p>
                        </div>
                    )}
                    {activeTab === 'export-data' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Export Data</h2>
                            <p className="mt-2">Export data from previous academic years.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Configuration;
