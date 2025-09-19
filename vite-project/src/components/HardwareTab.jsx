import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { Search, Funnel } from 'lucide-react';

const HardwareTab = () => {
  const [hardwareData, setHardwareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHardware, setSelectedHardware] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    cpu: '',
    gpu: '',
    num_gpu: 1,
    gpu_memory_total_vram_mb: '',
    gpu_graphics_clock: '',
    gpu_memory_clock: '',
    gpu_sm_cores: '',
    gpu_cuda_cores: '',
    cpu_total_cores: '',
    cpu_threads_per_core: '',
    cpu_base_clock_ghz: '',
    cpu_max_frequency_ghz: '',
    l1_cache: '',
    cpu_power_consumption: '',
    gpu_power_consumption: ''
  });

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

  // Reset form data
  const resetForm = () => {
    setFormData({
      cpu: '',
      gpu: '',
      num_gpu: 1,
      gpu_memory_total_vram_mb: '',
      gpu_graphics_clock: '',
      gpu_memory_clock: '',
      gpu_sm_cores: '',
      gpu_cuda_cores: '',
      cpu_total_cores: '',
      cpu_threads_per_core: '',
      cpu_base_clock_ghz: '',
      cpu_max_frequency_ghz: '',
      l1_cache: '',
      cpu_power_consumption: '',
      gpu_power_consumption: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new hardware
  const handleAddHardware = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/hardware/', formData);

      if (response.data.status === 'success') {
        // Refresh hardware data
        const hardwareResponse = await apiClient.get('/hardware/');
        if (hardwareResponse.data.status === 'success') {
          setHardwareData(hardwareResponse.data.hardware_list || []);
        }

        setShowAddModal(false);
        resetForm();
        alert('Hardware added successfully!');
      }
    } catch (err) {
      console.error('Error adding hardware:', err);
      alert('Failed to add hardware: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Edit hardware
  const handleEditClick = (hardware) => {
    setSelectedHardware(hardware);
    setFormData({
      cpu: hardware.cpu || '',
      gpu: hardware.gpu || '',
      num_gpu: hardware.num_gpu || 1,
      gpu_memory_total_vram_mb: hardware.gpu_memory_total_vram_mb || '',
      gpu_graphics_clock: hardware.gpu_graphics_clock || '',
      gpu_memory_clock: hardware.gpu_memory_clock || '',
      gpu_sm_cores: hardware.gpu_sm_cores || '',
      gpu_cuda_cores: hardware.gpu_cuda_cores || '',
      cpu_total_cores: hardware.cpu_total_cores || '',
      cpu_threads_per_core: hardware.cpu_threads_per_core || '',
      cpu_base_clock_ghz: hardware.cpu_base_clock_ghz || '',
      cpu_max_frequency_ghz: hardware.cpu_max_frequency_ghz || '',
      l1_cache: hardware.l1_cache || '',
      cpu_power_consumption: hardware.cpu_power_consumption || '',
      gpu_power_consumption: hardware.gpu_power_consumption || ''
    });
    setShowEditModal(true);
  };

  // Update hardware
  const handleUpdateHardware = async () => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/hardware/${selectedHardware.id}`, formData);

      if (response.data.status === 'success') {
        // Refresh hardware data
        const hardwareResponse = await apiClient.get('/hardware/');
        if (hardwareResponse.data.status === 'success') {
          setHardwareData(hardwareResponse.data.hardware_list || []);
        }

        setShowEditModal(false);
        setSelectedHardware(null);
        resetForm();
        alert('Hardware updated successfully!');
      }
    } catch (err) {
      console.error('Error updating hardware:', err);
      alert('Failed to update hardware: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete hardware
  const handleDeleteClick = (hardware) => {
    setSelectedHardware(hardware);
    setShowDeleteModal(true);
  };

  const handleDeleteHardware = async () => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/hardware/${selectedHardware.id}`);

      if (response.data.status === 'success') {
        // Refresh hardware data
        const hardwareResponse = await apiClient.get('/hardware/');
        if (hardwareResponse.data.status === 'success') {
          setHardwareData(hardwareResponse.data.hardware_list || []);
        }

        setShowDeleteModal(false);
        setSelectedHardware(null);
        alert('Hardware deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting hardware:', err);
      alert('Failed to delete hardware: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading hardware data...</p>
        </div>
      </div>
    );
  }

  // Error state
  // if (error) {
  //   return (
  //     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
  //       <div className="p-8 text-center">
  //         <div className="text-red-500 text-xl mb-4">⚠️</div>
  //         <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
  //         <button 
  //           onClick={() => window.location.reload()} 
  //           className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
  //         >
  //           Retry
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-4xl font-medium mb-6" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>
      <div className="w-full mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
        <div className="flex justify-between items-center">
          <h3 className="text-[24px] font-normal text-gray-900 dark:text-white">Hardware Management</h3>
          <p className="text-gray-600 dark:text-gray-300">Manage and monitor all hardware resources</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-[#008060] hover:bg-[#00694d] text-white rounded-full text-base font-medium flex items-center gap-2 h-11 transition-colors"
          >
            <span>Add Hardware</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-3">
          {/* Search Input with Icon */}
          <div className="relative w-[400px]">
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-gray-700 placeholder-gray-500 text-base focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 font-bolder text-gray-900" />
          </div>

          {/* Filter Button */}
          <button className="p-2 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
            <Funnel className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Unified Hardware Table */}
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">CPU</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">CPU Specs</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">GPU</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">GPU Memory</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">GPU Cores</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Clock Speeds</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Power & Cache</th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                        <button
                          onClick={() => handleEditClick(hardwareData.find(h => h.id === hw.id))}
                          className="text-emerald-500 hover:text-emerald-600 mr-2 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(hardwareData.find(h => h.id === hw.id))}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Hardware Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Hardware</h2>
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddHardware(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU
                    </label>
                    <input
                      type="text"
                      name="cpu"
                      value={formData.cpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU
                    </label>
                    <input
                      type="text"
                      name="gpu"
                      value={formData.gpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of GPUs
                    </label>
                    <input
                      type="number"
                      name="num_gpu"
                      value={formData.num_gpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Memory (VRAM MB)
                    </label>
                    <input
                      type="number"
                      name="gpu_memory_total_vram_mb"
                      value={formData.gpu_memory_total_vram_mb}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Graphics Clock
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="gpu_graphics_clock"
                      value={formData.gpu_graphics_clock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Memory Clock
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="gpu_memory_clock"
                      value={formData.gpu_memory_clock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU SM Cores
                    </label>
                    <input
                      type="number"
                      name="gpu_sm_cores"
                      value={formData.gpu_sm_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU CUDA Cores
                    </label>
                    <input
                      type="number"
                      name="gpu_cuda_cores"
                      value={formData.gpu_cuda_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Total Cores
                    </label>
                    <input
                      type="number"
                      name="cpu_total_cores"
                      value={formData.cpu_total_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Threads per Core
                    </label>
                    <input
                      type="number"
                      name="cpu_threads_per_core"
                      value={formData.cpu_threads_per_core}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Base Clock (GHz)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="cpu_base_clock_ghz"
                      value={formData.cpu_base_clock_ghz}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Max Frequency (GHz)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="cpu_max_frequency_ghz"
                      value={formData.cpu_max_frequency_ghz}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      L1 Cache
                    </label>
                    <input
                      type="number"
                      name="l1_cache"
                      value={formData.l1_cache}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Power Consumption
                    </label>
                    <input
                      type="number"
                      name="cpu_power_consumption"
                      value={formData.cpu_power_consumption}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Power Consumption
                    </label>
                    <input
                      type="number"
                      name="gpu_power_consumption"
                      value={formData.gpu_power_consumption}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Hardware'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Hardware Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Hardware</h2>
                <button
                  onClick={() => { setShowEditModal(false); setSelectedHardware(null); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateHardware(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU
                    </label>
                    <input
                      type="text"
                      name="cpu"
                      value={formData.cpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU
                    </label>
                    <input
                      type="text"
                      name="gpu"
                      value={formData.gpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of GPUs
                    </label>
                    <input
                      type="number"
                      name="num_gpu"
                      value={formData.num_gpu}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Memory (VRAM MB)
                    </label>
                    <input
                      type="number"
                      name="gpu_memory_total_vram_mb"
                      value={formData.gpu_memory_total_vram_mb}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Graphics Clock
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="gpu_graphics_clock"
                      value={formData.gpu_graphics_clock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Memory Clock
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="gpu_memory_clock"
                      value={formData.gpu_memory_clock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU SM Cores
                    </label>
                    <input
                      type="number"
                      name="gpu_sm_cores"
                      value={formData.gpu_sm_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU CUDA Cores
                    </label>
                    <input
                      type="number"
                      name="gpu_cuda_cores"
                      value={formData.gpu_cuda_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Total Cores
                    </label>
                    <input
                      type="number"
                      name="cpu_total_cores"
                      value={formData.cpu_total_cores}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Threads per Core
                    </label>
                    <input
                      type="number"
                      name="cpu_threads_per_core"
                      value={formData.cpu_threads_per_core}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Base Clock (GHz)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="cpu_base_clock_ghz"
                      value={formData.cpu_base_clock_ghz}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Max Frequency (GHz)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="cpu_max_frequency_ghz"
                      value={formData.cpu_max_frequency_ghz}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      L1 Cache
                    </label>
                    <input
                      type="number"
                      name="l1_cache"
                      value={formData.l1_cache}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Power Consumption
                    </label>
                    <input
                      type="number"
                      name="cpu_power_consumption"
                      value={formData.cpu_power_consumption}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Power Consumption
                    </label>
                    <input
                      type="number"
                      name="gpu_power_consumption"
                      value={formData.gpu_power_consumption}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setSelectedHardware(null); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Hardware'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
              </div>
              <div className="mb-4 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Hardware</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this hardware configuration?
                  </p>
                  {selectedHardware && (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                      CPU: {selectedHardware.cpu}<br />
                      GPU: {selectedHardware.gpu}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setSelectedHardware(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteHardware}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HardwareTab;