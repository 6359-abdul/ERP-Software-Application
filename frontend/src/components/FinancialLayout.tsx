import React, { useState } from 'react';
import { Page } from '../App';
import { ChevronDownIcon, DashboardIcon, FinancialIcon, DocumentIcon, UserIcon, ReceiptIcon, CurrencyRupeeIcon, TimeIcon, SchoolIcon, ChartBarIcon, DiscountIcon, TrashIcon, RefreshIcon, DocumentReportIcon } from './icons';

interface FinancialLayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  navigateTo: (page: Page) => void;
}

const FinancialLayout: React.FC<FinancialLayoutProps> = ({ children, currentPage, navigateTo }) => {
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const menuItems = [
    { name: 'Dashboard', page: 'fee' as Page, icon: <DashboardIcon className="w-5 h-5" /> },
    {
      name: 'Fee Masters',
      id: 'feeMasters',
      icon: <FinancialIcon className="w-5 h-5" />,
      subItems: [
        { name: 'Fee Type', page: 'fee-type' as Page, icon: <ReceiptIcon className="w-4 h-4" /> },
        { name: 'Fee Installments', page: 'fee-installments' as Page, icon: <TimeIcon className="w-4 h-4" /> },
        { name: 'Assign Special Fee Type', page: 'assign-special-fee' as Page, icon: <UserIcon className="w-4 h-4" /> },
        { name: 'Create Class Fee Structure', page: 'class-fee-structure' as Page, icon: <SchoolIcon className="w-4 h-4" /> },
        { name: 'Update Student Fee Structure', page: 'update-student-fee-structure' as Page, icon: <UserIcon className="w-4 h-4" /> },
        { name: 'Update Rebate Date', page: 'update-rebate-date' as Page, icon: <TimeIcon className="w-4 h-4" /> },
      ]
    },
    {
      name: 'Fee Reports',
      id: 'reports',
      icon: <DocumentIcon className="w-5 h-5" />,
      subItems: [
        { name: 'Standard Reports', page: 'fee-reports' as Page, icon: <ChartBarIcon className="w-4 h-4" /> },
        { name: 'Fee Concession Report', page: 'fee-concession-report' as Page, icon: <DiscountIcon className="w-4 h-4" /> },
        { name: 'Deleted Receipts', page: 'deleted-receipts' as Page, icon: <TrashIcon className="w-4 h-4" /> },
        { name: 'Adjust Fee Report', page: 'adjust-fee-report' as Page, icon: <RefreshIcon className="w-4 h-4" /> },
        { name: 'Petty-Cash Report', page: 'petty-cash-report' as Page, icon: <DocumentReportIcon className="w-4 h-4" /> },
      ]
    },
    {
      name: 'Petty Cash',
      id: 'pettyCash',
      icon: <FinancialIcon className="w-5 h-5" />,
      subItems: [
        { name: 'Petty Cash Entry', page: 'petty-cash' as Page, icon: <ReceiptIcon className="w-4 h-4" /> },
        { name: 'Fund Allocation', page: 'fund-allocation' as Page, icon: <DocumentIcon className="w-4 h-4" /> },
        { name: 'Month Wise Ledger', page: 'month-wise-ledger' as Page, icon: <ChartBarIcon className="w-4 h-4" /> },
      ]
    },
    {
      name: 'Concessions',
      id: 'concessions',
      icon: <UserIcon className="w-5 h-5" />,
      subItems: [
        { name: 'Concession Template', page: 'concession-master' as Page, icon: <DocumentIcon className="w-4 h-4" /> },
        { name: 'Set Student Concession', page: 'student-concession' as Page, icon: <UserIcon className="w-4 h-4" /> },
      ]
    }
  ];

  const activeMenu = menuItems.find(item => item.name === activeTab);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';

  // When inside an actual component page, hide the Financial Header completely
  if (currentPage !== 'fee') {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Financial Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm z-20 relative flex flex-col">
          <div className="px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-slate-900 flex items-center">
              <span className="text-blue-600 mr-2">₹</span> Financial Administration
            </h2>
            <button
              className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md font-medium"
              onClick={() => navigateTo('take-fee')}
            >
              Collect Fee
            </button>
          </div>

          {/* Main Navigation Tabs */}
          <div className="px-6 flex space-x-8 border-t border-slate-100 bg-white overflow-visible">
            {menuItems.map((item, idx) => {
              if (!isAdmin && (item.id === 'feeMasters' || item.id === 'concessions' || item.id === 'reports')) {
                return null;
              }

              const isActive = activeTab === item.name;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.subItems && item.subItems.length > 0) {
                      setActiveTab(item.name);
                    } else if (item.page) {
                      navigateTo(item.page as Page);
                    }
                  }}
                  className={`flex items-center py-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${isActive
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                >
                  <div className={`mr-2 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    {item.icon}
                  </div>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
          {activeTab === 'Dashboard' ? (
            children
          ) : (
            <div className="max-w-7xl mx-auto">
              <h3 className="text-xl font-semibold text-slate-800 mb-6 flex items-center">
                <span className="text-blue-600 mr-3">{activeMenu?.icon}</span>
                {activeTab} Modules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {activeMenu?.subItems?.map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigateTo(sub.page)}
                    className="group relative bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <div className={`bg-blue-50 text-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
                      {sub.icon}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-base mb-1 group-hover:text-blue-600 transition-colors">
                      {sub.name}
                    </h4>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialLayout;
