import React from 'react';
import { Page } from '../App';
import {
    TimeIcon,
    DocumentReportIcon,
    DownloadIcon,
    SearchIcon,
    HomeIcon,
    UserIcon,
    ChartBarIcon,
    DashboardIcon,
    SetupIcon,
    HeadphoneIcon,
} from './icons';

interface AdministrationProps {
    navigateTo: (page: Page) => void;
}

interface AdministrationModule {
    id: string;
    name: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    page?: Page;
    comingSoon?: boolean;
}

const Administration: React.FC<AdministrationProps> = ({ navigateTo }) => {
    const administrationModules: AdministrationModule[] = [
        {
            id: 'calendar',
            name: 'Calendar',
            icon: <TimeIcon className="w-8 h-8" />,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            comingSoon: true
        },
        {
            id: 'document',
            name: 'Document',
            icon: <DocumentReportIcon className="w-8 h-8" />,
            iconBg: 'bg-slate-50',
            iconColor: 'text-slate-600',
            comingSoon: true
        },
        {
            id: 'download',
            name: 'Download',
            icon: <DownloadIcon className="w-8 h-8" />,
            iconBg: 'bg-green-50',
            iconColor: 'text-green-600',
            comingSoon: true
        },
        {
            id: 'inquiry',
            name: 'Inquiry',
            icon: <SearchIcon className="w-8 h-8" />,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            comingSoon: true
        },
        {
            id: 'hostel',
            name: 'Hostel',
            icon: <HomeIcon className="w-8 h-8" />,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            comingSoon: true
        },
        {
            id: 'leave',
            name: 'Leave',
            icon: <TimeIcon className="w-8 h-8" />,
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-600',
            comingSoon: true
        },
        {
            id: 'library',
            name: 'Library',
            icon: <DocumentReportIcon className="w-8 h-8" />,
            iconBg: 'bg-pink-50',
            iconColor: 'text-pink-600',
            comingSoon: true
        },
        {
            id: 'student-attendance',
            name: 'Student Attendance',
            icon: <ChartBarIcon className="w-8 h-8" />,
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600',
            page: 'student-attendance'
        },
        {
            id: 'student',
            name: 'Student',
            icon: <UserIcon className="w-8 h-8" />,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            page: 'student-administration'
        },
        {
            id: 'summary',
            name: 'Summary',
            icon: <DashboardIcon className="w-8 h-8" />,
            iconBg: 'bg-cyan-50',
            iconColor: 'text-cyan-600',
            comingSoon: true
        },
        {
            id: 'attendance-staff',
            name: 'Attendance(Stf)',
            icon: <UserIcon className="w-8 h-8" />,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
            comingSoon: true
        },
        {
            id: 'staffs',
            name: 'Staffs',
            icon: <UserIcon className="w-8 h-8" />,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            comingSoon: true
        },
        {
            id: 'team',
            name: 'Team',
            icon: <UserIcon className="w-8 h-8" />,
            iconBg: 'bg-violet-50',
            iconColor: 'text-violet-600',
            comingSoon: true
        },
        {
            id: 'transport',
            name: 'Transport',
            icon: <HomeIcon className="w-8 h-8" />,
            iconBg: 'bg-yellow-50',
            iconColor: 'text-yellow-600',
            comingSoon: true
        },
        {
            id: 'alumni',
            name: 'Alumni',
            icon: <UserIcon className="w-8 h-8" />,
            iconBg: 'bg-lime-50',
            iconColor: 'text-lime-600',
            comingSoon: true
        },
        {
            id: 'post-jobs',
            name: 'Post Jobs',
            icon: <DocumentReportIcon className="w-8 h-8" />,
            iconBg: 'bg-fuchsia-50',
            iconColor: 'text-fuchsia-600',
            comingSoon: true
        },
        {
            id: 'survey',
            name: 'Survey',
            icon: <ChartBarIcon className="w-8 h-8" />,
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            comingSoon: true
        },
        {
            id: 'helpdesk',
            name: 'Helpdesk',
            icon: <HeadphoneIcon className="w-8 h-8" />,
            iconBg: 'bg-sky-50',
            iconColor: 'text-sky-600',
            comingSoon: true
        }
    ];

    const handleModuleClick = (module: AdministrationModule) => {
        if (module.page) {
            navigateTo(module.page);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Professional Header */}
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <SetupIcon className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
                            <p className="text-sm text-slate-600 mt-0.5">Take control of your school operations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {administrationModules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => handleModuleClick(module)}
                            disabled={module.comingSoon}
                            className={`group relative bg-white rounded-xl p-6 border border-slate-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ${module.comingSoon
                                    ? 'opacity-60 cursor-not-allowed'
                                    : 'hover:border-blue-300 hover:shadow-lg cursor-pointer'
                                }`}
                        >
                            {/* Icon */}
                            <div className={`${module.iconBg} ${module.iconColor} w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${!module.comingSoon && 'group-hover:scale-105'} transition-transform duration-200`}>
                                {module.icon}
                            </div>

                            {/* Module Name */}
                            <h3 className={`font-semibold text-slate-900 text-base mb-1 ${!module.comingSoon && 'group-hover:text-blue-600'} transition-colors`}>
                                {module.name}
                            </h3>

                            {/* Coming Soon Badge */}
                            {module.comingSoon && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    Coming Soon
                                </span>
                            )}

                            {/* Active Badge */}
                            {module.page && !module.comingSoon && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    Active
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Administration;