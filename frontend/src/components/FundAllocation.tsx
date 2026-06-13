import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const FundAllocation: React.FC = () => {
    const globalYear = localStorage.getItem('academicYear') || '2026-2027';
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        branch_id: '',
        allocation_date: new Date().toISOString().split('T')[0],
        amount: '',
        remarks: '',
        approved_by: ''
    });
    const [allocations, setAllocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const getHeaders = () => {
        const token = localStorage.getItem('token') || '';
        const currentBranch = localStorage.getItem('currentBranch') || 'All';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Academic-Year': globalYear,
            'X-Branch': currentBranch
        };
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                const fetchedBranches = data.branches || [];
                setBranches(fetchedBranches);
                
                const globalBranchName = localStorage.getItem('currentBranch') || 'All';
                if (globalBranchName !== 'All') {
                    const found = fetchedBranches.find((b: any) => b.branch_name === globalBranchName);
                    if (found) {
                        setFormData(prev => ({ ...prev, branch_id: found.id.toString() }));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllocations = async () => {
        try {
            const res = await fetch(`${API_URL}/petty-cash/allocations`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                setAllocations(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchBranches();
        fetchAllocations();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`${API_URL}/petty-cash/allocations`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Fund Allocation successful!');
                setFormData({ ...formData, amount: '', remarks: '', approved_by: '' });
                fetchAllocations();
            } else {
                setMessage(data.message || 'Error saving allocation');
            }
        } catch (e) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-gray-50 min-h-screen space-y-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Fund Allocation
            </h2>
            <div className="bg-white rounded shadow p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">New Fund Allocation</h3>
                {message && <div className="mb-4 text-blue-600 font-medium">{message}</div>}
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Branch *</label>
                        <select 
                            name="branch_id" 
                            value={formData.branch_id} 
                            onChange={handleChange} 
                            className="w-full border rounded p-2" 
                            required
                        >
                            <option value="">Select Branch</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.branch_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Date *</label>
                        <input 
                            type="date" 
                            name="allocation_date" 
                            value={formData.allocation_date} 
                            onChange={handleChange} 
                            className="w-full border rounded p-2" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Amount *</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            name="amount" 
                            value={formData.amount} 
                            onChange={handleChange} 
                            className="w-full border rounded p-2" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Approved By</label>
                        <input 
                            type="text" 
                            name="approved_by" 
                            value={formData.approved_by} 
                            onChange={handleChange} 
                            className="w-full border rounded p-2" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Remarks</label>
                        <textarea 
                            name="remarks" 
                            value={formData.remarks} 
                            onChange={handleChange} 
                            className="w-full border rounded p-2" 
                            rows={1}
                        ></textarea>
                    </div>
                    <div className="lg:col-span-5 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Allocation'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded shadow">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-medium text-gray-800">Recent Allocations</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border">Date</th>
                                <th className="p-3 border">Branch</th>
                                <th className="p-3 border">Amount</th>
                                <th className="p-3 border">Approved By</th>
                                <th className="p-3 border">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-4 text-gray-500">No allocations found.</td>
                                </tr>
                            )}
                            {allocations.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="p-3 border">{a.allocation_date}</td>
                                    <td className="p-3 border">{a.branch_name}</td>
                                    <td className="p-3 border text-emerald-600 font-medium">₹ {a.amount.toFixed(2)}</td>
                                    <td className="p-3 border">{a.approved_by}</td>
                                    <td className="p-3 border">{a.remarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FundAllocation;
