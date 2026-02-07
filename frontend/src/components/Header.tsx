import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, LogoutIcon, MenuIcon, ArrowBackIcon, ArrowForwardIcon, HomeIcon } from './icons';
import { Page } from '../App';
import api from '../api';

interface HeaderProps {
  toggleSidebar: () => void;
  navigateTo: (page: Page) => void;
  onLogout: () => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean; 
  canGoForward: boolean;
}



const Header: React.FC<HeaderProps> = ({ toggleSidebar, navigateTo, onLogout, goBack, goForward, canGoBack, canGoForward }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // State for Location and Branch Logic
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(localStorage.getItem('currentLocation') || 'All');
  const [allBranchesData, setAllBranchesData] = useState<any[]>([]);
  const [dynamicBranchOptions, setDynamicBranchOptions] = useState<string[]>([]); // Unused but kept for reference

  // Dynamic Locations State
  const [locationData, setLocationData] = useState<any[]>([]);

  // Initialize selected location on mount
  useEffect(() => {
    if (user.role === 'Admin') {
      // Fetch All Branches with metadata
      api.get('/branches').then(res => {
        if (res.data.branches) {
          setAllBranchesData(res.data.branches);
        }
      }).catch(err => console.error("Header branch fetch error:", err));
    }
  }, []); // Run once

  // Calculate Branch Options based on Location
  let branchOptions = user?.allowed_branches?.map((b: any) => b.branch_name) || [];

  // If Admin and we have fetched metadata, use it for filtering
  if (user.role === 'Admin' && allBranchesData.length > 0) {
    if (selectedLocation === 'All') {
      // All Locations -> Show All Branches
      branchOptions = allBranchesData.map(b => b.branch_name);
      branchOptions = ["All", ...branchOptions]; // Ensure All/All Branches is there
    } else {
      // Specific Location -> Filter Branches using Dynamic Mapping
      const filtered = allBranchesData.filter(b => {
        const code = (b.location_code || '').toUpperCase();

        // Find the location name for this branch's code from loaded metadata
        const locObj = locationData.find((l: any) => l.code.toUpperCase() === code);
        const name = locObj ? locObj.name : 'Hyderabad'; // Fallback only if code not found

        return name === selectedLocation;
      });
      branchOptions = filtered.map(b => b.branch_name);

      if (branchOptions.length > 1) {
        branchOptions = ["Select Branch", ...branchOptions];
      } else if (branchOptions.length === 0) {
        // Edge case: no branches for location
        branchOptions = [];
      }
    }
  } else {
    // Revert to default user object logic if not admin or data not loaded (or for non-admin users)
    if (branchOptions.length === 0) {
      if (user?.branch) branchOptions = [user.branch];
      if (user?.role === 'Admin') branchOptions = ["All", ...branchOptions];
    }
    const hasMultiple = branchOptions.length > 1;
    const canViewAll = branchOptions.includes("All") || user?.role === 'Admin';
    if (hasMultiple && !branchOptions.includes("All Branches") && canViewAll) {
      branchOptions = ["All Branches", ...branchOptions.filter((b: string) => b !== 'All')];
    }
  }

  const showDropdown = user && (user.role === 'Admin' || branchOptions.length > 1);

  const [selectedYear, setSelectedYear] = useState(localStorage.getItem('academicYear') || '');
  const [currentBranch, setCurrentBranch] = useState(() => {
    return localStorage.getItem('currentBranch') || user.branch || 'All';
  });

  const handleYearChange = (year: string) => {
    localStorage.setItem('academicYear', year);
    setSelectedYear(year);
    setYearDropdownOpen(false);
    window.location.reload();
  };

  const handleLocationChange = (loc: string) => {
    localStorage.setItem('currentLocation', loc);
    setSelectedLocation(loc);
    setLocationDropdownOpen(false);

    // Auto-select first branch for this location
    let newBranch = 'All';
    if (loc !== 'All' && allBranchesData.length > 0) {
      const filtered = allBranchesData.filter(b => {
        const code = (b.location_code || '').toUpperCase();

        // Dynamic Lookup
        const locObj = locationData.find((l: any) => l.code.toUpperCase() === code);
        const name = locObj ? locObj.name : 'Hyderabad';

        return name === loc;
      });
      if (filtered.length > 0) {
        newBranch = filtered[0].branch_name;
      }
    } else {
      newBranch = 'All';
    }

    localStorage.setItem('currentBranch', newBranch);
    setCurrentBranch(newBranch);

    window.location.reload();
  };

  const handleBranchChange = (branchCode: string) => {
    // If "All Branches" is selected (in Hyderabad context), it essentially means branch="All" 
    // but the backend might interpret "All" as GLOBAL All.
    // However, backend logic (e.g. ClassFeeStructure) checks location too if branch is All.
    // So if Location=Hyderabad and Branch=All, backend should handle it (I verified some backend logic uses location filter).

    const val = branchCode === 'All Branches' ? 'All' : branchCode;
    localStorage.setItem('currentBranch', val);
    setCurrentBranch(val);
    setBranchDropdownOpen(false);
    window.location.reload();
  };

  // Dynamic Academic Years
  const [academicYearOptions, setAcademicYearOptions] = useState<string[]>([]);

  useEffect(() => {
    api.get('/org/academic-years')
      .then(res => {
        const yearsList = res.data.academic_years || [];
        setAcademicYearOptions(yearsList.map((y: any) => y.name));

        // Auto-select first year if localStorage is empty
        const storedYear = localStorage.getItem('academicYear');
        if (!storedYear && yearsList.length > 0) {
          const firstYear = yearsList[0].name;
          localStorage.setItem('academicYear', firstYear);
          setSelectedYear(firstYear);
        }
      })
      .catch(err => console.error("Failed to load academic years in Header", err));
  }, []);

  const years = academicYearOptions.length > 0 ? academicYearOptions : [];

  // Dynamic Locations
  const [locationList, setLocationList] = useState<string[]>(['All']);

  useEffect(() => {
    // Fetch Locations if Admin
    if (user.role === 'Admin') {
      api.get('/org/locations')
        .then(res => {
          const locs = res.data.locations || [];
          setLocationData(locs);
          const names = locs.map((l: any) => l.name);
          setLocationList(['All', ...names]);
        })
        .catch(err => console.error("Failed to load locations in Header", err));
    }
  }, [user.role]);

  return (
    <header className="bg-green-700 text-white shadow-md z-20">
      <nav className="container-fluid mx-auto px-4">
        {/* ... (existing nav structure) ... */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* ... (existing sidebar toggle and logo) ... */}
            <button onClick={toggleSidebar} className="text-white hover:bg-green-600 p-2 rounded-md focus:outline-none md:hidden mr-2">
              <MenuIcon className="w-6 h-6" />
            </button>
            <a href="#" onClick={() => navigateTo('dashboard')} className="flex items-center space-x-3">
              <img src="https://www.mshifzacademy.com/assets/images/ms-logo.jpg" alt="MS Education Academy Logo" className="h-12" />
            </a>
            <div className="hidden md:flex items-center ml-4">

            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">

            {/* Location Dropdown (Admin Only) */}
            {user.role === 'Admin' && (
              <div className="relative mr-2">
                <button
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                  onBlur={() => setTimeout(() => setLocationDropdownOpen(false), 200)}
                  className="flex items-center space-x-1 hover:bg-green-600 p-2 rounded-md focus:outline-none"
                >
                  <span className="font-semibold">{selectedLocation === 'All' ? 'All Locations' : selectedLocation}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                {locationDropdownOpen && (
                  <ul className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-700">
                    {locationList.map(loc => (
                      <li key={loc}>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); handleLocationChange(loc); }}
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${selectedLocation === loc ? 'font-bold text-green-700 bg-green-100' : ''}`}
                        >
                          {loc === 'All' ? 'All Locations' : loc}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Branch Dropdown */}
            {showDropdown ? (
              <div className="relative">
                <button
                  onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                  onBlur={() => setTimeout(() => setBranchDropdownOpen(false), 200)}
                  className="flex items-center space-x-1 hover:bg-green-600 p-2 rounded-md focus:outline-none"
                >
                  <span className="font-semibold">{currentBranch === 'All' ? 'All Branches' : currentBranch}</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                {branchDropdownOpen && (
                  <ul className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-700 max-h-60 overflow-auto">
                    {branchOptions.map((branch: string) => (
                      <li key={branch}>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); handleBranchChange(branch === 'All Branches' ? 'All' : branch); }}
                          className={`block px-4 py-2 text-sm hover:bg-gray-100 ${currentBranch === (branch === 'All Branches' ? 'All' : branch) ? 'font-bold text-green-700' : ''}`}
                        >
                          {branch}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              // Single Branch Display
              <div className="flex items-center space-x-1 p-2 rounded-md">
                <span className="font-semibold">{currentBranch === 'All' ? 'All Branches' : currentBranch}</span>
              </div>
            )}

            {/* Year Dropdown */}
            <div className="relative">
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                onBlur={() => setTimeout(() => setYearDropdownOpen(false), 150)}
                className="flex items-center space-x-1 hover:bg-green-600 p-2 rounded-md focus:outline-none"
              >
                <span>{selectedYear}</span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              {yearDropdownOpen && (
                <ul className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-30 text-gray-700">
                  {years.map(year => (
                    <li key={year}>
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); handleYearChange(year); }}
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        {year}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>




            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                onBlur={() => setTimeout(() => setProfileDropdownOpen(false), 150)}
                className="flex items-center space-x-2 focus:outline-none hover:bg-green-600 p-1 rounded-md"
              >
                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpve8QCCPBiCCxagjx5ei3qUSB_7UyDEepfg&s" alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                <span className="hidden md:inline">{JSON.parse(localStorage.getItem('user') || '{}').username || 'User'}</span>
                <ChevronDownIcon className="w-4 h-4" />
              </button>
              {profileDropdownOpen && (
                <ul className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30 text-gray-700">
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('profile'); setProfileDropdownOpen(false); }} className="flex items-center px-4 py-2 text-sm hover:bg-gray-100">
                      <UserIcon className="w-4 h-4 mr-2" /> Profile
                    </a>
                  </li>
                  <li>
                    <button onClick={onLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none">
                      <LogoutIcon className="w-4 h-4 mr-2" /> Logout
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;