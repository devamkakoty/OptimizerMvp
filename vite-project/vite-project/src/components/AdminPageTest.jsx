import React, { useState } from 'react';
import { Hpe, Moon, Sun } from 'grommet-icons';
import { Link } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import Sidebar from './Sidebar';

const AdminPageTest = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [activeSection, setActiveSection] = useState('administration');
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        activeTab={activeAdminTab}
        setActiveTab={setActiveAdminTab}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      }`}>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold text-gray-900 pt-2 pb-2 pl-2">
                <Hpe color="#01a982" />
              </span>
              <span className="text-xl font-semibold text-gray-900 dark:text-white pt-1">
                HPE Admin Panel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                to="/workload" 
                className="px-4 py-2 text-sm font-medium text-[#01a982] border border-[#01a982] rounded-lg hover:bg-[#01a982] hover:text-white transition-colors"
              >
                Back to GreenMatrix
              </Link>
              <button 
                onClick={toggleDarkMode}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isDarkMode ? <Sun color="#fbbf24" /> : <Moon color="#6b7280" />}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Current Section: {activeSection}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Active Tab: {activeAdminTab}
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Sidebar is {isCollapsed ? 'collapsed' : 'expanded'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPageTest;