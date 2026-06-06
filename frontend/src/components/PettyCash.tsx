import React, { useState, useEffect } from 'react';
import api from '../api';
import { format } from 'date-fns'; // Assuming date-fns is used, otherwise standard Date works. I'll use standard Date if date-fns is not there, let's stick to standard to be safe.

interface Ledger {
  id: number;
  ledger_name: string;
  ledger_type: string;
}

interface PettyCashTxn {
  id?: number;
  branch_id?: number | string;
  transaction_date: string;
  voucher_name: string;
  voucher_type: string;
  ledger_id: number | string;
  ledger_name?: string;
  ledger_type?: string;
  paid_to: string;
  amount: number | string;
  payment_mode: string;
  academic_year?: string;
}

const PettyCash: React.FC = () => {
  const [transactions, setTransactions] = useState<PettyCashTxn[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [newLedger, setNewLedger] = useState({ ledger_name: '', ledger_type: 'Indirect' });

  // Accordion state - group by month
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAccountant = user.role === 'Admin' || user.role === 'Accountant';
  
  const [formData, setFormData] = useState<PettyCashTxn>({
    transaction_date: new Date().toISOString().split('T')[0],
    voucher_name: '',
    voucher_type: 'Payment',
    ledger_id: '',
    paid_to: '',
    amount: '',
    payment_mode: 'Cash',
  });
  
  // Need to track ledger type for the form to filter ledgers
  const [selectedLedgerType, setSelectedLedgerType] = useState('Indirect');

  const fetchLedgers = async () => {
    try {
      const response = await api.get('/petty-cash/ledgers');
      setLedgers(response.data);
    } catch (err: any) {
      console.error('Error fetching ledgers', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/petty-cash');
      setTransactions(response.data);
      
      // Auto-expand current month
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      setExpandedMonths(prev => ({ ...prev, [currentMonth]: true }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
    fetchTransactions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/petty-cash', formData);
      alert('Transaction saved successfully');
      // Reset form
      setFormData({
        ...formData,
        voucher_name: '',
        paid_to: '',
        amount: '',
        ledger_id: '',
      });
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save transaction');
    }
  };

  const handleCreateLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/petty-cash/ledgers', newLedger);
      alert('Ledger created successfully');
      setShowLedgerModal(false);
      setNewLedger({ ledger_name: '', ledger_type: 'Indirect' });
      fetchLedgers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create ledger');
    }
  };

  const toggleMonth = (monthStr: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthStr]: !prev[monthStr] }));
  };

  const deleteTransaction = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await api.delete(`/petty-cash/${id}`);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  // Group transactions by month-year
  const groupedTransactions: Record<string, PettyCashTxn[]> = {};
  transactions.forEach(txn => {
    const dateObj = new Date(txn.transaction_date);
    const monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!groupedTransactions[monthYear]) {
      groupedTransactions[monthYear] = [];
    }
    groupedTransactions[monthYear].push(txn);
  });

  const filteredLedgers = ledgers.filter(l => l.ledger_type === selectedLedgerType);

  return (
    <div className="container mx-auto p-6 space-y-6">
      
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">New Petty Cash Entry</h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Date</label>
            <input type="date" name="transaction_date" value={formData.transaction_date} onChange={handleInputChange} className="border p-2 rounded" required />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Voucher Name</label>
            <input type="text" name="voucher_name" value={formData.voucher_name} onChange={handleInputChange} className="border p-2 rounded" placeholder="e.g. Purchase of stationery" required />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Voucher Type</label>
            <select name="voucher_type" value={formData.voucher_type} onChange={handleInputChange} className="border p-2 rounded" required>
              <option value="Payment">Payment</option>
              <option value="Received">Received</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Ledger Type</label>
            <select 
              value={selectedLedgerType} 
              onChange={(e) => {
                setSelectedLedgerType(e.target.value);
                setFormData({...formData, ledger_id: ''}); // Reset ledger selection
              }} 
              className="border p-2 rounded"
            >
              <option value="Direct">Direct</option>
              <option value="Indirect">Indirect</option>
            </select>
          </div>

          <div className="flex flex-col">
             <label className="text-sm text-gray-600 mb-1 flex justify-between items-center">
               <span>Ledger</span>
               {isAccountant && (
                 <button type="button" onClick={() => setShowLedgerModal(true)} className="text-blue-600 text-xs hover:underline">+ Add Ledger</button>
               )}
             </label>
             <select name="ledger_id" value={formData.ledger_id} onChange={handleInputChange} className="border p-2 rounded" required>
                <option value="">Select Ledger</option>
                {filteredLedgers.map(l => (
                  <option key={l.id} value={l.id}>{l.ledger_name}</option>
                ))}
             </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Paid To / Received From</label>
            <input type="text" name="paid_to" value={formData.paid_to} onChange={handleInputChange} className="border p-2 rounded" placeholder="Name" />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Amount</label>
            <input type="number" step="0.01" min="0" name="amount" value={formData.amount} onChange={handleInputChange} className="border p-2 rounded" placeholder="0.00" required />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Payment Mode</label>
            <select name="payment_mode" value={formData.payment_mode} onChange={handleInputChange} className="border p-2 rounded" required>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div className="lg:col-span-4 flex justify-end mt-2">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 transition">Save Transaction</button>
          </div>

        </form>
      </div>

      {/* Accordion List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Transactions History</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading transactions...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <div className="p-6 text-center text-gray-500">No transactions found for the current branch and academic year.</div>
        ) : (
          <div className="divide-y">
            {Object.entries(groupedTransactions).map(([monthYear, txns]) => (
              <div key={monthYear} className="w-full">
                <button 
                  onClick={() => toggleMonth(monthYear)}
                  className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 transition text-left"
                >
                  <span className="font-semibold text-gray-700">{monthYear}</span>
                  <span className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{txns.length} entries</span>
                    <span className="text-lg text-gray-400">{expandedMonths[monthYear] ? '▲' : '▼'}</span>
                  </span>
                </button>
                
                {expandedMonths[monthYear] && (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Voucher Name</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Ledger</th>
                          <th className="px-4 py-2">Paid To</th>
                          <th className="px-4 py-2">Mode</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txns.map(t => (
                          <tr key={t.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">{t.transaction_date}</td>
                            <td className="px-4 py-2">{t.voucher_name}</td>
                            <td className="px-4 py-2">
                               <span className={`px-2 py-1 rounded text-xs ${t.voucher_type === 'Received' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                 {t.voucher_type}
                               </span>
                            </td>
                            <td className="px-4 py-2">{t.ledger_name}</td>
                            <td className="px-4 py-2">{t.paid_to || '-'}</td>
                            <td className="px-4 py-2">{t.payment_mode}</td>
                            <td className="px-4 py-2 text-right font-medium">₹{Number(t.amount).toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                               {isAccountant && (
                                 <button onClick={() => t.id && deleteTransaction(t.id)} className="text-red-500 hover:text-red-700 font-bold px-2" title="Delete">×</button>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add New Ledger</h3>
            <form onSubmit={handleCreateLedger} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ledger Name</label>
                <input 
                  type="text" 
                  value={newLedger.ledger_name} 
                  onChange={(e) => setNewLedger({...newLedger, ledger_name: e.target.value})} 
                  className="w-full border p-2 rounded" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ledger Type</label>
                <select 
                  value={newLedger.ledger_type} 
                  onChange={(e) => setNewLedger({...newLedger, ledger_type: e.target.value})} 
                  className="w-full border p-2 rounded"
                >
                  <option value="Direct">Direct</option>
                  <option value="Indirect">Indirect</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button type="button" onClick={() => setShowLedgerModal(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PettyCash;
