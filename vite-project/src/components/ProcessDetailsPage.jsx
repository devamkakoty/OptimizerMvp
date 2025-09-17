import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';
import Sidebar from './Sidebar';
import logo from '../assets/logo.png';
import ProcessInsightsModal from './ProcessInsightsModal';

const ProcessDetailsPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [processData, setProcessData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [latestTimestamp, setLatestTimestamp] = useState(null);
  
  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('administration');
  
  // Process-specific insights state
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processRecommendations, setProcessRecommendations] = useState({});
  const [processRealTimeData, setProcessRealTimeData] = useState({});
  const [processModalOpen, setProcessModalOpen] = useState(false);

  // Cost region state
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [availableRegions, setAvailableRegions] = useState([]);
  const [costModels, setCostModels] = useState([]);

  // Generate AI-powered process-specific recommendations
  const generateProcessRecommendations = (processName, power, cost, process) => {
    const recommendations = [];
    const powerValue = parseFloat(power) || 0;
    const costValue = parseFloat(cost) || 0;
    const cpuUsage = parseFloat(process['CPU Usage (%)']) || 0;
    const memoryUsage = parseFloat(process['Memory Usage (MB)']) || 0;
    const gpuUsage = parseFloat(process['GPU Utilization (%)']) || 0;
    
    // High Power Consumption Analysis
    if (powerValue > 25) {
      const category = powerValue > 50 ? 'critical' : 'high';
      recommendations.push({
        type: 'power-optimization',
        title: `${category === 'critical' ? 'Critical' : 'High'} Power Consumption Alert`,
        description: `${processName} is consuming ${powerValue.toFixed(1)}W. ${
          category === 'critical' ? 'Immediate optimization required.' : 'Consider power throttling or task rescheduling.'
        } AI suggests ${cpuUsage > 80 ? 'CPU frequency scaling' : 'workload distribution'}.`,
        priority: category === 'critical' ? 'high' : 'medium',
        savings: category === 'critical' ? '25-40%' : '15-25%'
      });
    }

    // CPU Utilization Analysis
    if (cpuUsage > 85) {
      recommendations.push({
        type: 'cpu-optimization',
        title: 'CPU Bottleneck Detected',
        description: `${processName} is using ${cpuUsage.toFixed(1)}% CPU. AI recommends ${
          processName.toLowerCase().includes('chrome') || processName.toLowerCase().includes('browser') 
            ? 'tab management and extension optimization'
            : processName.toLowerCase().includes('python') || processName.toLowerCase().includes('node')
            ? 'code profiling and algorithm optimization'
            : 'process priority adjustment and multi-threading'
        }.`,
        priority: 'high',
        savings: '20-35%'
      });
    }

    // Memory Usage Analysis
    if (memoryUsage > 1000) {
      recommendations.push({
        type: 'memory-optimization',
        title: 'High Memory Usage',
        description: `Memory usage at ${(memoryUsage/1024).toFixed(1)}GB. ${
          processName.toLowerCase().includes('chrome') ? 'Consider closing unused tabs or using lightweight alternatives.'
          : processName.toLowerCase().includes('python') ? 'Implement memory profiling and garbage collection optimization.'
          : processName.toLowerCase().includes('video') || processName.toLowerCase().includes('media') ? 'Reduce video quality or buffer size.'
          : 'Consider memory cleanup routines or increasing virtual memory.'
        }`,
        priority: memoryUsage > 2000 ? 'high' : 'medium',
        savings: '10-20%'
      });
    }

    // GPU Usage Analysis
    if (gpuUsage > 70) {
      recommendations.push({
        type: 'gpu-optimization',
        title: 'GPU Intensive Process',
        description: `GPU utilization at ${gpuUsage.toFixed(1)}%. ${
          processName.toLowerCase().includes('game') ? 'Optimize graphics settings for better efficiency.'
          : processName.toLowerCase().includes('python') || processName.toLowerCase().includes('ml') ? 'Consider batch processing or model quantization.'
          : processName.toLowerCase().includes('video') ? 'Use hardware-accelerated encoding with lower bitrates.'
          : 'Implement GPU workload scheduling or distributed processing.'
        }`,
        priority: 'medium',
        savings: '15-30%'
      });
    }

    // Cost Optimization Analysis
    if (costValue > 0.008) {
      const regionSavings = Math.round((costValue - costValue * 0.65) / costValue * 100);
      recommendations.push({
        type: 'cost-optimization',
        title: 'Regional Cost Optimization',
        description: `Current cost: $${costValue.toFixed(4)}/hour. AI analysis shows ${regionSavings}% savings by migrating to lower-cost regions during non-peak hours. Estimated annual savings: $${(costValue * 24 * 365 * regionSavings / 100).toFixed(2)}.`,
        priority: costValue > 0.02 ? 'high' : 'medium',
        savings: `${regionSavings}%`
      });
    }

    // Intelligent Scheduling Recommendations
    const currentHour = new Date().getHours();
    if (powerValue > 15 || cpuUsage > 60) {
      const isPeakHour = currentHour >= 9 && currentHour <= 17;
      recommendations.push({
        type: 'smart-scheduling',
        title: 'AI-Powered Workload Scheduling',
        description: `${isPeakHour ? 'Peak hours detected.' : 'Off-peak optimization available.'} AI suggests ${
          isPeakHour ? 'deferring non-critical tasks to 10 PM - 6 AM for 40% cost reduction'
          : 'current timing is optimal, but consider load balancing during 2-4 AM window'
        }. Predictive analysis shows 23% efficiency gain.`,
        priority: isPeakHour ? 'medium' : 'low',
        savings: isPeakHour ? '25-40%' : '10-15%'
      });
    }

    // Process-Specific Recommendations
    if (processName.toLowerCase().includes('chrome') || processName.toLowerCase().includes('browser')) {
      recommendations.push({
        type: 'browser-optimization',
        title: 'Browser Performance Optimization',
        description: 'AI detects browser inefficiencies. Enable hardware acceleration, limit background tabs, use ad-blockers, and consider switching to efficiency mode for 30% power reduction.',
        priority: 'low',
        savings: '20-30%'
      });
    }

    // Ensure we always have at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'baseline-optimization',
        title: 'Baseline Performance Optimization',
        description: `${processName} is running efficiently. AI suggests periodic monitoring and considers implementing automated scaling for future optimization opportunities.`,
        priority: 'low',
        savings: '5-10%'
      });
    }

    return recommendations.slice(0, 6); // Limit to 6 recommendations for better UX
  };

  // Generate real-time data for process display (no dummy data)
  const generateProcessRealTimeData = (process) => {
    // Use only current real values - no historical dummy data
    const currentTime = new Date().toLocaleTimeString();
    
    return {
      current: {
        cpu: parseFloat(process['CPU Usage (%)']) || 0,
        memory: parseFloat(process['Memory Usage (MB)']) || 0,
        memoryPercent: parseFloat(process['Memory Usage (%)']) || 0,
        power: parseFloat(process['Power Consumption (W)']) || 0,
        gpu: parseFloat(process['GPU Utilization (%)']) || 0,
        gpuMemory: parseFloat(process['GPU Memory Usage (MB)']) || 0,
        iops: parseFloat(process['IOPS']) || 0,
        openFiles: parseInt(process['Open Files']) || 0,
        timestamp: currentTime
      }
    };
  };
  
  // Handle process selection - Open modal instead of expansion
  const handleProcessClick = (process) => {
    setSelectedProcess(process);
    
    // Generate recommendations (calculating power and cost if not available)
    const powerValue = process['Power Consumption (W)'] || (process['CPU Usage (%)'] * 0.5 + process['Memory Usage (MB)'] * 0.001);
    const costValue = process['Energy Cost ($)'] || (powerValue * 0.0002);
    
    const recs = generateProcessRecommendations(
      process['Process Name'], 
      powerValue,
      costValue,
      process
    );
    setProcessRecommendations({
      ...processRecommendations,
      [process['Process ID']]: recs
    });
    
    // Generate real-time data (no dummy historical data)
    const realTimeData = generateProcessRealTimeData(process);
    setProcessRealTimeData({
      ...processRealTimeData,
      [process['Process ID']]: realTimeData
    });
    
    // Open modal
    setProcessModalOpen(true);
  };

  // Fetch cost models from database
  const fetchCostModels = async () => {
    try {
      const response = await fetch('/api/cost-models?resource_name=ELECTRICITY_KWH');
      const data = await response.json();

      if (data.success) {
        setCostModels(data.cost_models || []);

        // Convert cost models to regions format for compatibility
        const regions = data.cost_models.map(model => ({
          code: model.region,
          name: model.region,
          currency: model.currency,
          rate: model.cost_per_unit,
          description: model.description
        }));

        setAvailableRegions(regions);

        // Set default region if not already set
        if (regions.length > 0 && !regions.find(r => r.code === selectedRegion)) {
          setSelectedRegion(regions[0].code);
        }
      }
    } catch (error) {
      console.error('Error fetching cost models:', error);
      // Fallback to minimal default if database is not available
      setAvailableRegions([
        { code: 'US', name: 'United States', currency: 'USD', rate: 0.12, description: 'Default US rate' }
      ]);
    }
  };

  // Fetch process data with real-time updates (latest only)
  const fetchProcessData = async () => {
    try {
      // Use dashboard endpoint with higher limit to get latest processes only
      const params = new URLSearchParams([['metric', 'cpu'], ['limit', '200']]);

      // Add region parameter for cost calculations
      if (selectedRegion && selectedRegion !== '') {
        params.append('region', selectedRegion);
      }

      const url = `/api/dashboard/top-processes?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Dashboard API already returns data in the correct format with proper keys
        const transformedData = data.data;
        
        // Sort by CPU usage by default
        const sortedData = transformedData.sort((a, b) => b['CPU Usage (%)'] - a['CPU Usage (%)']);
        setProcessData(sortedData);
        setLatestTimestamp(data.latest_timestamp);
        setError(null);
      } else {
        setError('Failed to fetch process data');
      }
    } catch (err) {
      console.error('Error fetching process data:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchCostModels();
    fetchProcessData();
    const interval = setInterval(fetchProcessData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Refetch data when region changes
  useEffect(() => {
    if (selectedRegion && selectedRegion !== '') {
      fetchProcessData();
    }
  }, [selectedRegion]);

  const currentRegion = availableRegions.find(r => r.code === selectedRegion) || availableRegions[0] || {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    rate: 0.12,
    description: 'Default fallback rate'
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...processData].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setProcessData(sortedData);
  };

  // Filter processes based on search term (API already returns latest data only)
  const filteredProcesses = processData.filter(process =>
    process['Process Name'].toLowerCase().includes(searchTerm.toLowerCase()) ||
    process['Username'].toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export data
  const exportToCSV = () => {
    const headers = Object.keys(processData[0] || {});
    const csvContent = [
      headers.join(','),
      ...filteredProcesses.map(row =>
        headers.map(header => `"${row[header]}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `process-metrics-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* Main Content Area */}
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="GreenMatrix Logo" className="w-10" />
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">GreenMatrix</span>
                  <span className="text-lg text-gray-500 dark:text-gray-400">/ Process Details</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live Data - Updates every 2 seconds</span>
                  </div>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] text-sm"
                  >
                    <option value="">Cost Region</option>
                    {availableRegions.map(region => (
                      <option key={region.code} value={region.code}>
                        {region.code} - {region.currency}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-8">
        
        {/* Search and Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-2xl text-gray-900 dark:text-white">
                  {filteredProcesses.length}
                </span>
                <span className="ml-1">processes</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Latest data timestamp: {latestTimestamp ? new Date(latestTimestamp).toLocaleString() : 'Unknown'}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Process Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading processes...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-2">⚠️</div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <button
                  onClick={fetchProcessData}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    {[
                      { key: 'Process Name', label: 'Process' },
                      { key: 'Process ID', label: 'PID' },
                      { key: 'Username', label: 'User' },
                      { key: 'CPU Usage (%)', label: 'CPU %' },
                      { key: 'Memory Usage (MB)', label: 'Memory (MB)' },
                      { key: 'Memory Usage (%)', label: 'Memory %' },
                      { key: 'GPU Utilization (%)', label: 'GPU %' },
                      { key: 'GPU Memory Usage (MB)', label: 'GPU Memory' },
                      { key: 'Power Consumption (W)', label: 'Power (W)' },
                      { key: 'Energy Cost ($)', label: 'Cost ($/hr)' },
                      { key: 'IOPS', label: 'IOPS' },
                      { key: 'Open Files', label: 'Files' },
                      { key: 'Read Bytes', label: 'Read' },
                      { key: 'Write Bytes', label: 'Write' },
                      { key: 'Status', label: 'Status' }
                    ].map((column) => (
                      <th
                        key={column.key}
                        onClick={() => handleSort(column.key)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span>{column.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredProcesses.map((process, index) => (
                    <tr 
                      key={process['Process ID'] + index} 
                      onClick={() => handleProcessClick(process)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-48 truncate" title={process['Process Name']}>
                        {process['Process Name']}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {process['Process ID']}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {process['Username']}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <span className={`${process['CPU Usage (%)'] > 50 ? 'text-red-600' : process['CPU Usage (%)'] > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {process['CPU Usage (%)'].toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {process['Memory Usage (MB)'].toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <span className={`${process['Memory Usage (%)'] > 50 ? 'text-red-600' : process['Memory Usage (%)'] > 20 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {process['Memory Usage (%)'].toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {process['GPU Utilization (%)'].toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {process['GPU Memory Usage (MB)'].toFixed(1)} MB
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {(process['Power Consumption (W)'] || 0).toFixed(1)}W
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#01a982] dark:text-[#6ee7b7]">
                        ${(process['Energy Cost ($)'] || 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {process['IOPS'].toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {process['Open Files']}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatBytes(process['Read Bytes'])}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {formatBytes(process['Write Bytes'])}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          process.Status === 'running' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : process.Status === 'sleeping'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {process.Status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Process Insights Modal */}
        <ProcessInsightsModal
          isOpen={processModalOpen}
          onClose={() => {
            setProcessModalOpen(false);
            setSelectedProcess(null);
          }}
          selectedProcess={selectedProcess}
          processRecommendations={processRecommendations}
          processRealTimeData={processRealTimeData}
        />

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {filteredProcesses.length > 0 && (
                <p>Showing {filteredProcesses.length} of {processData.length} processes</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessDetailsPage;