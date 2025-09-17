import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

const VMProcessMetrics = () => {
  const [vmProcessData, setVmProcessData] = useState([]);
  const [activeVMs, setActiveVMs] = useState([]);
  const [selectedVM, setSelectedVM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch active VMs
  const fetchActiveVMs = async () => {
    try {
      const response = await fetch('/api/v1/metrics/vms/active');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setActiveVMs(data.vms || []);
        if (data.vms && data.vms.length > 0 && !selectedVM) {
          setSelectedVM(data.vms[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching active VMs:', err);
      setError('Failed to fetch active VMs');
    }
  };

  // Fetch VM process metrics for selected VM
  const fetchVMProcessMetrics = async () => {
    if (!selectedVM) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/metrics/vm/${selectedVM}/processes?limit=20`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.processes) {
        // Process and format the data for display
        const processedData = data.processes.map(process => ({
          ...process,
          timestamp: new Date(process.timestamp).toLocaleTimeString(),
          cpu_usage_percent: parseFloat(process.cpu_usage_percent) || 0,
          memory_usage_mb: parseFloat(process.memory_usage_mb) || 0,
          memory_usage_percent: parseFloat(process.memory_usage_percent) || 0,
          gpu_utilization_percent: parseFloat(process.gpu_utilization_percent) || 0,
          estimated_power_watts: parseFloat(process.estimated_power_watts) || 0
        }));
        
        setVmProcessData(processedData);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching VM process metrics:', err);
      setError('Failed to fetch VM process metrics');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time data fetching
  useEffect(() => {
    // Fetch initial data
    fetchActiveVMs();
    
    // Set up interval for active VMs (every 10 seconds)
    const activeVMsInterval = setInterval(fetchActiveVMs, 10000);
    
    return () => clearInterval(activeVMsInterval);
  }, []);

  // Fetch process metrics when VM changes
  useEffect(() => {
    if (selectedVM) {
      fetchVMProcessMetrics();
      
      // Set up interval for process metrics (every 1 second)
      const processMetricsInterval = setInterval(fetchVMProcessMetrics, 1000);
      
      return () => clearInterval(processMetricsInterval);
    }
  }, [selectedVM]);

  // Group processes by name for aggregated view
  const getAggregatedProcessData = () => {
    const grouped = {};
    vmProcessData.forEach(process => {
      const key = process.process_name;
      if (!grouped[key]) {
        grouped[key] = {
          process_name: key,
          count: 0,
          total_cpu: 0,
          total_memory: 0,
          total_power: 0,
          max_cpu: 0,
          max_memory: 0,
          instances: []
        };
      }
      
      grouped[key].count += 1;
      grouped[key].total_cpu += process.cpu_usage_percent;
      grouped[key].total_memory += process.memory_usage_mb;
      grouped[key].total_power += process.estimated_power_watts;
      grouped[key].max_cpu = Math.max(grouped[key].max_cpu, process.cpu_usage_percent);
      grouped[key].max_memory = Math.max(grouped[key].max_memory, process.memory_usage_mb);
      grouped[key].instances.push(process);
    });

    return Object.values(grouped).map(group => ({
      ...group,
      avg_cpu: group.total_cpu / group.count,
      avg_memory: group.total_memory / group.count,
      avg_power: group.total_power / group.count
    }));
  };

  const aggregatedData = getAggregatedProcessData();

  // Chart colors
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  if (loading && vmProcessData.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading VM process metrics...</span>
        </div>
      </div>
    );
  }

  if (error && vmProcessData.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">⚠️ {error}</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Make sure the backend is running and VM metrics data is available.
          </p>
          <button 
            onClick={() => {
              setError(null);
              fetchActiveVMs();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              VM Process Metrics Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time process-level metrics for virtual machine instances
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* VM Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select VM:
              </label>
              <select
                value={selectedVM || ''}
                onChange={(e) => setSelectedVM(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              >
                <option value="">Select a VM</option>
                {activeVMs.map((vm, index) => (
                  <option key={index} value={vm}>
                    {vm}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'No data'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {selectedVM && vmProcessData.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Active Processes</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {vmProcessData.length}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">Avg CPU Usage</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {((vmProcessData.reduce((sum, p) => sum + p.cpu_usage_percent, 0) / vmProcessData.length) || 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Total Memory</div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {(vmProcessData.reduce((sum, p) => sum + p.memory_usage_mb, 0) / 1024).toFixed(1)}GB
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">Total Power</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {vmProcessData.reduce((sum, p) => sum + p.estimated_power_watts, 0).toFixed(1)}W
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      {selectedVM && vmProcessData.length > 0 && (
        <>
          {/* Process Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Usage Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                CPU Usage by Process
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="process_name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_cpu" fill="#8884d8" name="Avg CPU %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Memory Usage Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Memory Usage by Process
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="process_name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_memory" fill="#82ca9d" name="Avg Memory MB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Process Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Latest Process Metrics - {selectedVM}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Process
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      CPU %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Memory MB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      GPU %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Power W
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Seen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {vmProcessData.slice(0, 10).map((process, index) => (
                    <tr key={`${process.process_id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {process.process_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            PID: {process.process_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {process.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {process.cpu_usage_percent.toFixed(1)}%
                          </div>
                          <div className={`ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2`}>
                            <div 
                              className={`h-2 rounded-full ${
                                process.cpu_usage_percent > 80 ? 'bg-red-500' : 
                                process.cpu_usage_percent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, process.cpu_usage_percent)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {process.memory_usage_mb.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {process.gpu_utilization_percent.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {process.estimated_power_watts.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {process.timestamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {selectedVM && vmProcessData.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Process Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            No process metrics found for VM "{selectedVM}". The VM might be inactive or data collection hasn't started yet.
          </p>
          <button
            onClick={() => fetchVMProcessMetrics()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      )}

      {/* No VMs Available */}
      {activeVMs.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🖥️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Active VMs Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            No virtual machines are currently sending metrics data. Make sure VM monitoring is set up and running.
          </p>
          <button
            onClick={() => fetchActiveVMs()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh VM List
          </button>
        </div>
      )}
    </div>
  );
};

export default VMProcessMetrics;