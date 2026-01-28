import React, { useState } from 'react';
import {
    TodayCollection,
    DailyReport,
    MonthlyReport,
    ClassWiseReport,
    InstallmentWiseReport,
    DueReport
} from './FeeReportComponents';
import FeeReceipt from './FeeReceipt';
import api from '../api';

const FeeReports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('today');
    const [receiptData, setReceiptData] = useState<any>(null);
    const [loadingReceipt, setLoadingReceipt] = useState(false);
    const [error, setError] = useState('');

    const handleViewReceipt = async (receiptNo: string) => {
        try {
            setLoadingReceipt(true);
            setError('');
            const res = await api.get(`/reports/fees/receipt/${receiptNo}`);
            setReceiptData(res.data);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to load receipt');
        } finally {
            setLoadingReceipt(false);
        }
    };

    const tabs = [
        { id: 'today', label: "Today's Collection" },
        { id: 'daily', label: 'Daily Report' },
        { id: 'monthly', label: 'Monthly Report' },
        { id: 'class', label: 'Class Wise' },
        { id: 'installment', label: 'Installment Wise' },
        { id: 'due', label: 'Due Report' },
    ];

    return (
        <div className="container mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="bg-violet-100 text-violet-600 p-2 rounded mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </span>
                Fee Reports
            </h2>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id
                                ? 'bg-violet-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm min-h-[400px]">
                {activeTab === 'today' && <TodayCollection onViewReceipt={handleViewReceipt} />}
                {activeTab === 'daily' && <DailyReport onViewReceipt={handleViewReceipt} />}
                {activeTab === 'monthly' && <MonthlyReport onViewReceipt={handleViewReceipt} />}
                {activeTab === 'class' && <ClassWiseReport onViewReceipt={handleViewReceipt} />}
                {activeTab === 'installment' && <InstallmentWiseReport onViewReceipt={handleViewReceipt} />}
                {activeTab === 'due' && <DueReport />}
            </div>

            {/* Receipt Modal */}
            {loadingReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white p-4 rounded shadow">Loading Receipt...</div>
                </div>
            )}

            {receiptData && (
                <FeeReceipt
                    receiptData={receiptData}
                    onClose={() => setReceiptData(null)}
                />
            )}
        </div>
    );
};

export default FeeReports;
