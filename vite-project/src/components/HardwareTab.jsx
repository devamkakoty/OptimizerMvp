import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';

const HardwareTab = () => {
  const [activeHardwareTab, setActiveHardwareTab] = useState('gpu');
  const [hardwareData, setHardwareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch hardware data from API
  useEffect(() => {
    const fetchHardwareData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/hardware/');
        
        if (response.data.status === 'success') {
          setHardwareData(response.data.hardware_list || []);
        } else {
          setError('Failed to fetch hardware data');
        }
      } catch (err) {
        console.error('Error fetching hardware data:', err);
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchHardwareData();
  }, []);

  // Helper function to extract GPU brand from GPU string
  const getGpuBrand = (gpuString) => {
    if (!gpuString) return 'Unknown';
    if (gpuString.toLowerCase().includes('nvidia')) return 'NVIDIA';
    if (gpuString.toLowerCase().includes('amd') || gpuString.toLowerCase().includes('radeon')) return 'AMD';
    if (gpuString.toLowerCase().includes('intel')) return 'Intel';
    return 'Unknown';
  };

  // Helper function to extract CPU brand from CPU string
  const getCpuBrand = (cpuString) => {
    if (!cpuString) return 'Unknown';
    if (cpuString.toLowerCase().includes('intel')) return 'Intel';
    if (cpuString.toLowerCase().includes('amd')) return 'AMD';
    return 'Unknown';
  };

  // Filter hardware data for GPUs (has GPU field)
  const gpuData = hardwareData
    .filter(hw => hw.gpu && hw.gpu.trim() !== '')
    .map(hw => ({
      id: hw.id,
      gpuCount: hw.num_gpu || 1,
      brand: getGpuBrand(hw.gpu),
      model: hw.gpu,
      totalMemory: hw.gpu_memory_total_vram_mb || 0,
      powerUsage: hw.gpu_power_consumption || 0,
      graphicsClock: hw.gpu_graphics_clock || 0,
      memoryClock: hw.gpu_memory_clock || 0,
      smCores: hw.gpu_sm_cores || 0,
      cudaCores: hw.gpu_cuda_cores || 0,
      // Mock data for fields not available in API
      version: 'N/A',
      usedMemory: 0,
      freeMemory: hw.gpu_memory_total_vram_mb || 0,
      utilization: 0,
      memoryUtilization: 0,
      temperature: 25, // Default safe temp
    }));

  // Process hardware data for CPUs
  const cpuData = hardwareData.map(hw => ({
    id: hw.id,
    brand: getCpuBrand(hw.cpu),
    model: hw.cpu,
    physicalCores: hw.cpu_total_cores || 0,
    totalCores: hw.cpu_total_cores || 0,
    baseClock: hw.cpu_base_clock_ghz ? `${hw.cpu_base_clock_ghz}GHz` : 'N/A',
    maxFrequency: hw.cpu_max_frequency_ghz || 0,
    threadsPerCore: hw.cpu_threads_per_core || 1,
    powerConsumption: hw.cpu_power_consumption || 0,
    l1Cache: hw.l1_cache || 0,
    // Mock data for fields not available
    family: 0,
    modelFamily: 0,
    minFrequency: '0',
    currentSpeed: hw.cpu_base_clock_ghz || 0,
    coresPerSocket: hw.cpu_total_cores || 0,
    sockets: 1
  }));

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#01a982] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading hardware data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8 text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Hardware Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveHardwareTab('gpu')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
              activeHardwareTab === 'gpu'
                ? 'bg-[#01a982] text-white border-b-2 border-[#01a982]'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            GPU Management
          </button>
          <button
            onClick={() => setActiveHardwareTab('cpu')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
              activeHardwareTab === 'cpu'
                ? 'bg-[#01a982] text-white border-b-2 border-[#01a982]'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            CPU Management
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeHardwareTab === 'gpu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">GPU Hardware</h3>
                <p className="text-gray-600 dark:text-gray-300">Manage and monitor GPU resources</p>
              </div>
              <button className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors">
                Add GPU
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Utilization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Temperature</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Power</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {gpuData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No GPU hardware found in database
                      </td>
                    </tr>
                  ) : (
                    gpuData.map((gpu) => (
                    <tr key={gpu.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{gpu.brand}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={gpu.model}>{gpu.model}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Count: {gpu.gpuCount}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{gpu.totalMemory ? (gpu.totalMemory / 1024).toFixed(1) : 'N/A'} GB</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.freeMemory} MB available</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{gpu.utilization}% GPU</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.memoryUtilization}% Memory</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          gpu.temperature > 70 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          gpu.temperature > 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {gpu.temperature}°C
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{gpu.powerUsage} W</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{gpu.cudaCores || gpu.smCores || 'N/A'} Cores</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.graphicsClock || 0} MHz</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#01a982] hover:text-[#019670] mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeHardwareTab === 'cpu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">CPU Hardware</h3>
                <p className="text-gray-600 dark:text-gray-300">Manage and monitor CPU resources</p>
              </div>
              <button className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors">
                Add CPU
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Architecture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cpuData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No CPU hardware found in database
                      </td>
                    </tr>
                  ) : (
                    cpuData.map((cpu) => (
                    <tr key={cpu.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{cpu.brand}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={cpu.model}>{cpu.model ? cpu.model.split(' @ ')[0] : 'Unknown'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Power: {cpu.powerConsumption || 0}W</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.physicalCores} Physical</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cpu.totalCores} Total</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.baseClock} Base</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Max: {cpu.maxFrequency} GHz</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.threadsPerCore} Threads/Core</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cpu.sockets} Socket(s)</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#01a982] hover:text-[#019670] mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HardwareTab;