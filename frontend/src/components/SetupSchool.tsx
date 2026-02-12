import React from 'react';
import { Page } from '../App';

interface SetupSchoolProps {
    navigateTo?: (page: Page) => void;
}

const SetupSchool: React.FC<SetupSchoolProps> = ({ navigateTo }) => {
    const modules = [
        {
            id: 'classes',
            title: 'Classes',
            description: 'Manage class divisions, sections, and class-specific configurations',
            icon: (
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="12" width="48" height="32" rx="2" fill="#E8F4F8" stroke="#3B82F6" strokeWidth="2" />
                    <path d="M16 20 L24 20 M16 26 L28 26 M16 32 L22 32" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="44" cy="26" r="6" fill="#F97316" />
                    <path d="M44 32 Q38 38 32 40 Q44 38 56 40 Q50 38 44 32" fill="#F97316" />
                    <circle cx="24" cy="48" r="4" fill="#3B82F6" />
                    <rect x="20" y="52" width="8" height="8" rx="1" fill="#3B82F6" />
                </svg>
            ),
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            hoverColor: 'hover:shadow-blue-200',
            onClick: () => {
                navigateTo?.('classes-management');
            }
        },
        {
            id: 'configuration',
            title: 'Configuration',
            description: 'System settings, preferences, and general configurations',
            icon: (
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="12" fill="#E8F4F8" stroke="#8B5CF6" strokeWidth="2" />
                    <circle cx="32" cy="32" r="6" fill="#8B5CF6" />
                    {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                        const rad = (angle * Math.PI) / 180;
                        const x1 = 32 + Math.cos(rad) * 16;
                        const y1 = 32 + Math.sin(rad) * 16;
                        const x2 = 32 + Math.cos(rad) * 24;
                        const y2 = 32 + Math.sin(rad) * 24;
                        return (
                            <g key={i}>
                                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
                                <circle cx={x2} cy={y2} r="3" fill="#8B5CF6" />
                            </g>
                        );
                    })}
                </svg>
            ),
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            hoverColor: 'hover:shadow-purple-200',
            onClick: () => {
                // Navigate to configuration page
                console.log('Navigate to Configuration');
            }
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h1 className="text-4xl font-bold text-gray-800">Setup your School</h1>
                    </div>
                    <p className="text-gray-600 text-lg ml-11">Configure your institution's core modules and settings</p>
                </div>

                {/* Module Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl">
                    {modules.map((module) => (
                        <div
                            key={module.id}
                            onClick={module.onClick}
                            className={`group relative bg-white rounded-2xl shadow-lg ${module.hoverColor} hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-2`}
                        >
                            {/* Gradient Background Accent */}
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${module.color} opacity-10 rounded-bl-full`}></div>

                            {/* Card Content */}
                            <div className="relative p-8">
                                {/* Icon Container */}
                                <div className={`${module.bgColor} w-24 h-24 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                                    {module.icon}
                                </div>

                                {/* Title */}
                                <h2 className={`text-2xl font-bold mb-3 bg-gradient-to-r ${module.color} bg-clip-text text-transparent`}>
                                    {module.title}
                                </h2>

                                {/* Description */}
                                <p className="text-gray-600 leading-relaxed">
                                    {module.description}
                                </p>

                                {/* Arrow Icon */}
                                <div className="mt-6 flex items-center text-gray-400 group-hover:text-gray-600 transition-colors">
                                    <span className="text-sm font-medium mr-2">Configure</span>
                                    <svg className="w-5 h-5 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </div>
                            </div>

                            {/* Hover Effect Border */}
                            <div className={`absolute inset-0 border-2 border-transparent group-hover:border-opacity-20 rounded-2xl transition-all duration-300 bg-gradient-to-r ${module.color} opacity-0 group-hover:opacity-10`}></div>
                        </div>
                    ))}
                </div>

                {/* Info Section */}
                <div className="mt-12 max-w-4xl">
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-2">Getting Started</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Start by configuring your <span className="font-medium text-blue-600">Classes</span> to organize students into different grades and sections.
                                    Then, use the <span className="font-medium text-purple-600">Configuration</span> module to set up system-wide preferences,
                                    academic years, and other essential settings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupSchool;
