import React, { useState, useEffect } from 'react';
import { Hpe, Moon, Sun } from 'grommet-icons';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import DatePicker from 'react-datepicker';
import { useDarkMode } from '../contexts/DarkModeContext';
import AdminDashboardNew from './AdminDashboardNew';
import HardwareTab from './HardwareTab';
import CostManagementTab from './CostManagementTab';
import PerformanceTab from './PerformanceTab';
import AIModelManagementTab from './AIModelManagementTab';
import Sidebar from './Sidebar';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';

const AdminPage = () => {
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard');
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('administration');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // State for API data
  const [apiData, setApiData] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noDataError, setNoDataError] = useState(null);

  // Fetch available dates from API
  const fetchAvailableDates = async () => {
    try {
      const response = await fetch('/api/host-process-metrics/available-dates?days_back=30');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.available_dates : [];
    } catch (err) {
      console.error('Error fetching available dates:', err);
      return [];
    }
  };

  // Fetch host process metrics from API
  const fetchHostMetrics = async (filters = {}, isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
        setInitialLoading(true);
      }
      let url = '/api/host-process-metrics';
      
      // Add query parameters if filters are provided
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching host metrics:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Transform API data to match expected format
  const transformApiData = (apiResponse) => {
    if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
      return {};
    }
    
    const transformedData = {};
    
    apiResponse.data.forEach(item => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      
      if (!transformedData[date]) {
        transformedData[date] = [];
      }
      
      transformedData[date].push({
        'Process Name': item.process_name || 'Unknown',
        'Process ID': item.process_id || 0,
        'Username': item.username || 'Unknown',
        'Status': item.status || 'running',
        'Start Time': item.timestamp,
        'CPU Usage (%)': parseFloat(item.cpu_usage_percent || 0),
        'Memory Usage (MB)': parseFloat(item.memory_usage_mb || 0),
        'Memory Usage (%)': parseFloat(item.memory_usage_percent || 0),
        'Read Bytes': parseInt(item.read_bytes || 0),
        'Write Bytes': parseInt(item.write_bytes || 0),
        'Open Files': parseInt(item.open_files || 0),
        'GPU Memory Usage (MB)': parseFloat(item.gpu_memory_usage_mb || 0),
        'GPU Utilization (%)': parseFloat(item.gpu_utilization_percent || 0),
        'IOPS': parseFloat(item.iops || 0)
      });
    });
    
    return transformedData;
  };

  // Fetch available dates once on mount
  useEffect(() => {
    const loadAvailableDates = async () => {
      const dates = await fetchAvailableDates();
      setAvailableDates(dates);
      
      // Set default to 'today' for live data, or latest available date
      if (dates.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const latestDate = dates[0]; // dates are sorted in descending order
        
        if (latestDate === today) {
          // Today's data is available - use live mode
          setSelectedDate('today');
          setSelectedCalendarDate(new Date());
        } else {
          // Use latest available date
          setSelectedDate(latestDate);
          setSelectedCalendarDate(new Date(latestDate));
        }
      }
    };
    
    loadAvailableDates();
  }, []);

  // Fetch data on component mount and set up auto-refresh
  useEffect(() => {
    const loadData = async (dateFilters = {}, isInitialLoad = false) => {
      const filters = { limit: 1000, ...dateFilters };
      const response = await fetchHostMetrics(filters, isInitialLoad);
      if (response) {
        const transformed = transformApiData(response);
        setApiData(transformed);
      }
    };
    
    // Load data immediately (initial load)
    loadData({}, true);
    
    // Set up auto-refresh every 2 seconds for real-time monitoring
    const interval = setInterval(loadData, 2000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'

  // Separate useEffect to handle date-specific data loading
  useEffect(() => {
    const loadDateSpecificData = async () => {
      if (selectedDate !== 'today') {
        setNoDataError(null);
        // For specific dates, fetch data for that day
        const startDate = selectedDate;
        const endDate = selectedDate;
        
        const response = await fetchHostMetrics({ 
          start_date: startDate, 
          end_date: endDate, 
          limit: 1000 
        });
        
        if (response && response.success && response.data && response.data.length > 0) {
          const transformed = transformApiData(response);
          setApiData(transformed);
        } else {
          // No data for selected date - switch to 'today' if current date has data
          const today = new Date().toISOString().split('T')[0];
          if (selectedDate === today) {
            // If today has no data, switch to live mode
            setSelectedDate('today');
            setNoDataError(null);
          } else {
            setApiData({});
            setNoDataError(`No data available for ${new Date(selectedDate).toLocaleDateString()}. Please select a different date.`);
          }
        }
      }
      // For 'today', the main useEffect with interval will handle the loading
    };

    loadDateSpecificData();
  }, [selectedDate]);
  
  const twoWeeksData = apiData;

  // Helper function to handle calendar date change
  const handleCalendarDateChange = (date) => {
    setSelectedCalendarDate(date);
    const dateString = date.toISOString().split('T')[0];
    // Check if the selected date exists in our available data
    if (availableDates.includes(dateString)) {
      setSelectedDate(dateString);
    } else {
      setSelectedDate('today'); // Fallback to today if date not available
    }
  };

  // Convert available dates to Date objects for the calendar
  const availableDateObjects = availableDates.map(dateStr => new Date(dateStr));
  const minDate = availableDateObjects[0];
  const maxDate = availableDateObjects[availableDateObjects.length - 1];
  
  // Get current process data based on selection
  const getCurrentProcessData = () => {
    if (loading) {
      return [];
    }
    
    if (error) {
      console.error('Error loading process data:', error);
      return [];
    }
    
    if (viewMode === 'week' && selectedWeek !== null) {
      // Aggregate week data
      const weekDates = availableDates.slice(selectedWeek * 7, (selectedWeek + 1) * 7);
      const aggregatedData = {};
      
      weekDates.forEach(date => {
        if (twoWeeksData[date]) {
          twoWeeksData[date].forEach(process => {
            const key = process['Process Name'];
            if (!aggregatedData[key]) {
              aggregatedData[key] = {
                ...process,
                'CPU Usage (%)': 0,
                'Memory Usage (MB)': 0,
                'IOPS': 0,
                count: 0
              };
            }
            aggregatedData[key]['CPU Usage (%)'] += process['CPU Usage (%)'];
            aggregatedData[key]['Memory Usage (MB)'] += process['Memory Usage (MB)'];
            aggregatedData[key]['IOPS'] += process['IOPS'];
            aggregatedData[key].count++;
          });
        }
      });
      
      return Object.values(aggregatedData).map(process => ({
        ...process,
        'CPU Usage (%)': parseFloat((process['CPU Usage (%)'] / process.count).toFixed(1)),
        'Memory Usage (MB)': parseFloat((process['Memory Usage (MB)'] / process.count).toFixed(2)),
        'Memory Usage (%)': parseFloat(((process['Memory Usage (MB)'] / process.count) / 16000 * 100).toFixed(2)),
        'IOPS': parseFloat((process['IOPS'] / process.count).toFixed(1))
      })).sort((a, b) => b['Memory Usage (MB)'] - a['Memory Usage (MB)']);
    } else {
      // Single day data
      const targetDate = selectedDate === 'today' ? availableDates[availableDates.length - 1] : selectedDate;
      return twoWeeksData[targetDate] || [];
    }
  };

  const processData = getCurrentProcessData();

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Full Width Header */}
      <header className="bg-white dark:bg-gray-800 w-full z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GreenMatrix Logo" className="w-10" />
            <span className="text-xl font-semibold text-gray-900 dark:text-white">GreenMatrix</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun color="#fbbf24" /> : <Moon color="#6b7280" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1">
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
        <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">

          {/* Hero Section */}
          {/* {activeSection === 'administration' && (
            <div className="bg-gradient-to-b from-[#ecfdf5] to-white dark:from-[#0e2b1a] dark:to-gray-900">
              <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#01a982] to-[#047857] bg-clip-text text-transparent mb-4">
                  {activeAdminTab === 'dashboard' ? 'Dashboard' : 
                   activeAdminTab === 'hardware' ? 'Hardware Management' : 'Cost Management'}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {activeAdminTab === 'dashboard' 
                    ? 'Monitor AI workload optimization and system performance metrics.'
                    : activeAdminTab === 'hardware'
                    ? 'Manage and configure system hardware components.'
                    : 'Manage regional pricing models for FinOps and cost optimization analysis.'
                  }
                </p>
              </div>
            </div>
          )} */}

          {/* Default Welcome for other sections */}
          {activeSection !== 'administration' && (
            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#01a982] to-[#047857] bg-clip-text text-transparent mb-4">
                  Welcome to HPE Analytics
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Analytics platform for monitoring and optimizing your infrastructure.
                </p>
              </div>
            </div>
          )}

          {/* Content based on active section */}
          {activeSection === 'administration' && (
            <>
              {/* Loading indicator - only show on initial load */}
              {initialLoading && (
                <div className="max-w-6xl mx-auto px-6 mt-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <div className="text-gray-600 dark:text-gray-300">Loading process metrics data...</div>
                  </div>
                </div>
              )}
              


              {/* Admin Content */}
              <div className="max-w-6xl mx-auto px-6 mt-4 mb-8 flex-1">
                {activeAdminTab === 'dashboard' && (
                  <AdminDashboardNew 
                    processData={processData} 
                    chartOptions={chartOptions}
                    viewMode={viewMode}
                    selectedDate={selectedDate}
                    selectedWeek={selectedWeek}
                    availableDates={availableDates}
                    setViewMode={setViewMode}
                    setSelectedDate={setSelectedDate}
                    setSelectedWeek={setSelectedWeek}
                    selectedCalendarDate={selectedCalendarDate}
                    setSelectedCalendarDate={setSelectedCalendarDate}
                    handleCalendarDateChange={handleCalendarDateChange}
                    minDate={minDate}
                    maxDate={maxDate}
                    availableDateObjects={availableDateObjects}
                    noDataError={noDataError}
                  />
                )}

                {activeAdminTab === 'performance' && (
                  <PerformanceTab />
                )}

                {activeAdminTab === 'hardware' && (
                  <HardwareTab />
                )}


                {activeAdminTab === 'costs' && (
                  <CostManagementTab />
                )}

                {activeAdminTab === 'models' && (
                  <AIModelManagementTab />
                )}
              </div>
            </>
          )}

          {/* Other sections content */}
          {activeSection !== 'administration' && (
            <div className="max-w-6xl mx-auto px-6 mt-8 mb-8 flex-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  This section is under development. More features coming soon!
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  &copy; {new Date().getFullYear()} Hewlett Packard Enterprise Development LP - Admin Portal
                </div>
                <div className="flex flex-wrap gap-4">
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                    System Docs
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                    Support
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                    API Reference
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;