import React from 'react';
import {
  DashboardIcon, AcademicIcon, FinancialIcon, AdministrationIcon, SetupIcon, HeadphoneIcon, UserIcon
} from './icons';
import { Page } from "../App";


interface SidebarProps { 
  isOpen: boolean;
  toggleSidebar: () => void;
  navigateTo: (page: Page) => void;
  currentPage: Page;
}

// FIX: Explicitly type `navCategories` to ensure `cat.page` is of type `Page`.
const navCategories: { title: string; icon: React.ReactNode; page: Page }[] = [
  { title: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" />, page: 'dashboard' },
  { title: 'Academic', icon: <AcademicIcon className="w-5 h-5" />, page: 'academic' },
  { title: 'Financial', icon: <FinancialIcon className="w-5 h-5" />, page: 'fee' },
  { title: 'Administration', icon: <AdministrationIcon className="w-5 h-5" />, page: 'administration' },
  { title: 'Setup Your School', icon: <SetupIcon className="w-5 h-5" />, page: 'setup' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, navigateTo, currentPage }) => {
  return (
    <aside className={`flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isOpen ? 'w-64' : 'w-0 overflow-hidden md:w-20'} md:relative absolute h-full z-10 md:z-auto`}>
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <span className={`font-semibold text-violet-700 ${!isOpen && 'md:hidden'}`}>Menu</span>
        <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-100 focus:outline-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600">
            <path fillRule="evenodd" clipRule="evenodd" d="M1.875 12.0003C1.875 11.7019 1.99353 11.4157 2.2045 11.2048C2.41548 10.9938 2.70163 10.8753 3 10.8753H18.285L14.205 6.79526C14.0063 6.582 13.8981 6.29993 13.9032 6.00847C13.9084 5.71702 14.0264 5.43894 14.2326 5.23283C14.4387 5.02671 14.7168 4.90864 15.0082 4.9035C15.2997 4.89835 15.5817 5.00654 15.795 5.20526L21.795 11.2053C22.0057 11.4162 22.124 11.7021 22.124 12.0003C22.124 12.2984 22.0057 12.5843 21.795 12.7953L15.795 18.7953C15.692 18.9058 15.5678 18.9944 15.4298 19.0559C15.2918 19.1174 15.1428 19.1505 14.9918 19.1531C14.8407 19.1558 14.6907 19.128 14.5506 19.0714C14.4105 19.0149 14.2833 18.9306 14.1764 18.8238C14.0696 18.717 13.9854 18.5897 13.9288 18.4497C13.8722 18.3096 13.8444 18.1595 13.8471 18.0085C13.8498 17.8574 13.8828 17.7084 13.9443 17.5705C14.0058 17.4325 14.0945 17.3083 14.205 17.2053L18.285 13.1253H3C2.70163 13.1253 2.41548 13.0067 2.2045 12.7958C1.99353 12.5848 1.875 12.2986 1.875 12.0003Z" fill="#464646" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-500">School Code: <span className="font-semibold text-gray-800">msacademy</span></p>
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navCategories.map((cat) => (
          <a
            key={cat.title}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateTo(cat.page); }}
            className={`flex items-center p-2 text-sm font-medium rounded-md group ${cat.page === currentPage ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            {cat.icon}
            <span className={`ml-3 whitespace-nowrap ${!isOpen && 'md:hidden'}`}>{cat.title}</span>
          </a>
        ))}

        <div className={`pt-4 mt-4 border-t border-gray-200 ${!isOpen && 'md:hidden'}`}>
          <a href="#" className="flex items-center p-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
            <HeadphoneIcon className="w-5 h-5" />
            <span className="ml-3">Staff Support</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('profile'); }} className="flex items-center p-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
            <UserIcon className="w-5 h-5" />
            <span className="ml-3">My Details</span>
          </a>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;