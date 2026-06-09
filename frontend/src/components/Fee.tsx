import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';
import { Page } from '../App';

interface FeeProps {
    navigateTo: (page: Page) => void;
}

const Fee: React.FC<FeeProps> = ({ navigateTo }) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const handleDropdown = (name: string) => {
        setOpenDropdown(openDropdown === name ? null : name);
    };

    const handleBlur = () => {
        setTimeout(() => setOpenDropdown(null), 150);
    };

    const handleMenuItemClick = (item: string) => {
        if (item === 'Fee Type') {
            navigateTo('fee-type');
        } else if (item === 'Create Class Fee Structure') {
            navigateTo('class-fee-structure');
        } else if (item === 'Fee Installments') {
            navigateTo('fee-installments');
        } else if (item === 'Assign Special Fee Type') {
            navigateTo('assign-special-fee');
        } else if (item === 'Concession Template') {
            navigateTo('concession-master');
        } else if (item === 'Update Student Fee Structure') {
            navigateTo('update-student-fee-structure');
        } else if (item === 'Update Rebate Date') {
            navigateTo('update-rebate-date');
        } else if (item === 'Petty-Cash Report') {
            navigateTo('petty-cash-report');
        } else if (item === 'Deleted Receipts') {
            navigateTo('deleted-receipts');
        } else if (item === 'Fee Concession Report') {
            navigateTo('fee-concession-report');
        } else if (item === 'Adjust Fee Report') {
            navigateTo('adjust-fee-report');
        }
        setOpenDropdown(null);
    };

    const buttonStyle = "px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

    interface DropdownItem {
        name: string;
        action: () => void;
    }

    const dropdownItems: { [key: string]: (string | DropdownItem)[] } = {
        feeMasters: ['Fee Type', 'Fee Installments', 'Assign Special Fee Type', 'Create Class Fee Structure', 'Update Student Fee Structure', 'Update Rebate Date'/*'Fee Category', 'Fee Type group',  'Special Fee Type',  'Remove Special Fee Type', 'Manage Bank Account', 'Assign Fee Group To Students', 'Transfer Fee Due', 'Fee Setting', 'Update Student Fee Group', 'Import Fee Group'*/],
        /*cheque: ['Manage Cheques', 'Fee PDC', 'Fee All PDC', 'Bounced Cheque Report', 'Cheque Date Report', 'Cheque Clearance Report'],*/
        concession: [
            { name: 'Concession Template', action: () => navigateTo('concession-master') },
            { name: 'Set Student Concession', action: () => navigateTo('student-concession') },
            /*{ name: 'Set Bulk Concession', action: () => console.log('Set Bulk Concession') },
            { name: 'Student Availing Concessions', action: () => console.log('Student Availing Concessions') },*/
            { name: 'Paid Concession Report', action: () => console.log('Paid Concession Report') },
            { name: 'Expected Concession Report', action: () => console.log('Expected Concession Report') },
        ],
        reports: ['Fee Report', 'Fee Summary Report', 'Fee Due Report', 'Fee Concession Report', 'Deleted Receipts', 'Petty-Cash Report', 'Adjust Fee Report', 'Nullify Fee', 'Nullify Fee Report'],
        voucher: ['Create Voucher', 'Voucher List', 'Transport Voucher'],
    };

    const renderDropdown = (name: string, items: (string | DropdownItem)[]) => (
        <div className="relative">
            <button onClick={() => handleDropdown(name)} onBlur={handleBlur} className={`${buttonStyle} flex items-center capitalize`}>
                {name.replace(/([A-Z])/g, ' $1').trim()} <ChevronDownIcon className="w-4 h-4 ml-1" />
            </button>
            {openDropdown === name && (
                <ul className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-30 text-gray-700 border max-h-60 overflow-y-auto">
                    {items.map((item, idx) => {
                        const label = typeof item === 'string' ? item : item.name;
                        const action = typeof item === 'string' ? () => handleMenuItemClick(item) : item.action;

                        return (
                            <li key={idx}>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        action();
                                    }}
                                    className="block px-4 py-2 text-sm hover:bg-gray-100"
                                >
                                    {label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin';

    return (
        <div className="w-full h-full flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center w-full flex-1 flex flex-col justify-center items-center">
                <div className="text-blue-100 mb-6 flex justify-center">
                    <div className="bg-blue-50 p-6 rounded-full">
                        <svg className="w-20 h-20 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-3xl font-bold text-slate-800 mb-4">Financial Dashboard</h3>
                <p className="text-slate-500 mb-8 text-lg max-w-xl text-center">
                    Manage fees, view reports, and handle petty cash all in one place.
                </p>
                <button
                    onClick={() => navigateTo('take-fee')}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-md font-semibold text-lg inline-flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Collect Fees Now
                </button>
            </div>
        </div>
    );
};

export default Fee;