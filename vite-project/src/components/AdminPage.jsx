import React, { useState, useEffect } from 'react';
import { Hpe, Moon, Sun } from 'grommet-icons';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { useDarkMode } from '../contexts/DarkModeContext';
import AdminDashboard from './AdminDashboard';
import HardwareTab from './HardwareTab';
import CostManagementTab from './CostManagementTab';
import PerformanceTab from './PerformanceTab';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch host process metrics from API
  const fetchHostMetrics = async (filters = {}) => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/api/host-process-metrics';
      
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

  // Fetch data on component mount and set up auto-refresh
  useEffect(() => {
    const loadData = async () => {
      const response = await fetchHostMetrics({ limit: 1000 });
      if (response) {
        const transformed = transformApiData(response);
        setApiData(transformed);
      }
    };
    
    // Load data immediately
    loadData();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  
  const twoWeeksData = apiData;
  const availableDates = Object.keys(twoWeeksData).sort();

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
                <Hpe color="#16a34a" />
              </span>
              <span className="text-xl font-semibold text-gray-900 dark:text-white pt-1">
                HPE Panel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                to="/workload" 
                className="px-4 py-2 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
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
        <div className="flex-1 overflow-auto">
          {/* Breadcrumb */}
          <div className="px-6 py-4 bg-white dark:bg-gray-800">
            <Breadcrumb 
              activeSection={activeSection}
              activeTab={activeAdminTab}
              viewMode={viewMode}
              selectedDate={selectedDate}
              selectedWeek={selectedWeek}
              availableDates={availableDates}
            />
          </div>

          {/* Hero Section */}
          {/* {activeSection === 'administration' && (
            <div className="bg-gradient-to-b from-green-50 to-white dark:from-[#0e2b1a] dark:to-gray-900">
              <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-4">
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-4">
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
              {/* Loading indicator */}
              {loading && (
                <div className="max-w-6xl mx-auto px-6 mt-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <div className="text-gray-600 dark:text-gray-300">Loading process metrics data...</div>
                  </div>
                </div>
              )}
              
              {/* Error indicator */}
              {error && (
                <div className="max-w-6xl mx-auto px-6 mt-6">
                  <div className="bg-red-50 dark:bg-red-900 rounded-xl shadow-sm border border-red-200 dark:border-red-700 p-6 text-center">
                    <div className="text-red-600 dark:text-red-300">Error loading data: {error}</div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Date/Week Selection Controls - Only show for dashboard tab */}
              {activeAdminTab === 'dashboard' && !loading && !error && (
                <div className="max-w-6xl mx-auto px-6 mt-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      
                      {/* View Mode Toggle */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">View Mode:</label>
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                          <button
                            onClick={() => {
                              setViewMode('day');
                              setSelectedWeek(null);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                              viewMode === 'day'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Daily View
                          </button>
                          <button
                            onClick={() => {
                              setViewMode('week');
                              setSelectedWeek(0);
                              setSelectedDate('today');
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                              viewMode === 'week'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Weekly View
                          </button>
                        </div>
                      </div>

                      {/* Date/Week Selection */}
                      {viewMode === 'day' ? (
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date:</label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => {
                                setSelectedDate('today');
                                setSelectedCalendarDate(maxDate);
                              }}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                selectedDate === 'today'
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-600'
                              }`}
                            >
                              Latest
                            </button>
                            <div className="relative">
                              <DatePicker
                                selected={selectedCalendarDate}
                                onChange={handleCalendarDateChange}
                                minDate={minDate}
                                maxDate={maxDate}
                                includeDates={availableDateObjects}
                                dateFormat="MMM dd, yyyy"
                                placeholderText="Choose a date..."
                                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-600 focus:border-green-600 w-full sm:w-auto"
                                calendarClassName="dark:bg-gray-800 dark:border-gray-600"
                                dayClassName={(date) => 
                                  availableDates.includes(date.toISOString().split('T')[0])
                                    ? "hover:bg-green-600 hover:text-white cursor-pointer"
                                    : "text-gray-300 cursor-not-allowed"
                                }
                                customInput={
                                  <div className="relative cursor-pointer">
                                    <input
                                      className="px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-green-600 focus:border-green-600 w-full sm:w-auto cursor-pointer"
                                      readOnly
                                    />
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Week:</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedWeek(0)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                selectedWeek === 0
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-600'
                              }`}
                            >
                              Week 1 (Jul 16-22)
                            </button>
                            <button
                              onClick={() => setSelectedWeek(1)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                selectedWeek === 1
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-600'
                              }`}
                            >
                              Week 2 (Jul 23-29)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Current Selection Display */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {viewMode === 'day' ? (
                          selectedDate === 'today' ? 
                            `Showing: Latest Data (${new Date(availableDates[availableDates.length - 1]).toLocaleDateString()})` :
                            `Showing: ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
                        ) : (
                          `Showing: Week ${(selectedWeek || 0) + 1} Average (${selectedWeek === 0 ? '7 days' : '7 days'})`
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Content */}
              <div className="max-w-6xl mx-auto px-6 mt-8 mb-8 flex-1">
                {activeAdminTab === 'dashboard' && (
                  <AdminDashboard 
                    processData={processData} 
                    chartOptions={chartOptions}
                    viewMode={viewMode}
                    selectedDate={selectedDate}
                    selectedWeek={selectedWeek}
                    availableDates={availableDates}
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
  );
};

export default AdminPage;