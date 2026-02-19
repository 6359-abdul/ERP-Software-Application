import React, { useState } from 'react';
import { Page } from '../App';
import { ChevronDown } from 'lucide-react';

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
}

const NavDropdown: React.FC<DropdownProps> = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded transition-colors">
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

const Configuration: React.FC<ConfigurationProps> = ({ navigateTo }) => {
    const [activeTab, setActiveTab] = useState<string>('masters');

    const handleMastersClick = (masterType: string) => {
        console.log(`Selected Master: ${masterType}`);
        // Future implementation: Navigate to specific master management
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            {/* Logo or Icon could go here */}
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
                                items={[
                                    { label: "Departments", onClick: () => handleMastersClick("Departments") },
                                    { label: "Designations", onClick: () => handleMastersClick("Designations") },
                                    { label: "Week-off Policy", onClick: () => handleMastersClick("Week-off Policy") },
                                    { label: "Holiday Policy", onClick: () => handleMastersClick("Holiday Policy") },
                                    // Add more masters as needed
                                ]}
                            />
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-3 py-2 text-sm font-medium border rounded transition-colors ${activeTab === 'settings' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-violet-600 border-transparent hover:bg-violet-50'}`}
                            >
                                Setting
                            </button>
                            <button
                                onClick={() => setActiveTab('academic-year')}
                                className={`px-3 py-2 text-sm font-medium border rounded transition-colors ${activeTab === 'academic-year' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'text-violet-600 border-transparent hover:bg-violet-50'}`}
                            >
                                Academic Year
                            </button>
                            <button
                                onClick={() => setActiveTab('export-data')}
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
                    {activeTab === 'masters' && (
                        <div className="text-center text-gray-500 mt-20">
                            <h2 className="text-xl font-semibold text-gray-700">Masters Configuration</h2>
                            <p className="mt-2">Select a master from the dropdown to configure.</p>
                        </div>
                    )}
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
