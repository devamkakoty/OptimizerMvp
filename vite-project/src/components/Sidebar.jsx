import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../contexts/DarkModeContext';
import { Hpe, Hp } from 'grommet-icons';
import logo from '../assets/logo.png';
import {
  Home,
  Activity,
  Settings,
  ChevronRight,
  Menu,
  X,
  Zap,
  BarChart3,
  Cpu,
  DollarSign,
  Brain,
  Play,
  Target,
  Wrench,
  LayoutDashboardIcon,
  HandCoinsIcon,
  SparklesIcon,
  KeyboardMusicIcon,
  MonitorCogIcon,
  ClipboardList
} from 'lucide-react';

const Sidebar = ({ activeSection, setActiveSection, activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const navigationItems = [
    // User Goals (at the top)
    {
      id: 'user-goals',
      label: 'User Goals',
      icon: ClipboardList,
      type: 'single'
    },
    // Dashboard components
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboardIcon,
      type: 'single'
    },
    {
      id: 'performance',
      label: 'Performance Monitor',
      icon: BarChart3,
      type: 'single'
    },
    {
      id: 'processes',
      label: 'Process Metrics',
      icon: Activity,
      type: 'single'
    },
    {
      id: 'hardware',
      label: 'Hardware Management',
      icon: Cpu,
      type: 'single'
    },
    {
      id: 'costs',
      label: 'Cost Management',
      icon: HandCoinsIcon,
      type: 'single'
    },
    {
      id: 'models',
      label: 'AI Model Management',
      icon: SparklesIcon,
      type: 'single'
    },
    // GreenMatrix components
    {
      id: 'optimize',
      label: 'Hardware Recommendations',
      icon: Target,
      type: 'single'
    },
    {
      id: 'model',
      label: 'Model Optimizer',
      icon: MonitorCogIcon,
      type: 'single'
    }
  ];

  const handleItemClick = (item, child = null) => {
    // Handle User Goals and dashboard components
    if (['user-goals', 'dashboard', 'performance', 'hardware', 'costs', 'models'].includes(item.id)) {
      // Special handling for Process Metrics - navigate to dedicated page
      if (item.id === 'processes') {
        navigate('/processes');
        return;
      }

      // If we're already on Admin page, just switch tabs
      if (window.location.pathname === '/') {
        setActiveSection('administration');
        setActiveTab(item.id);
      } else {
        // Navigate to Admin page
        navigate('/');
      }
    }
    // Handle Process Metrics separately
    else if (item.id === 'processes') {
      navigate('/processes');
      return;
    }
    // Handle GreenMatrix components
    else if (['optimize', 'model'].includes(item.id)) {
      // If we're already on GreenMatrix page, just switch tabs
      if (window.location.pathname === '/workload') {
        setActiveSection('greenmatrix');
        setActiveTab(item.id);
      } else {
        // Navigate to GreenMatrix workload page
        navigate('/workload');
      }
    } else {
      setActiveSection(item.id);
      setActiveTab(child ? child.id : null);
    }
  };

  const isItemActive = (item, child = null) => {
    if (child) {
      return activeSection === item.id && activeTab === child.id;
    }

    // Handle User Goals and dashboard components
    if (['user-goals', 'dashboard', 'performance', 'hardware', 'costs', 'models'].includes(item.id)) {
      return activeSection === 'administration' && activeTab === item.id;
    }

    // Handle GreenMatrix components
    if (['optimize', 'model'].includes(item.id)) {
      return activeSection === 'greenmatrix' && activeTab === item.id;
    }

    // Handle Process Metrics
    if (item.id === 'processes') {
      return window.location.pathname === '/processes';
    }

    return activeSection === item.id;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-16 left-4 z-50 p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
      >
        {isCollapsed ? <Menu size={20} /> : <X size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`fixed left-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600 transition-all duration-300 z-40 flex flex-col ${
        isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'w-64'
        }`} style={{ top: '56px', height: 'calc(100vh - 108px)' }}>
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Desktop Collapse Button */}
          {!isCollapsed && (
            <div className="px-4 mb-2 relative max-w-xs mx-auto">
              {/* max-w-xs or adjust width as needed */}

              {/* Greeting container */}
              <div className="flex flex-col text-gray-700 dark:text-gray-300 p-4 rounded-md relative">
                <span className="text-xl font-bold">Hello,</span>
                <span className="text-xl font-bold">John!</span>

                {/* Spacer between John and Last logged */}
                <div className="h-3" />

                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Last logged in
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {new Date().toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}
                </span>

                {/* Chevron button positioned top right */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="absolute top-2 right-2 flex items-center p-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Collapse sidebar"
                >
                  <Menu size={26} className="rotate-180" />
                </button>
              </div>

            </div>
          )}
          {isCollapsed && (
            <div className="px-2 mb-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex items-center justify-center w-full p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <ul className="mx-4 text-xl rounded-lg overflow-hidden dark:bg-gray-800">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                      isActive ? 'bg-[#01a982] text-white' : 'text-gray-700 dark:text-gray-300'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 text-md">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* HPE Logo Footer */}
        {/* <div className="mt-auto p-4 border-t border-gray-300 dark:border-gray-600">
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <Hpe color="#16a34a" />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-2 mb-1">
                  <Hpe color="#16a34a" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-normal leading-relaxed" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Hewlett Packard</div>
                  <div className="text-xs font-normal text-gray-900 dark:text-gray-100 tracking-normal leading-relaxed" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>Enterprise</div>
                </div>
              </div>
            </div>
          )}
        </div> */}
      </div>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed left-0 right-0 bottom-0 bg-black bg-opacity-50 z-30"
          style={{ top: '56px' }}
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;