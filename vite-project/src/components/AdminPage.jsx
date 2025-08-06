import React, { useState } from 'react';
import { Hpe, Moon, Sun } from 'grommet-icons';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { useDarkMode } from '../contexts/DarkModeContext';
import AdminDashboard from './AdminDashboard';
import HardwareTab from './HardwareTab';
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

  // Generate two weeks of dummy data
  const generateTwoWeeksData = () => {
    const data = {};
    const baseDate = new Date('2025-07-16'); // Starting from July 16, 2025
    
    const processTemplates = [
      { name: 'Code.exe', baseCpu: 9, baseMemory: 1200, baseIOPS: 25, files: 20, pid: 20452 },
      { name: 'pythonw.exe', baseCpu: 1, baseMemory: 580, baseIOPS: 3, files: 6, pid: 19092 },
      { name: 'chrome.exe', baseCpu: 2, baseMemory: 490, baseIOPS: 35, files: 28, pid: 6872 },
      { name: 'firefox.exe', baseCpu: 5, baseMemory: 350, baseIOPS: 45, files: 15, pid: 12345 },
      { name: 'node.exe', baseCpu: 3, baseMemory: 300, baseIOPS: 22, files: 12, pid: 11111 },
      { name: 'teams.exe', baseCpu: 3, baseMemory: 270, baseIOPS: 38, files: 18, pid: 22222 },
      { name: 'outlook.exe', baseCpu: 2, baseMemory: 235, baseIOPS: 15, files: 8, pid: 33333 },
      { name: 'discord.exe', baseCpu: 4, baseMemory: 190, baseIOPS: 27, files: 14, pid: 44444 },
      { name: 'spotify.exe', baseCpu: 1, baseMemory: 157, baseIOPS: 12, files: 6, pid: 55555 },
      { name: 'notepad.exe', baseCpu: 0.5, baseMemory: 125, baseIOPS: 5, files: 3, pid: 66666 },
      { name: 'calculator.exe', baseCpu: 0.2, baseMemory: 98, baseIOPS: 8, files: 2, pid: 77777 },
      { name: 'explorer.exe', baseCpu: 2, baseMemory: 88, baseIOPS: 18, files: 25, pid: 88888 },
      { name: 'winrar.exe', baseCpu: 6, baseMemory: 76, baseIOPS: 42, files: 4, pid: 99999 },
      { name: 'vlc.exe', baseCpu: 3, baseMemory: 65, baseIOPS: 20, files: 7, pid: 10001 },
      { name: 'steam.exe', baseCpu: 4, baseMemory: 55, baseIOPS: 30, files: 12, pid: 10002 }
    ];

    for (let day = 0; day < 14; day++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(baseDate.getDate() + day);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Create variation factors for each day
      const dayVariation = 0.8 + (Math.sin(day * 0.5) * 0.3) + (Math.random() * 0.4);
      const weekendFactor = currentDate.getDay() === 0 || currentDate.getDay() === 6 ? 0.7 : 1.0;
      
      data[dateKey] = processTemplates.map((template, index) => {
        const processVariation = 0.7 + (Math.random() * 0.6);
        const timeOfDay = 8 + (Math.random() * 8); // 8 AM to 4 PM
        
        const cpuUsage = Math.max(0.1, (template.baseCpu * dayVariation * weekendFactor * processVariation));
        const memoryUsage = template.baseMemory * (0.9 + Math.random() * 0.2);
        const iops = Math.max(1, template.baseIOPS * dayVariation * processVariation);
        
        return {
          'Process Name': template.name,
          'Process ID': template.pid + day,
          'Username': 'MSI\\USER',
          'Status': Math.random() > 0.05 ? 'running' : 'sleeping',
          'Start Time': `${dateKey} ${Math.floor(timeOfDay).toString().padStart(2, '0')}:${Math.floor((timeOfDay % 1) * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
          'CPU Usage (%)': parseFloat(cpuUsage.toFixed(1)),
          'Memory Usage (MB)': parseFloat(memoryUsage.toFixed(2)),
          'Memory Usage (%)': parseFloat((memoryUsage / 16000 * 100).toFixed(2)),
          'Read Bytes': Math.floor(Math.random() * 1000000000),
          'Write Bytes': Math.floor(Math.random() * 500000000),
          'Open Files': template.files + Math.floor(Math.random() * 10),
          'GPU Memory Usage (MB)': template.name.includes('chrome') || template.name.includes('steam') ? Math.floor(Math.random() * 100) : 0,
          'GPU Utilization (%)': template.name.includes('chrome') || template.name.includes('steam') ? Math.floor(Math.random() * 20) : 0,
          'IOPS': parseFloat(iops.toFixed(1))
        };
      });
    }
    
    return data;
  };

  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  
  const twoWeeksData = generateTwoWeeksData();
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
    if (viewMode === 'week' && selectedWeek) {
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
          {activeSection === 'administration' && (
            <div className="bg-gradient-to-b from-green-50 to-white dark:from-[#0e2b1a] dark:to-gray-900">
              <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#01a982] to-[#00d4aa] bg-clip-text text-transparent mb-4">
                  {activeAdminTab === 'dashboard' ? 'Admin Dashboard' : 'Hardware Management'}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  {activeAdminTab === 'dashboard' 
                    ? 'Monitor AI workload optimization and system performance metrics.'
                    : 'Manage and configure system hardware components.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Default Welcome for other sections */}
          {activeSection !== 'administration' && (
            <div className="bg-gradient-to-b from-blue-50 to-white dark:from-[#0e1b2b] dark:to-gray-900">
              <div className="max-w-6xl mx-auto px-6 py-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#01a982] to-[#00d4aa] bg-clip-text text-transparent mb-4">
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
              {/* Date/Week Selection Controls - Only show for dashboard tab */}
              {activeAdminTab === 'dashboard' && (
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
                                ? 'bg-[#01a982] text-white shadow-sm'
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
                                ? 'bg-[#01a982] text-white shadow-sm'
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
                                  ? 'bg-[#01a982] text-white border-[#01a982]'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#01a982]'
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
                                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] w-full sm:w-auto"
                                calendarClassName="dark:bg-gray-800 dark:border-gray-600"
                                dayClassName={(date) => 
                                  availableDates.includes(date.toISOString().split('T')[0])
                                    ? "hover:bg-[#01a982] hover:text-white cursor-pointer"
                                    : "text-gray-300 cursor-not-allowed"
                                }
                                customInput={
                                  <div className="relative cursor-pointer">
                                    <input
                                      className="px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] w-full sm:w-auto cursor-pointer"
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
                                  ? 'bg-[#01a982] text-white border-[#01a982]'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#01a982]'
                              }`}
                            >
                              Week 1 (Jul 16-22)
                            </button>
                            <button
                              onClick={() => setSelectedWeek(1)}
                              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                                selectedWeek === 1
                                  ? 'bg-[#01a982] text-white border-[#01a982]'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#01a982]'
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

                {activeAdminTab === 'hardware' && (
                  <HardwareTab />
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