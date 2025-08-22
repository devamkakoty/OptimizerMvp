import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';

const HardwareTab = () => {
  const [hardwareData, setHardwareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch hardware data from API
  useEffect(() => {
    const fetchHardwareData = async () => {
      try {
        setLoading(true);
        console.log('Fetching hardware data from /hardware/');
        console.log('API Base URL:', apiClient.defaults.baseURL);
        const response = await apiClient.get('/hardware/');
        
        console.log('Hardware API Response:', response.data);
        console.log('Hardware list length:', response.data.hardware_list?.length);
        
        if (response.data.status === 'success') {
          const hardwareList = response.data.hardware_list || [];
          console.log('Setting hardware data:', hardwareList);
          setHardwareData(hardwareList);
        } else {
          console.error('API returned error status:', response.data);
          setError('Failed to fetch hardware data');
        }
      } catch (err) {
        console.error('Error fetching hardware data:', err);
        console.error('Error details:', err.response?.data);
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

  // Process all hardware data into a unified format
  const unifiedHardwareData = hardwareData.map(hw => {
    console.log('Processing hardware record:', hw);
    return {
      id: hw.id,
      // CPU Info
      cpuBrand: getCpuBrand(hw.cpu),
      cpuModel: hw.cpu,
      cpuCores: hw.cpu_total_cores || 0,
      cpuBaseClock: hw.cpu_base_clock_ghz ? `${hw.cpu_base_clock_ghz}GHz` : 'N/A',
      cpuMaxFrequency: hw.cpu_max_frequency_ghz || 0,
      cpuThreadsPerCore: hw.cpu_threads_per_core || 1,
      cpuPowerConsumption: hw.cpu_power_consumption || 0,
      l1Cache: hw.l1_cache || 0,
      
      // GPU Info
      gpuBrand: getGpuBrand(hw.gpu),
      gpuModel: hw.gpu,
      gpuCount: hw.num_gpu || 1,
      gpuMemoryTotal: hw.gpu_memory_total_vram_mb || 0,
      gpuPowerConsumption: hw.gpu_power_consumption || 0,
      gpuGraphicsClock: hw.gpu_graphics_clock || 0,
      gpuMemoryClock: hw.gpu_memory_clock || 0,
      gpuSmCores: hw.gpu_sm_cores || 0,
      gpuCudaCores: hw.gpu_cuda_cores || 0
    };
  });
  
  console.log('Unified hardware data:', unifiedHardwareData);
  console.log('Unified hardware data length:', unifiedHardwareData.length);

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
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Hardware Management</h3>
            <p className="text-gray-600 dark:text-gray-300">Manage and monitor all hardware resources</p>
          </div>
          <button className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors">
            Add Hardware
          </button>
        </div>
      </div>

      {/* Unified Hardware Table */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU Specs</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GPU</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GPU Memory</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">GPU Cores</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Clock Speeds</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Power & Cache</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {unifiedHardwareData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div>
                      <div className="text-2xl mb-2">🔧</div>
                      <div className="font-medium mb-1">No hardware found in database</div>
                      <div className="text-sm text-gray-400">
                        {loading ? 'Loading...' : `API Response: ${hardwareData.length} records`}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                unifiedHardwareData.map((hw) => (
                  <tr key={hw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {/* ID */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{hw.id}
                    </td>
                    
                    {/* CPU */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div className="font-medium">{hw.cpuBrand}</div>
                      <div className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400" title={hw.cpuModel}>
                        {hw.cpuModel ? hw.cpuModel.split(' @ ')[0] : 'Unknown'}
                      </div>
                    </td>
                    
                    {/* CPU Specs */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div>{hw.cpuCores} Cores</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{hw.cpuThreadsPerCore} Threads/Core</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{hw.cpuBaseClock}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Max: {hw.cpuMaxFrequency}GHz</div>
                    </td>
                    
                    {/* GPU */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div className="font-medium">{hw.gpuBrand || 'N/A'}</div>
                      <div className="max-w-xs truncate text-xs text-gray-500 dark:text-gray-400" title={hw.gpuModel}>
                        {hw.gpuModel || 'No GPU'}
                      </div>
                      {hw.gpuCount > 1 && (
                        <div className="text-xs text-blue-600">×{hw.gpuCount} Units</div>
                      )}
                    </td>
                    
                    {/* GPU Memory */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {hw.gpuModel && hw.gpuModel !== 'No GPU' ? (
                        <>
                          <div className="font-medium">{hw.gpuMemoryTotal}GB</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">VRAM Total</div>
                        </>
                      ) : (
                        <div className="text-gray-400">N/A</div>
                      )}
                    </td>
                    
                    {/* GPU Cores */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {hw.gpuModel && hw.gpuModel !== 'No GPU' ? (
                        <>
                          <div>{hw.gpuCudaCores} CUDA</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{hw.gpuSmCores} SM</div>
                        </>
                      ) : (
                        <div className="text-gray-400">N/A</div>
                      )}
                    </td>
                    
                    {/* Clock Speeds */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div>GPU: {hw.gpuGraphicsClock}GHz</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Mem: {hw.gpuMemoryClock}GHz</div>
                    </td>
                    
                    {/* Power & Cache */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      <div>CPU: {hw.cpuPowerConsumption}W</div>
                      <div>GPU: {hw.gpuPowerConsumption}W</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">L1: {hw.l1Cache}KB</div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-[#01a982] hover:text-[#019670] mr-2 text-xs">Edit</button>
                      <button className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HardwareTab;