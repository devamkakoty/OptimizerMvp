import React, { useState } from 'react';
import { Hpe, Moon, Sun, Notification, HelpOption, User} from 'grommet-icons';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useDarkMode } from '../contexts/DarkModeContext';
import SimulateTab from './SimulateTab';
import OptimizeTab from './OptimizeTab';
import ModelTab from './ModelTab';
import Sidebar from './Sidebar';

const AIWorkloadOptimizer = () => {
  const [activeTab, setActiveTab] = useState('simulate');
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Navigation state for sidebar
  const [activeSection, setActiveSection] = useState('greenmatrix');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white dark:bg-gray-800 w-full fixed top-0 z-50 border-b border-gray-300 dark:border-gray-700">
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} alt="HPE Logo" className="w-18 h-6" />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun color="#fbbf24" /> : <Moon color="#6b7280" />}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {isDarkMode ? <Notification size="20" color="#67655eff" /> : <Notification size="20" color="#6b7280" />}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {isDarkMode ? <HelpOption size="20" color="#67655eff" /> : <HelpOption size="20" color="#6b7280" />}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {isDarkMode ? <User size="20" color="#67655eff" /> : <User size="20" color="#6b7280" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Main Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
          }`}>

          {/* Content Area */}
          <div className="flex-1 overflow-auto pb-24">

            {/* Hero Section */}
            {/* <div className="bg-gradient-to-b from-green-50 to-white dark:from-[#0e2b1a] dark:to-gray-900">
            <div className="max-w-6xl mx-auto px-6 py-12 text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent mb-4">
                Green Matrix
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {activeTab === 'simulate' 
                  ? 'Simulate AI workload performance on different hardware configurations.'
                  : activeTab === 'optimize'
                  ? 'Find the most cost-effective hardware configuration and optimize running workloads.'
                  : activeTab === 'model'
                  ? 'Optimize your AI models for better performance and efficiency.'
                  : 'AI workload optimization and hardware recommendations.'}
              </p>
            </div>
          </div> */}

            {/* Tabs
            <div className="max-w-6xl mx-auto px-6 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('simulate')}
                    className={`flex-1 py-4 px-6 text-center font-medium transition-all ${activeTab === 'simulate'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Simulate Performance
                  </button>
                  <button
                    onClick={() => setActiveTab('optimize')}
                    className={`flex-1 py-4 px-6 text-center font-medium transition-all ${activeTab === 'optimize'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Recommend Hardware
                  </button>
                  <button
                    onClick={() => setActiveTab('model')}
                    className={`flex-1 py-4 px-6 text-center font-medium transition-all ${activeTab === 'model'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Model Optimizer
                  </button>
                </div>
              </div>
            </div> */}

            {/* Content */}
            <div className="w-full mx-auto px-6 mt-8 mb-8">
              {activeTab === 'simulate' && <SimulateTab />}
              {activeTab === 'optimize' && <OptimizeTab />}
              {activeTab === 'model' && <ModelTab />}
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full fixed bottom-0 left-0 mt-auto py-4 px-6 text-center z-50 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="w-full mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              &copy; {new Date().getFullYear()} Hewlett Packard Enterprise D evelopment LP
            </div>
            <div className="flex flex-wrap gap-8">
              <button className="text-black font-bold text-[18px] dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms
              </button>
              <button className="text-black font-bold text-[18px] dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Security
              </button>
              <button className="text-black font-bold text-[18px] dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy
              </button>
              <button className="text-black font-bold text-[18px] dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Feedback
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIWorkloadOptimizer;