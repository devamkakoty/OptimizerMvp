import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  Home, 
  Activity, 
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Zap
} from 'lucide-react';

const Sidebar = ({ activeSection, setActiveSection, activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const [expandedSections, setExpandedSections] = useState({
    greenmatrix: false,
    administration: true // Keep administration expanded by default
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigationItems = [
    {
      id: 'greenmatrix',
      label: 'GreenMatrix',
      icon: Zap,
      type: 'expandable',
      children: [
        { id: 'simulate', label: 'Simulate Performance' },
        { id: 'optimize', label: 'Optimize Hardware' },
        { id: 'model', label: 'Model Optimizer' }
      ]
    },
    {
      id: 'administration',
      label: 'Dashboard',
      icon: Settings,
      type: 'expandable',
      children: [
        { id: 'dashboard', label: 'Admin Dashboard' },
        { id: 'hardware', label: 'Hardware Management' }
      ]
    }
  ];

  const handleItemClick = (item, child = null) => {
    if (item.type === 'expandable' && !child) {
      toggleSection(item.id);
    } else {
      if (item.id === 'administration') {
        if (child) {
          // If we're already on Admin page, just switch tabs
          if (window.location.pathname === '/') {
            setActiveSection('administration');
            setActiveTab(child.id);
          } else {
            // Navigate to Admin page
            navigate('/');
          }
        } else {
          // Navigate to Admin page
          navigate('/');
        }
      } else if (item.id === 'greenmatrix') {
        if (child) {
          // If we're already on GreenMatrix page, just switch tabs
          if (window.location.pathname === '/workload') {
            setActiveSection('greenmatrix');
            setActiveTab(child.id);
          } else {
            // Navigate to GreenMatrix workload page
            navigate('/workload');
          }
        } else {
          // Navigate to GreenMatrix workload page
          navigate('/workload');
        }
      } else {
        setActiveSection(item.id);
        setActiveTab(child ? child.id : null);
      }
    }
  };

  const isItemActive = (item, child = null) => {
    if (child) {
      return activeSection === item.id && activeTab === child.id;
    }
    return activeSection === item.id;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        {isCollapsed ? <Menu size={20} /> : <X size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
        isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'
      }`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              {!isCollapsed && (
                <span className="text-xl font-semibold">HPE Analytics</span>
              )}
            </div>
            {/* Desktop Collapse Button in Header */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedSections[item.id];
              const isActive = isItemActive(item);

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      isActive && item.type === 'single' ? 'bg-[#01a982] text-white' : 'text-gray-700 dark:text-gray-300'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.type === 'expandable' && (
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>

                  {/* Submenu */}
                  {item.type === 'expandable' && isExpanded && !isCollapsed && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <button
                            onClick={() => handleItemClick(item, child)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-r ${
                              isItemActive(item, child) 
                                ? 'bg-[#01a982] text-white border-l-2 border-[#00d4aa]' 
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {child.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Toggle Button (Desktop) */}
        <div className="hidden lg:block p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;