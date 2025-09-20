import React, { useState, useEffect } from 'react';
import { Info, Loader2, CodeXml } from 'lucide-react';
import apiClient from '../config/axios';
import OptimizationResults from './OptimizationResults';
import SimulationResults from './SimulationResults';
import { useDropdownData } from '../hooks/useDropdownData';

const OptimizeTab = () => {
  const [optimizationMode, setOptimizationMode] = useState('pre-deployment');

  // Primary fields - Model Name and Task Type (user fills these first)
  const [modelName, setModelName] = useState('');
  const [taskType, setTaskType] = useState('');
  const [scenario, setScenario] = useState('Single Stream');

  // Auto-filled fields from database (user can override)
  const [framework, setFramework] = useState('');
  const [modelSize, setModelSize] = useState('');
  const [parameters, setParameters] = useState('');
  const [flops, setFlops] = useState('');
  const [modelType, setModelType] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [showTooltip, setShowTooltip] = useState('');

  // Training-specific fields
  const [inputSize, setInputSize] = useState('');
  const [isFullTraining, setIsFullTraining] = useState('No');

  // Additional parameters state
  const [showMoreParams, setShowMoreParams] = useState(false);
  const [showAdvancedParamsBare, setShowAdvancedParamsBare] = useState(false);
  const [showAdvancedParamsVM, setShowAdvancedParamsVM] = useState(false);
  const [architectureType, setArchitectureType] = useState('');
  const [hiddenLayers, setHiddenLayers] = useState('');
  const [attentionLayers, setAttentionLayers] = useState('');
  const [embeddingDimension, setEmbeddingDimension] = useState('');
  const [ffnDimension, setFfnDimension] = useState('');
  const [vocabularySize, setVocabularySize] = useState('');
  const [activationFunction, setActivationFunction] = useState('');
  const [precision, setPrecision] = useState('');

  // Use custom hook for dropdown data with caching
  const {
    modelNames: availableModelNames,
    taskTypes: availableTaskTypes,
    hardwareData,
    isLoading: isLoadingDropdowns,
    error: dropdownError
  } = useDropdownData();

  // Post-deployment specific state - using the specific fields provided
  const [gpuMemoryUsage, setGpuMemoryUsage] = useState('');
  const [cpuMemoryUsage, setCpuMemoryUsage] = useState('');
  const [cpuUtilization, setCpuUtilization] = useState('');
  const [gpuUtilization, setGpuUtilization] = useState('');
  const [diskIops, setDiskIops] = useState('');
  const [networkBandwidth, setNetworkBandwidth] = useState('');
  const [currentHardwareId, setCurrentHardwareId] = useState('');
  const [optimizationPriority, setOptimizationPriority] = useState('balanced');

  // VM-level post-deployment state
  const [postDeploymentMode, setPostDeploymentMode] = useState('bare-metal'); // 'bare-metal' or 'vm-level'
  const [activeVMs, setActiveVMs] = useState([]);
  const [selectedVM, setSelectedVM] = useState(null);
  const [isLoadingVMs, setIsLoadingVMs] = useState(false);
  const [vmError, setVmError] = useState('');

  // VM-level metrics state
  const [vmGpuUtilization, setVmGpuUtilization] = useState('');
  const [vmGpuMemoryUsage, setVmGpuMemoryUsage] = useState('');
  const [vmCpuUtilization, setVmCpuUtilization] = useState('');
  const [vmCpuMemoryUsage, setVmCpuMemoryUsage] = useState('');
  const [vmDiskIops, setVmDiskIops] = useState('');
  const [vmNetworkBandwidth, setVmNetworkBandwidth] = useState('');
  const [isLoadingVmMetrics, setIsLoadingVmMetrics] = useState(false);
  const [isVmOverrideEnabled, setIsVmOverrideEnabled] = useState(false);
  const [vmMetricsLastUpdated, setVmMetricsLastUpdated] = useState(null);
  const [vmMetricsRefreshInterval, setVmMetricsRefreshInterval] = useState(null);

  // Hardware data state
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);

  // Host metrics state for bare metal
  const [isLoadingHostMetrics, setIsLoadingHostMetrics] = useState(false);
  const [hostMetricsLastUpdated, setHostMetricsLastUpdated] = useState(null);
  const [hostMetricsRefreshInterval, setHostMetricsRefreshInterval] = useState(null);

  // Loading and error states
  const [isLoadingModelData, setIsLoadingModelData] = useState(false);
  const [error, setError] = useState('');

  // Optimization results state
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isRunningOptimization, setIsRunningOptimization] = useState(false);

  // Helper function to create descriptive hardware names
  const getHardwareName = (hardware) => {
    if (hardware.gpu && hardware.cpu) {
      // Both GPU and CPU available
      const gpu = hardware.gpu.replace(/NVIDIA|AMD|Intel/g, '').trim();
      const cpu = hardware.cpu.split(/\s+/).slice(0, 3).join(' '); // First 3 words of CPU
      return `${gpu} + ${cpu}`;
    } else if (hardware.gpu) {
      // GPU only
      return hardware.gpu.trim();
    } else if (hardware.cpu) {
      // CPU only
      return hardware.cpu.split(/\s+/).slice(0, 4).join(' '); // First 4 words of CPU
    } else {
      // Fallback
      return `Hardware Config ${hardware.id}`;
    }
  };

  // Fetch host metrics for bare metal
  const fetchHostMetrics = async () => {
    setIsLoadingHostMetrics(true);

    try {
      const response = await apiClient.get('/host-overall-metrics?limit=1');
      console.log('Host metrics response:', response.data);

      if (response.data && response.data.data && response.data.data.length > 0) {
        const hostMetrics = response.data.data[0];

        // Map API fields to form state
        setGpuUtilization(hostMetrics.host_gpu_utilization_percent?.toFixed(1) || '0');
        setGpuMemoryUsage(hostMetrics.host_gpu_memory_utilization_percent?.toFixed(1) || '0');
        setCpuUtilization(hostMetrics.host_cpu_usage_percent?.toFixed(1) || '0');
        setCpuMemoryUsage(hostMetrics.host_ram_usage_percent?.toFixed(1) || '0');

        // Note: host_disk_read_count and host_disk_write_count are cumulative counters
        // To get actual IOPS, we need rate calculation over time interval, but for real-time
        // display we'll show current utilization as placeholder. Proper IOPS calculation
        // requires previous snapshot for rate computation.
        const approximateIops = Math.round(((hostMetrics.host_disk_read_count || 0) + (hostMetrics.host_disk_write_count || 0)) / 1000);
        setDiskIops(approximateIops.toString());

        // Note: network bytes are cumulative counters, not rates.
        // For real-time display, show utilization percentage or estimated bandwidth
        // Proper bandwidth calculation requires rate computation over time interval
        const estimatedBandwidthMbps = Math.round((hostMetrics.host_network_bytes_sent || 0) / (1024 * 1024 * 10)); // Rough estimate
        setNetworkBandwidth(Math.min(estimatedBandwidthMbps, 1000).toString()); // Cap at 1000 Mbps

        setHostMetricsLastUpdated(new Date());
        console.log('Host metrics updated successfully');
      } else {
        console.log('No host metrics data available');
      }
    } catch (err) {
      console.error('Error fetching host metrics:', err);
    } finally {
      setIsLoadingHostMetrics(false);
    }
  };

  // Fetch active VMs with memory information
  const fetchActiveVMs = async () => {
    setIsLoadingVMs(true);
    setVmError('');

    try {
      const response = await apiClient.get('/v1/metrics/vms/active-with-memory');
      console.log('Active VMs response:', response.data);

      if (response.data && response.data.success) {
        setActiveVMs(response.data.active_vms || []);
      } else {
        setVmError('Failed to load VM instances');
        setActiveVMs([]);
      }
    } catch (err) {
      console.error('Error fetching active VMs:', err);
      setVmError('Failed to fetch VM instances. Please check if VM agents are running.');
      setActiveVMs([]);
    } finally {
      setIsLoadingVMs(false);
    }
  };

  // Fetch VM metrics for selected VM
  const fetchVmMetrics = async (vmName) => {
    if (!vmName) return;

    setIsLoadingVmMetrics(true);
    setVmError('');

    try {
      const response = await apiClient.get(`/v1/metrics/vm/${encodeURIComponent(vmName)}/latest`);
      console.log('VM metrics response:', response.data);

      if (response.data && response.data.success && response.data.metrics) {
        const metrics = response.data.metrics;

        // Populate the VM metrics fields
        setVmGpuUtilization(metrics.gpu_utilization?.toString() || '0');
        setVmGpuMemoryUsage(metrics.gpu_memory_usage?.toString() || '0');
        setVmCpuUtilization(metrics.cpu_utilization?.toString() || '0');
        setVmCpuMemoryUsage(metrics.cpu_memory_usage?.toString() || '0');
        setVmDiskIops(metrics.disk_iops?.toString() || '0');
        setVmNetworkBandwidth(metrics.network_bandwidth?.toString() || '0');

        console.log('VM metrics populated:', {
          gpu_util: metrics.gpu_utilization,
          gpu_mem: metrics.gpu_memory_usage,
          cpu_util: metrics.cpu_utilization,
          cpu_mem: metrics.cpu_memory_usage,
          disk_iops: metrics.disk_iops,
          network: metrics.network_bandwidth
        });

        // Update last refresh timestamp
        setVmMetricsLastUpdated(new Date());
      } else {
        setVmError('Failed to load VM metrics. Using default values.');
        // Set default values
        setVmGpuUtilization('0');
        setVmGpuMemoryUsage('0');
        setVmCpuUtilization('50');
        setVmCpuMemoryUsage('60');
        setVmDiskIops('100');
        setVmNetworkBandwidth('50');
        setVmMetricsLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching VM metrics:', err);
      setVmError('Failed to fetch VM metrics. Using default values.');
      // Set default values
      setVmGpuUtilization('0');
      setVmGpuMemoryUsage('0');
      setVmCpuUtilization('50');
      setVmCpuMemoryUsage('60');
      setVmDiskIops('100');
      setVmNetworkBandwidth('50');
      setVmMetricsLastUpdated(new Date());
    } finally {
      setIsLoadingVmMetrics(false);
    }
  };

  // Error handling for dropdown data and set default hardware
  useEffect(() => {
    if (dropdownError) {
      setError(dropdownError);
    }

    // Set default values from first hardware if available and not in override mode
    if (!isOverrideEnabled && hardwareData?.length > 0) {
      const firstHardware = hardwareData[0];
      const hardwareName = getHardwareName(firstHardware);
      setCurrentHardwareId(hardwareName);
    }

    // Set default values for resource metrics if they're empty
    if (!gpuUtilization) setGpuUtilization('75');
    if (!gpuMemoryUsage) setGpuMemoryUsage('80');
    if (!cpuUtilization) setCpuUtilization('65');
    if (!cpuMemoryUsage) setCpuMemoryUsage('70');
    if (!diskIops) setDiskIops('1000');
    if (!networkBandwidth) setNetworkBandwidth('100');
  }, [dropdownError, hardwareData, isOverrideEnabled]);

  // Fetch VMs when switching to VM-level post-deployment mode
  // Fetch host metrics when switching to bare-metal post-deployment mode
  useEffect(() => {
    if (optimizationMode === 'post-deployment') {
      if (postDeploymentMode === 'vm-level') {
        fetchActiveVMs();
      } else if (postDeploymentMode === 'bare-metal') {
        fetchHostMetrics();
      }
    }
    // Clear results when switching between bare-metal and VM-level tabs
    setOptimizationResults(null);
    setError('');
  }, [optimizationMode, postDeploymentMode]);

  // Clear post-deployment specific fields when switching between bare-metal and VM-level
  useEffect(() => {
    if (optimizationMode === 'post-deployment') {
      if (postDeploymentMode === 'bare-metal') {
        // Clear VM-specific metrics when switching to bare-metal
        setVmGpuUtilization('');
        setVmGpuMemoryUsage('');
        setVmCpuUtilization('');
        setVmCpuMemoryUsage('');
        setVmDiskIops('');
        setVmNetworkBandwidth('');
        setSelectedVM(null);
        setIsVmOverrideEnabled(false);
        setVmMetricsLastUpdated(null);

        // Clear shared state to start fresh for bare-metal
        setCurrentHardwareId('');

      } else if (postDeploymentMode === 'vm-level') {
        // Clear bare-metal specific metrics when switching to VM-level
        setGpuMemoryUsage('');
        setCpuMemoryUsage('');
        setCpuUtilization('');
        setGpuUtilization('');
        setDiskIops('');
        setNetworkBandwidth('');
        setCurrentHardwareId('');
        setIsOverrideEnabled(false);
      }

      // Clear model parameters when switching between modes for fresh start
      setModelName('');
      setFramework('');
      setParameters('');
      setModelSize('');
      setArchitectureType('');
      setModelType('');
      setPrecision('');
      setVocabularySize('');
      setActivationFunction('');

      // Reset advanced parameters visibility
      setShowAdvancedParamsBare(false);
      setShowAdvancedParamsVM(false);

      // Always clear results when switching post-deployment tabs
      setOptimizationResults(null);
      setError('');
    }
  }, [postDeploymentMode]);

  // Auto-fetch metrics when VM is selected
  useEffect(() => {
    if (selectedVM && selectedVM.vm_name && !isVmOverrideEnabled) {
      fetchVmMetrics(selectedVM.vm_name);
    }
  }, [selectedVM]);

  // Auto-refresh VM metrics every 10 seconds when VM is selected and not in override mode
  useEffect(() => {
    // Clear any existing interval
    if (vmMetricsRefreshInterval) {
      clearInterval(vmMetricsRefreshInterval);
      setVmMetricsRefreshInterval(null);
    }

    // Set up new interval if VM is selected and not in override mode
    if (selectedVM && selectedVM.vm_name && !isVmOverrideEnabled) {
      console.log(`Starting auto-refresh for VM metrics: ${selectedVM.vm_name} (every 10 seconds)`);

      const intervalId = setInterval(() => {
        console.log(`Auto-refreshing VM metrics for: ${selectedVM.vm_name}`);
        fetchVmMetrics(selectedVM.vm_name);
      }, 10000); // 10 seconds

      setVmMetricsRefreshInterval(intervalId);
    }

    // Cleanup function
    return () => {
      if (vmMetricsRefreshInterval) {
        console.log('Cleaning up VM metrics auto-refresh interval');
        clearInterval(vmMetricsRefreshInterval);
        setVmMetricsRefreshInterval(null);
      }
    };
  }, [selectedVM, isVmOverrideEnabled]);

  // Auto-refresh host metrics every 2 seconds for bare metal mode when not in override mode
  useEffect(() => {
    // Clear any existing interval
    if (hostMetricsRefreshInterval) {
      clearInterval(hostMetricsRefreshInterval);
      setHostMetricsRefreshInterval(null);
    }

    // Set up new interval if in bare metal mode and not in override mode
    if (optimizationMode === 'post-deployment' && postDeploymentMode === 'bare-metal' && !isOverrideEnabled) {
      console.log('Starting auto-refresh for host metrics (every 2 seconds)');

      const intervalId = setInterval(() => {
        console.log('Auto-refreshing host metrics');
        fetchHostMetrics();
      }, 2000); // 2 seconds

      setHostMetricsRefreshInterval(intervalId);
    }

    // Cleanup function
    return () => {
      if (hostMetricsRefreshInterval) {
        console.log('Cleaning up host metrics auto-refresh interval');
        clearInterval(hostMetricsRefreshInterval);
        setHostMetricsRefreshInterval(null);
      }
    };
  }, [optimizationMode, postDeploymentMode, isOverrideEnabled]);

  // Clear form data when switching between pre/post deployment modes
  useEffect(() => {
    // Clear all form fields when mode changes
    setModelName('');
    setTaskType('');
    setScenario('Single Stream');
    setFramework('');
    setModelSize('');
    setParameters('');
    setFlops('');
    setModelType('');
    setBatchSize('');
    setInputSize('');
    setIsFullTraining('No');
    setArchitectureType('');
    setHiddenLayers('');
    setVocabularySize('');
    setAttentionLayers('');
    setActivationFunction('');
    setPrecision('');

    // Clear post-deployment specific fields
    setGpuMemoryUsage('');
    setCpuMemoryUsage('');
    setCpuUtilization('');
    setGpuUtilization('');
    setDiskIops('');
    setNetworkBandwidth('');
    setCurrentHardwareId('');
    setOptimizationPriority('balanced');
    setIsOverrideEnabled(false);

    // Clear VM-specific fields
    setPostDeploymentMode('bare-metal');
    setActiveVMs([]);
    setSelectedVM(null);
    setVmError('');

    // Clear VM metrics fields
    setVmGpuUtilization('');
    setVmGpuMemoryUsage('');
    setVmCpuUtilization('');
    setVmCpuMemoryUsage('');
    setVmDiskIops('');
    setVmNetworkBandwidth('');
    setIsVmOverrideEnabled(false);
    setVmMetricsLastUpdated(null);

    // Clear auto-refresh intervals
    if (vmMetricsRefreshInterval) {
      clearInterval(vmMetricsRefreshInterval);
      setVmMetricsRefreshInterval(null);
    }
    if (hostMetricsRefreshInterval) {
      clearInterval(hostMetricsRefreshInterval);
      setHostMetricsRefreshInterval(null);
    }

    setError('');
    setOptimizationResults(null);
    setShowMoreParams(false);
  }, [optimizationMode]);

  // Auto-fill model data when both model name and task type are selected
  useEffect(() => {
    const fetchModelData = async () => {
      if (!modelName || !taskType) {
        return;
      }

      setIsLoadingModelData(true);
      setError('');

      try {
        console.log(`Fetching model data for: ${modelName} - ${taskType}`);

        // Call the backend API to get model data using model name
        const response = await apiClient.post('/model/get-model-data', {
          model_name: modelName,
          task_type: taskType
        });

        console.log('Model data response:', response.data);

        // Check if the response is successful
        if (response.data.status === 'success' && response.data.model_data) {
          const modelData = response.data.model_data;

          console.log('Auto-filling model data:', modelData);

          // Auto-fill the form with model data from backend
          setModelSize(modelData.model_size_mb?.toString() || '');
          setParameters(modelData.total_parameters_millions?.toString() || '');

          // For Training task type, keep GFLOPs empty (user must input)
          // For Inference task type, prefill GFLOPs from database
          if (taskType === 'Training') {
            setFlops('');
          } else {
            setFlops(modelData.gflops_billions?.toString() || '');
          }

          setFramework(modelData.framework || '');
          setModelType(modelData.model_type || '');

          // Auto-fill additional parameters if available - map fields correctly based on CSV columns
          setArchitectureType(modelData.architecture_type || '');
          setHiddenLayers(modelData.number_of_hidden_layers?.toString() || '');
          setAttentionLayers(modelData.number_of_attention_layers?.toString() || '');
          setEmbeddingDimension(modelData.embedding_vector_dimension?.toString() || '');
          setFfnDimension(modelData.ffn_dimension?.toString() || '');
          setVocabularySize(modelData.vocabulary_size?.toString() || '');
          setActivationFunction(modelData.activation_function || '');
          setPrecision(modelData.precision || '');

        } else {
          console.warn('Model data not found:', response.data);
          setError('Model data not found for the selected model and task type.');
        }

      } catch (err) {
        console.error('Error fetching model data:', err);
        if (err.response?.status === 404) {
          setError('No model data found for the selected model and task combination.');
        } else {
          setError('Failed to load model data from backend. Please try again.');
        }
      } finally {
        setIsLoadingModelData(false);
      }
    };

    fetchModelData();
  }, [modelName, taskType]);

  // Handle Get Recommendations
  const handleGetRecommendations = async () => {
    if (!modelName || !taskType) {
      setError('Please select both model name and task type');
      return;
    }

    if (!modelSize || !parameters) {
      setError('Please ensure model size and parameters are filled in.');
      return;
    }

    // Validate required fields for optimization
    if (!architectureType || !precision || !vocabularySize || !activationFunction) {
      setError('Please fill in Architecture Type, Precision, Vocabulary Size, and Activation Function. Click "Load More Parameters" to access these fields.');
      return;
    }

    if (optimizationMode === 'pre-deployment') {
      // Validation for Training task type
      if (taskType === 'Training') {
        if (!batchSize) {
          setError('Please fill in batch size for Training task type.');
          return;
        }
        if (!inputSize) {
          setError('For Training task type, please fill in Input Size.');
          return;
        }
        if (!isFullTraining) {
          setError('For Training task type, please select Is Full Training option.');
          return;
        }
      }
    }

    // Validate resource metrics for post-deployment mode
    if (optimizationMode === 'post-deployment') {
      if (postDeploymentMode === 'bare-metal') {
        // Bare metal validation
        const requiredFields = [
          { value: gpuUtilization, name: 'GPU Utilization' },
          { value: gpuMemoryUsage, name: 'GPU Memory Usage' },
          { value: cpuUtilization, name: 'CPU Utilization' },
          { value: cpuMemoryUsage, name: 'CPU Memory Usage' },
          { value: diskIops, name: 'Disk IOPS' },
          { value: networkBandwidth, name: 'Network Bandwidth' },
          { value: currentHardwareId, name: 'Current Hardware' }
        ];

        const missingFields = requiredFields.filter(field => !field.value || field.value === '');

        if (missingFields.length > 0) {
          setError(`Please fill in the following fields: ${missingFields.map(f => f.name).join(', ')}. Click "Override" to enter all values.`);
          return;
        }
      } else if (postDeploymentMode === 'vm-level') {
        // VM-level validation
        if (!selectedVM || !selectedVM.vm_name) {
          setError('Please select a VM instance first.');
          return;
        }

        const vmRequiredFields = [
          { value: vmGpuUtilization, name: 'VM GPU Utilization' },
          { value: vmGpuMemoryUsage, name: 'VM GPU Memory Usage' },
          { value: vmCpuUtilization, name: 'VM CPU Utilization' },
          { value: vmCpuMemoryUsage, name: 'VM CPU Memory Usage' },
          { value: vmDiskIops, name: 'VM Disk IOPS' },
          { value: vmNetworkBandwidth, name: 'VM Network Bandwidth' }
        ];

        const missingVmFields = vmRequiredFields.filter(field => !field.value || field.value === '');

        if (missingVmFields.length > 0) {
          setError(`Please ensure all VM metrics are loaded: ${missingVmFields.map(f => f.name).join(', ')}. Click "Refresh Metrics" or enable "Override" to enter values manually.`);
          return;
        }

        // We need to get the current hardware from VM info or hardware dropdown
        // For VM-level, we'll extract GPU name from the bare metal hardware the VM is running on
        if (!currentHardwareId && hardwareData.length > 0) {
          // Auto-select first hardware if not set
          const firstHardware = hardwareData[0];
          const hardwareName = getHardwareName(firstHardware);
          setCurrentHardwareId(hardwareName);
        }

        if (!currentHardwareId) {
          setError('Please select the current hardware (bare metal) that this VM is running on.');
          return;
        }
      }
    }

    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    try {
      let optimizationParams;

      if (optimizationMode === 'pre-deployment') {
        // Pre-deployment: Use /api/model/recommend-hardware endpoint (same format as simulate-performance)
        optimizationParams = {
          Model: modelName,
          Framework: framework,
          Task_Type: taskType,
          Scenario: scenario,
          Total_Parameters_Millions: parseFloat(parameters),
          Model_Size_MB: parseFloat(modelSize),
          Architecture_type: architectureType,
          Model_Type: modelType || 'Unknown',
          Embedding_Vector_Dimension: parseInt(embeddingDimension),
          Precision: precision,
          Vocabulary_Size: parseInt(vocabularySize),
          FFN_Dimension: parseInt(ffnDimension),
          Activation_Function: activationFunction,
          Number_of_hidden_Layers: parseInt(hiddenLayers) || 0,
          Number_of_Attention_Layers: parseInt(attentionLayers) || 0,
          GFLOPs_Billions: parseFloat(flops)
        };

        // Add Training-specific fields if task type is Training
        if (taskType === 'Training') {
          optimizationParams.Batch_Size = parseInt(batchSize);
          optimizationParams.Input_Size = parseInt(inputSize);
          optimizationParams.Full_Training = isFullTraining === 'Yes' ? 1 : 0;
        }
      } else {
        // Post-deployment: Use different endpoints based on bare-metal vs VM-level
        if (postDeploymentMode === 'bare-metal') {
          // Bare metal post-deployment optimization
          optimizationParams = {
            // Core model fields using field aliases as defined in the Pydantic model
            "Model Name": modelName,
            "Framework": framework,
            "Total Parameters (Millions)": parseFloat(parameters),
            "Model Size (MB)": parseFloat(modelSize),
            "Architecture type": architectureType,
            "Model Type": modelType || 'Unknown',
            "Precision": precision,
            "Vocabulary Size": parseInt(vocabularySize),
            "Activation Function": activationFunction,
            // CRITICAL: Add missing fields needed by simulation PKL models
            "Embedding Vector Dimension (Hidden Size)": parseInt(embeddingDimension) || 0,
            "FFN (MLP) Dimension": parseInt(ffnDimension) || 0,
            "Number of hidden Layers": parseInt(hiddenLayers) || 0,
            "Number of Attention Layers": parseInt(attentionLayers) || 0,
            "GFLOPs (Billions)": parseFloat(flops) || 0,
            // Resource metrics using direct field names (no aliases)
            gpu_memory_usage: parseFloat(gpuMemoryUsage),
            cpu_memory_usage: parseFloat(cpuMemoryUsage),
            cpu_utilization: parseFloat(cpuUtilization),
            gpu_utilization: parseFloat(gpuUtilization),
            disk_iops: parseFloat(diskIops),
            network_bandwidth: parseFloat(networkBandwidth),
            current_hardware_id: currentHardwareId,
            // CRITICAL: Add deployment_type for proper backend routing
            deployment_type: 'bare-metal'
          };
        } else if (postDeploymentMode === 'vm-level') {
          // VM-level post-deployment optimization - send all required fields for API validation
          optimizationParams = {
            // Model fields required by API validation (use defaults if not filled)
            "Model Name": modelName || 'VM-Model',
            "Framework": framework || 'PyTorch',
            "Total Parameters (Millions)": parseFloat(parameters) || 1.0,
            "Model Size (MB)": parseFloat(modelSize) || 10.0,
            "Architecture type": architectureType || 'transformer',
            "Model Type": modelType || 'VM-Model',
            "Precision": precision || 'FP32',
            "Vocabulary Size": parseInt(vocabularySize) || 1000,
            "Activation Function": activationFunction || 'relu',
            // Resource metrics required by API validation
            cpu_memory_usage: parseFloat(vmCpuMemoryUsage) || 0,
            cpu_utilization: parseFloat(vmCpuUtilization) || 0,
            disk_iops: parseFloat(vmDiskIops) || 0,
            network_bandwidth: parseFloat(vmNetworkBandwidth) || 0,
            // Core VM-level fields that the pickle model actually uses
            gpu_utilization: parseFloat(vmGpuUtilization),
            gpu_memory_usage: parseFloat(vmGpuMemoryUsage),
            current_hardware_id: currentHardwareId,
            deployment_type: 'vm-level'
          };
        }
      }

      // Use the correct endpoint based on mode
      const endpoint = optimizationMode === 'pre-deployment'
        ? '/model/recommend-hardware'
        : '/deployment/post-deployment-optimization';

      // Debug logging
      console.log('Optimization mode:', optimizationMode);
      console.log('Endpoint:', endpoint);
      console.log('Request params:', optimizationParams);
      console.log('Request JSON:', JSON.stringify(optimizationParams, null, 2));
      const response = await apiClient.post(endpoint, optimizationParams);

      console.log('Full backend response:', response.data);
      console.log('Response keys:', Object.keys(response.data || {}));

      // Process and format optimization results
      console.log('Full response received:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.data?.status);

      if (response.data && response.data.status === 'success') {
        console.log('Found optimization response:', response.data);

        if (optimizationMode === 'pre-deployment') {
          // Handle pre-deployment hardware recommendation response (same format as simulate-performance)
          if (response.data.performance_results && response.data.performance_results.length > 0) {
            console.log('Raw Hardware Recommendations:', response.data.performance_results);

            // Format hardware recommendation results (top 3 sorted by cost per 1000)
            const hardwareComparison = response.data.performance_results.map(result => {
              console.log(`Processing hardware recommendation:`, result);

              return {
                name: result.GPU || result['Hardware Name'] || 'Unknown Hardware',
                fullName: `${result.CPU || 'Unknown CPU'} + ${result.GPU || 'Unknown GPU'}`,
                latency: result['Latency (ms)'] !== 'N/A' ? `${parseFloat(result['Latency (ms)']).toFixed(2)} ms` : 'N/A',
                throughput: '0.00 QPS', // Hide throughput as requested
                costPer1000: result['Total Cost'] !== 'N/A' && result['Total Cost'] !== '0' ? `$${parseFloat(result['Total Cost']).toFixed(4)}` : '$0.0000',
                memory: `${result['Recommended RAM'] || 0} GB`,
                status: result.Status || 'Unknown',
                confidence: `${parseFloat(result['Confidence Score'] || 0).toFixed(1)}%`,
                recommendedStorage: result['Recommended Storage'] || 'N/A',
                estimatedVRAM: result['Estimated_VRAM (GB)'] || 'N/A',
                estimatedRAM: result['Estimated_RAM (GB)'] || 'N/A',
                powerConsumption: result['Total power consumption'] || 'N/A'
              };
            });

            // Calculate minimum VRAM from the formatted results
            const vramValues = hardwareComparison
              .map(hw => parseFloat(hw.estimatedVRAM))
              .filter(vram => !isNaN(vram)); // Filter out 'N/A' values

            const minimumVRAM = vramValues.length > 0 ? Math.min(...vramValues) : 0;

            const formattedResults = {
              minimumVRAM: minimumVRAM,
              hardwareComparison: hardwareComparison
            };

            console.log('Formatted hardware recommendation results:', formattedResults);
            setOptimizationResults(formattedResults);
          } else {
            setError('Hardware recommendations completed but no results were returned.');
          }

        } else {
          // Check if this is a VM-level response with new format
          if (response.data.analysis_type === 'vm_level_optimization') {
            // Handle new VM-level response format
            const vmAnalysis = response.data;
            const vmConfig = vmAnalysis.vm_configuration || {};
            const modelReqs = vmAnalysis.model_requirements || {};
            const scalingAnalysis = vmAnalysis.scaling_analysis || {};
            const costAnalysis = vmAnalysis.cost_analysis || {};
            const recommendation = vmAnalysis.recommendation || {};
            const optimizationSummary = vmAnalysis.optimization_summary || {};

            // Create VM-specific description
            const primaryRecommendation = recommendation.primary_recommendation || 'No recommendation';
            const actionRequired = recommendation.action_required || 'No action specified';
            const reason = recommendation.reason || 'Analysis completed';

            let vmDescription = '';
            let vmStrengths = [];
            let vmConsiderations = [];

            if (recommendation.recommendation_type === 'vertical_scaling') {
              vmDescription = `VM Vertical Scaling Required\n\n${actionRequired}\n\n${reason}`;
              vmStrengths = [
                `Current VM VRAM allocation: ${vmConfig.current_vram_gb || 0} GB`,
                `Model VRAM requirement: ${modelReqs.estimated_vram_gb || 0} GB`,
                `Resource efficiency: ${scalingAnalysis.current_efficiency || 0}`,
                'Performance improvement required'
              ];
              vmConsiderations = [
                'VM resource allocation adjustment required',
                'Infrastructure team coordination needed',
                `VRAM shortage: ${scalingAnalysis.vram_shortage_gb || 0} GB`,
                'Performance limitations until resolved'
              ];
            } else if (recommendation.recommendation_type === 'horizontal_scale_out') {
              vmDescription = `VM Horizontal Scale Out\n\n${actionRequired}\n\n${reason}`;
              vmStrengths = [
                'Current VM configuration meets model requirements',
                'Workload benefits from distributed processing',
                'Scalable architecture approach',
                `ML confidence: ${(recommendation.ml_confidence * 100).toFixed(1)}%`
              ];
              vmConsiderations = [
                'Additional VM instance deployment recommended',
                'Workload distribution implementation required',
                'Resource utilization monitoring across instances',
                `Cost increase factor: ${costAnalysis.cost_increase_factor}x`
              ];
            } else if (recommendation.recommendation_type === 'horizontal_scale_in') {
              vmDescription = `VM Over-Provisioning Analysis\n\n${actionRequired}\n\n${reason}`;
              vmStrengths = [
                'Cost optimization opportunity identified',
                `Current resource efficiency: ${(scalingAnalysis.current_efficiency * 100).toFixed(1)}%`,
                'VM resources exceed model requirements',
                'Performance stability maintained after optimization'
              ];
              vmConsiderations = [
                'VM VRAM allocation reduction recommended',
                `Potential cost savings: $${Math.abs(costAnalysis.current_vm_cost_per_1000 - costAnalysis.optimized_cost_per_1000).toFixed(4)} per 1000 inferences`,
                'Post-optimization monitoring required',
                'Resource right-sizing opportunity'
              ];
            } else if (recommendation.recommendation_type === 'maintain') {
              vmDescription = `VM Configuration Analysis\n\n${actionRequired}\n\n${reason}`;
              vmStrengths = [
                'VM resources aligned with model requirements',
                `Resource efficiency: ${(scalingAnalysis.current_efficiency * 100).toFixed(1)}%`,
                'No scaling modifications required',
                `Operating cost: $${costAnalysis.current_vm_cost_per_1000} per 1000 inferences`
              ];
              vmConsiderations = [
                'Continuous resource monitoring recommended',
                'Configuration validated by analysis model',
                'Re-evaluation if workload patterns change',
                'Balanced price-performance ratio achieved'
              ];
            } else {
              vmDescription = `VM Resource Analysis\n\n${primaryRecommendation}\n\n${reason}`;
              vmStrengths = [
                'VM-specific analysis completed',
                'Resource requirements calculated',
                'Cost analysis performed',
                'Data-driven recommendations provided'
              ];
              vmConsiderations = [
                'Review recommendation details',
                'Implementation timeline consideration',
                'Business requirements validation',
                'Performance monitoring post-implementation'
              ];
            }

            // Format results for VM-level optimization
            const vmFormattedResults = {
              recommendedConfiguration: {
                description: vmDescription,
                recommendedInstance: `VM: ${vmConfig.vm_name} (${primaryRecommendation})`,
                expectedInferenceTime: `${optimizationSummary.expected_latency_ms || costAnalysis.latency_ms || 'Calculating...'} ms`,
                costPer1000: `$${optimizationSummary.optimized_cost_per_1000_inferences || costAnalysis.optimized_cost_per_1000 || 'Calculating...'}`
              },
              hardwareAnalysis: {
                name: `${vmConfig.vm_name} on ${vmConfig.host_hardware}`,
                memory: `${vmConfig.current_vram_gb} GB VRAM, ${vmConfig.current_ram_gb} GB RAM`,
                fp16Performance: `${modelReqs.precision} precision supported`,
                architecture: `VM-level optimization for ${modelReqs.model_name}`,
                strengths: vmStrengths,
                considerations: vmConsiderations,
                useCase: `VM-level ${recommendation.recommendation_type.replace('_', ' ')} optimization`
              },
              alternativeOptions: [{
                hardware: primaryRecommendation,
                fullName: `${vmConfig.vm_name}: ${primaryRecommendation}`,
                latency: `${optimizationSummary.expected_latency_ms || costAnalysis.latency_ms || 150} ms`,
                throughput: '0.00 QPS',
                costPer1000: `$${optimizationSummary.optimized_cost_per_1000_inferences || costAnalysis.optimized_cost_per_1000 || 0.05}`,
                memory: `${modelReqs.recommended_vram_gb || 0} GB recommended`,
                status: recommendation.priority === 'critical' ? 'Action Required' : 'Optimization Available',
                confidence: `${(recommendation.ml_confidence * 100).toFixed(1)}%`,
                vmSpecific: true,
                scalingType: recommendation.recommendation_type,
                currentEfficiency: `${(scalingAnalysis.current_efficiency * 100).toFixed(1)}%`,
                resourceAnalysis: `Current: ${vmConfig.current_vram_gb}GB, Required: ${modelReqs.estimated_vram_gb}GB`
              }],
              analysisType: 'vm_level',
              vmMetrics: {
                currentCost: optimizationSummary.current_cost_per_1000_inferences || costAnalysis.current_vm_cost_per_1000,
                optimizedCost: optimizationSummary.optimized_cost_per_1000_inferences || costAnalysis.optimized_cost_per_1000,
                efficiencyScore: optimizationSummary.resource_efficiency_score || costAnalysis.efficiency_score,
                costImpactFactor: optimizationSummary.cost_impact_factor || costAnalysis.cost_increase_factor
              }
            };

            console.log('VM-level optimization results:', vmFormattedResults);
            setOptimizationResults(vmFormattedResults);
          } else {
            // Handle traditional post-deployment optimization response
            const recommendation = response.data.recommendation || 'No recommendation available';
            const currentHardware = response.data.current_hardware || 'Unknown';
            const analysisData = response.data.analysis_summary || {};

            // Extract hardware name from recommendation text
            const recommendedHardware = recommendation.includes('Upgrade to')
              ? recommendation.replace('Upgrade to ', '').trim()
              : recommendation;

            // Create elaborative description based on recommendation type
            let description = '';
            let strengths = [];
            let considerations = [];

            if (recommendation.toLowerCase().includes('upgrade')) {
              description = `Hardware Recommendation: ${recommendation}\n\nBased on current ${currentHardware} performance metrics and AI workload analysis, upgrading to ${recommendedHardware} will provide better performance for your model deployment.`;
              strengths = [
                'Improved AI model inference performance',
                'Better memory and compute resource utilization',
                'Enhanced GPU capabilities for AI workloads',
                'Future-ready hardware for scaling'
              ];
              considerations = [
                'Hardware upgrade and migration required',
                'Deployment planning and testing needed',
                'Cost-benefit analysis for infrastructure',
                'Model re-deployment and validation'
              ];
            } else if (recommendation.toLowerCase().includes('downgrade')) {
              description = `Cost Optimization Recommendation: ${recommendation}\n\nCurrent ${currentHardware} appears to be over-provisioned for this AI workload. Moving to ${recommendedHardware} would be more cost-effective while maintaining performance.`;
              strengths = [
                'Significant cost optimization opportunity',
                'Right-sizing for current AI model requirements',
                'Reduced operational and infrastructure expenses',
                'Efficient resource allocation for workload'
              ];
              considerations = [
                'Validate performance requirements are still met',
                'Monitor model performance after transition',
                'Plan cost savings allocation strategy',
                'Test thoroughly before production deployment'
              ];
            } else if (recommendation.toLowerCase().includes('maintain')) {
              description = `Optimal Configuration: Current ${currentHardware} is well-suited for this AI workload. No hardware changes recommended at this time.`;
              strengths = [
                'Current hardware meets AI model requirements',
                'Optimal price-performance ratio achieved',
                'No migration overhead or downtime',
                'Stable inference performance maintained'
              ];
              considerations = [
                'Continue monitoring model performance metrics',
                'Re-evaluate if workload patterns change',
                'Current configuration validated for deployment',
                'Consider scaling options for future growth'
              ];
            } else {
              description = `Hardware Analysis: ${recommendation}\n\nBased on analysis of your AI workload running on ${currentHardware}, this recommendation optimizes for your specific deployment requirements.`;
              strengths = [
                'AI workload-specific recommendation',
                'Resource utilization analysis completed',
                'Performance optimization guidance',
                'Deployment-ready configuration'
              ];
              considerations = [
                'Review implementation requirements',
                'Consider deployment timeline and feasibility',
                'Validate against performance requirements',
                'Plan testing and rollout strategy'
              ];
            }

            // Extract numerical metrics from the API response
            const metrics = response.data.metrics || {};
            const recommendedLatency = metrics.recommended_latency || 'Calculating...';
            const recommendedCost = metrics.recommended_cost || 'Calculating...';

            // Format results for post-deployment
            const formattedResults = {
              recommendedConfiguration: {
                description: description,
                recommendedInstance: recommendedHardware,
                expectedInferenceTime: recommendedLatency,
                costPer1000: recommendedCost
              },
              hardwareAnalysis: {
                name: recommendedHardware,
                memory: 'Hardware-appropriate specifications',
                fp16Performance: 'Supported where available',
                architecture: 'ML-validated configuration',
                strengths: strengths,
                considerations: considerations,
                useCase: `Post-deployment optimization for ${optimizationMode} workload`
              },
              alternativeOptions: [{
                hardware: recommendedHardware,
                fullName: recommendedHardware,
                inferenceTime: recommendedLatency,
                costPer1000: recommendedCost,
                status: 'ML Model Recommended',
                recommended: true,
                memory: 'Appropriate sizing',
                architecture: 'Validated',
                improvement: recommendation.includes('Upgrade') ? 'Performance boost expected' :
                  recommendation.includes('Downgrade') ? 'Cost savings expected' :
                    'Current setup validated',
                mlDetails: {
                  rawPrediction: response.data.raw_prediction,
                  predictionValue: response.data.prediction_value,
                  currentHardware: currentHardware,
                  recommendationType: analysisData.recommendation_type
                }
              }],
              // Add post-deployment specific data
              isPostDeployment: true,
              analysisSummary: {
                ...analysisData,
                currentHardware: currentHardware,
                mlModelConfidence: `${response.data.raw_prediction}/10`,
                recommendationText: recommendation,
                workflowType: 'Post-deployment optimization'
              },
              rawOptimizationResults: response.data // Store full response for debugging
            };

            setOptimizationResults(formattedResults);

          }
        }
      }

    } catch (err) {
      console.error('Error getting recommendations:', err);
      console.error('Error response data:', err.response?.data);
      console.error('Error status:', err.response?.status);

      let errorMessage = 'Failed to get recommendations. Please try again.';
      if (err.response?.data?.detail) {
        // Pydantic validation error details
        if (Array.isArray(err.response.data.detail)) {
          console.log('Detailed validation errors:', err.response.data.detail);
          const missingFields = err.response.data.detail.map(detail => {
            const field = detail.loc?.join('.') || 'unknown';
            const message = detail.msg || 'validation error';
            const type = detail.type || '';
            console.log(`Field: ${field}, Message: ${message}, Type: ${type}`);
            return `${field}: ${message}`;
          }).join(', ');
          errorMessage = `Validation error: ${missingFields}`;
        } else {
          errorMessage = `Validation error: ${err.response.data.detail}`;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setIsRunningOptimization(false);
    }
  };


  return (
    <>
      {/* Optimization Mode Selector */}
      {/* <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimization Mode:</span>
          <button
            onClick={() => setOptimizationMode('pre-deployment')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${optimizationMode === 'pre-deployment'
                ? 'bg-[#01a982] text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            Pre-Deployment
          </button>
          <button
            onClick={() => setOptimizationMode('post-deployment')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${optimizationMode === 'post-deployment'
                ? 'bg-[#01a982] text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            Post-Deployment
          </button>
        </div>
      </div> */}

      {/* Main Form Section */}
      <h1 className="text-4xl font-medium mb-6" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
        <div className='flex items-center justify-between mb-4'>
          <div className="text-[24px] font-normal text-gray-900 dark:text-white">
            {optimizationMode === 'pre-deployment' ? 'Recommend Hardware' : 'Post-Deployment Optimization'}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsOverrideEnabled(!isOverrideEnabled)}
              className={`flex items-center gap-2 text-md transition-colors ${isOverrideEnabled
                ? 'text-orange-600 hover:text-orange-700'
                : 'text-[#01a982] hover:text-[#019670]'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {isOverrideEnabled ? 'Exit Override' : 'Override'}
            </button>
            <button
              onClick={fetchHostMetrics}
              disabled={isLoadingHostMetrics}
              className="flex items-center gap-2 text-md text-[#01a982] hover:text-[#019670] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingHostMetrics ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#01a982] border-t-transparent rounded-full animate-spin"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Host Metrics
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6">
          <div className="shadow-sm dark:border-gray-700 overflow-hidden">
            <div className="flex space-x-6">
              {/* Pre-Deployment Tab */}
              <button
                onClick={() => setOptimizationMode('pre-deployment')}
                className={`flex items-center gap-2 pb-2 text-base font-medium border-b-2 transition-all ${optimizationMode === 'pre-deployment'
                  ? 'text-emerald-700 border-emerald-700 text-xl'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-emerald-700 hover:border-emerald-700 text-xl'
                  }`}
              >
                <CodeXml className="w-4 h-4" />
                <span>Pre-Deployment</span>
              </button>

              {/* Post-Deployment Tab */}
              <button
                onClick={() => setOptimizationMode('post-deployment')}
                className={`flex items-center gap-2 pb-2 text-base font-medium border-b-2 transition-all ${optimizationMode === 'post-deployment'
                  ? 'text-emerald-700 border-emerald-700 text-xl'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-emerald-700 hover:border-emerald-700 text-xl'
                  }`}
              >
                <CodeXml className="w-4 h-4" />
                <span>Post-Deployment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Place your code here */}
        {/* Post-Deployment Section with Sub-tabs */}
        {optimizationMode === 'post-deployment' && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
            {/* Post-Deployment Mode Selector */}
            <div className="mb-6">
              {/* Sub-tabs for Post-Deployment */}
              <div className="flex justify-center mb-6">
                <div className="bg-white inline-flex items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 p-1 rounded-lg">
                  <button
                    onClick={() => setPostDeploymentMode('bare-metal')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${postDeploymentMode === 'bare-metal'
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Bare Metal Level Recommendation
                  </button>
                  <button
                    onClick={() => setPostDeploymentMode('vm-level')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${postDeploymentMode === 'vm-level'
                      ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    VM Level Recommendation
                  </button>
                </div>
              </div>
            </div>

            {/* Bare Metal Level Recommendation Content */}
            {postDeploymentMode === 'bare-metal' && (
              <div>
                <div className="mb-4">
                  <p className="text-md text-gray-500 dark:text-gray-300">Real-time resource utilization metrics of Bare Metal Host Machine</p>
                </div>

                {/* Host Metrics Status Indicator */}
                {hostMetricsLastUpdated && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last updated: {hostMetricsLastUpdated.toLocaleTimeString()}
                      </div>
                      {!isOverrideEnabled && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Auto-refreshing every 2s
                        </div>
                      )}
                      {isOverrideEnabled && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          Auto-refresh paused (Override mode)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {/* GPU Utilization */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Utilization
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={gpuUtilization}
                        onChange={(e) => setGpuUtilization(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter %"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {gpuUtilization}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GPU Memory Usage */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GPU Memory Usage
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={gpuMemoryUsage}
                        onChange={(e) => setGpuMemoryUsage(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter %"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {gpuMemoryUsage}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CPU Utilization */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Utilization
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={cpuUtilization}
                        onChange={(e) => setCpuUtilization(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter %"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {cpuUtilization}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CPU Memory Usage */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CPU Memory Usage
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={cpuMemoryUsage}
                        onChange={(e) => setCpuMemoryUsage(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter %"
                        min="0"
                        max="100"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {cpuMemoryUsage}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Disk IOPS */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Disk IOPS
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={diskIops}
                        onChange={(e) => setDiskIops(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter IOPS"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {diskIops} IOPS
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Network Bandwidth */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Network Bandwidth
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    {isOverrideEnabled ? (
                      <input
                        type="number"
                        value={networkBandwidth}
                        onChange={(e) => setNetworkBandwidth(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        placeholder="Enter MB/s"
                      />
                    ) : (
                      <div className="bg-white border border-gray-300 dark:bg-gray-700 rounded-lg p-3">
                        <div className="text-md font-medium text-gray-800 dark:text-gray-400">
                          {networkBandwidth} MB/s
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Hardware ID */}
                  <div>
                    <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Hardware
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>
                    <select
                      value={currentHardwareId}
                      onChange={(e) => setCurrentHardwareId(e.target.value)}
                      className="w-full px-3 py-2 border text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    >
                      <option value="">Select hardware ({hardwareData.length} available)</option>
                      {hardwareData.length > 0 ? (
                        hardwareData.map((hw) => {
                          const hardwareName = getHardwareName(hw);
                          return (
                            <option key={hw.id} value={hardwareName}>
                              {hardwareName}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>No hardware data loaded</option>
                      )}
                    </select>
                  </div>

                </div>
              </div>
            )}

            {/* VM Level Recommendation Content */}
            {postDeploymentMode === 'vm-level' && (
              <div>
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-300">Select a VM instance to analyze and optimize its hardware configuration</p>

                  {/* VM Error Display */}
                  {vmError && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-red-600 dark:text-red-400 text-sm">{vmError}</p>
                    </div>
                  )}

                  {/* VM Selection Dropdown */}
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select VM Instance
                      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </label>

                    <select
                      value={selectedVM?.vm_name || ''}
                      onChange={(e) => {
                        const vm = activeVMs.find(vm => vm.vm_name === e.target.value);
                        setSelectedVM(vm || null);

                        // Immediately populate VM Resource Metrics with VM's current usage
                        if (vm) {
                          setVmCpuMemoryUsage(vm.ram_usage_percent?.toString() || '0');
                          setVmGpuMemoryUsage(vm.vram_usage_percent?.toString() || '0');

                          // Also fetch live metrics from API
                          fetchVmMetrics(vm.vm_name);
                        } else {
                          // Clear metrics if no VM selected
                          setVmCpuMemoryUsage('');
                          setVmGpuMemoryUsage('');
                        }
                      }}
                      disabled={isLoadingVMs}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {isLoadingVMs ? 'Loading VM instances...' :
                          activeVMs.length === 0 ? 'No active VM instances found' :
                            `Select VM instance (${activeVMs.length} available)`}
                      </option>
                      {activeVMs.map((vm) => (
                        <option key={vm.vm_name} value={vm.vm_name}>
                          {vm.display_name}
                        </option>
                      ))}
                    </select>

                    {/* Selected VM Details */}
                    {selectedVM && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Selected VM Configuration</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">VM Name:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{selectedVM.vm_name}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Total RAM:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{selectedVM.memory_summary.ram}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Total VRAM:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{selectedVM.memory_summary.vram}</div>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">GPU Count:</span>
                            <div className="font-medium text-gray-900 dark:text-white">{selectedVM.gpu_count || 0}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Refresh VMs Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={fetchActiveVMs}
                        disabled={isLoadingVMs}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#01a982] hover:text-[#019670] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingVMs ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#01a982] border-t-transparent rounded-full animate-spin"></div>
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh VM List
                          </>
                        )}
                      </button>
                    </div>

                    {/* VM Resource Metrics Section - Only show when VM is selected */}
                    {selectedVM && (
                      <div className="mt-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white">VM Resource Metrics</h4>
                          <div className="flex gap-4">
                            <button
                              onClick={() => setIsVmOverrideEnabled(!isVmOverrideEnabled)}
                              className={`flex items-center gap-2 text-sm transition-colors ${isVmOverrideEnabled
                                ? 'text-orange-600 hover:text-orange-700'
                                : 'text-[#01a982] hover:text-[#019670]'
                                }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              {isVmOverrideEnabled ? 'Exit Override' : 'Override'}
                            </button>
                            <button
                              onClick={() => fetchVmMetrics(selectedVM.vm_name)}
                              disabled={isLoadingVmMetrics}
                              className="flex items-center gap-2 text-sm text-[#01a982] hover:text-[#019670] disabled:opacity-50"
                            >
                              {isLoadingVmMetrics ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-[#01a982] border-t-transparent rounded-full animate-spin"></div>
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Refresh Metrics
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Latest resource utilization metrics for VM: {selectedVM.vm_name}
                          </p>
                          {vmMetricsLastUpdated && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Last updated: {vmMetricsLastUpdated.toLocaleTimeString()}
                              </div>
                              {!isVmOverrideEnabled && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  Auto-refreshing every 30s
                                </div>
                              )}
                              {isVmOverrideEnabled && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  Auto-refresh paused (Override mode)
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {/* GPU Utilization */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              GPU Utilization
                              <span className="text-xs text-gray-500">%</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmGpuUtilization}
                                onChange={(e) => setVmGpuUtilization(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter %"
                                min="0"
                                max="100"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    `${vmGpuUtilization}%`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* GPU Memory Usage */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              GPU Memory Usage
                              <span className="text-xs text-gray-500">%</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmGpuMemoryUsage}
                                onChange={(e) => setVmGpuMemoryUsage(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter %"
                                min="0"
                                max="100"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    `${vmGpuMemoryUsage}%`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CPU Utilization */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              CPU Utilization
                              <span className="text-xs text-gray-500">%</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmCpuUtilization}
                                onChange={(e) => setVmCpuUtilization(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter %"
                                min="0"
                                max="100"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    `${vmCpuUtilization}%`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CPU Memory Usage */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              CPU Memory Usage
                              <span className="text-xs text-gray-500">%</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmCpuMemoryUsage}
                                onChange={(e) => setVmCpuMemoryUsage(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter %"
                                min="0"
                                max="100"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    `${vmCpuMemoryUsage}%`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Disk IOPS */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Disk IOPS
                              <span className="text-xs text-gray-500">IOPS</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmDiskIops}
                                onChange={(e) => setVmDiskIops(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter IOPS"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    vmDiskIops
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Network Bandwidth */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Network Bandwidth
                              <span className="text-xs text-gray-500">MB/s</span>
                              <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </label>
                            {isVmOverrideEnabled ? (
                              <input
                                type="number"
                                value={vmNetworkBandwidth}
                                onChange={(e) => setVmNetworkBandwidth(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                                placeholder="Enter MB/s"
                              />
                            ) : (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                                  {isLoadingVmMetrics ? (
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    `${vmNetworkBandwidth} MB/s`
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hardware Configuration Dropdown - Required for VM-level optimization */}
                    {selectedVM && (
                      <div className="mt-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Host Hardware Configuration
                          <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          Select the bare metal hardware that this VM is running on. This is required to determine GPU specifications for optimization.
                        </p>
                        <select
                          value={currentHardwareId}
                          onChange={(e) => setCurrentHardwareId(e.target.value)}
                          className="w-full px-3 py-2 border text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        >
                          <option value="">Select host hardware ({hardwareData.length} available)</option>
                          {hardwareData.length > 0 ? (
                            hardwareData.map((hw) => {
                              const hardwareName = getHardwareName(hw);
                              return (
                                <option key={hw.id} value={hardwareName}>
                                  {hardwareName}
                                </option>
                              );
                            })
                          ) : (
                            <option disabled>No hardware data loaded</option>
                          )}
                        </select>
                        {dropdownError && (
                          <p className="text-red-500 dark:text-red-400 text-sm mt-2">{dropdownError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}



        <h1 className="text-lg font-medium text-gray-900 dark:text-white my-2 mt-6">
          {optimizationMode === 'pre-deployment' ? 'Workload Parameters' : 'Runtime Parameters'}
        </h1>
        <p className="text-md text-gray-500 dark:text-gray-300">
          {optimizationMode === 'pre-deployment'
            ? 'Enter the details of your AI workload to get hardware recommendations'
            : 'Enter the details of your running AI workload to optimize hardware configuration'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}


        {/* Inner Container */}
        <div className="bg-white rounded-lg shadow-sm border dark:bg-gray-800 border-gray-200 p-4 mt-4 bgr">
          {/* Header Section */}
          <div className="mb-4">
            {/* Loading Indicators */}
            {isLoadingDropdowns && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Loading model names and task types from database...</p>
                </div>
              </div>
            )}

            {isLoadingModelData && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Loading model data and auto-filling fields...</p>
                </div>
              </div>
            )}
          </div>

          <div className="simulate-form-grid">
            {/* Model Name */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model Name
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('modelName')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'modelName' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Select the specific AI model from the database. Other fields will auto-populate.
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                  disabled={isLoadingDropdowns}
                >
                  <option value="">
                    {isLoadingDropdowns ? 'Loading model names...' : 'Select model name'}
                  </option>
                  {availableModelNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Framework */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Framework
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('framework')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'framework' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Choose the deep learning framework for your workload.
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                  disabled={isLoadingModelData}
                >
                  <option value="">Select framework</option>
                  <option value="PyTorch">PyTorch</option>
                  <option value="TensorFlow">TensorFlow</option>
                  <option value="JAX">JAX</option>
                  <option value="ONNX">ONNX</option>
                  <option value="TensorRT">TensorRT</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Task Type */}
            <div className="relative">
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Type
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('taskType')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'taskType' && (
                    <div className="absolute z-10 w-80 p-3 -top-20 left-6 bg-gray-800 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Training requires more computational resources than inference. This significantly impacts hardware recommendations.
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                  disabled={isLoadingDropdowns}
                >
                  <option value="">Select task type</option>
                  <option value="Training">Training</option>
                  <option value="Inference">Inference</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Scenario */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scenario
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('scenario')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'scenario' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Single Stream for single inference requests, Server for batch processing.
                    </div>
                  )}
                </div>
              </label>
              <div className="relative">
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="Single Stream">Single Stream</option>
                  <option value="Server">Server</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Model Size */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model Size (MB)
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('modelSize')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'modelSize' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      The total size of your model weights in megabytes.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
                placeholder="Enter model size in MB"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>

            {/* Parameters */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                Parameters (Millions)
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('parameters')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'parameters' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Total number of trainable parameters in millions.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder="Enter parameters in millions"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>

            {/* FLOPs */}
            <div>
              <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                GFLOPs (Billions)
                <div className="relative">
                  <Info
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                    onMouseEnter={() => setShowTooltip('flops')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'flops' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Floating-point operations per second in billions.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={flops}
                onChange={(e) => setFlops(e.target.value)}
                placeholder="Enter GFLOPs in billions"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>

            {/* Batch Size - Only for Training task type in pre-deployment */}
            {optimizationMode === 'pre-deployment' && taskType === 'Training' && (
              <div>
                <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Batch Size
                  <div className="relative">
                    <Info
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                      onMouseEnter={() => setShowTooltip('batchSize')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'batchSize' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Number of samples processed in parallel.
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                  placeholder="Enter batch size"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingModelData}
                />
              </div>
            )}

            {/* Input Size - Only for Training task type in pre-deployment */}
            {optimizationMode === 'pre-deployment' && taskType === 'Training' && (
              <div>
                <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Input Size
                  <div className="relative">
                    <Info
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                      onMouseEnter={() => setShowTooltip('inputSize')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'inputSize' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Input size for training data.
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={inputSize}
                  onChange={(e) => setInputSize(e.target.value)}
                  placeholder="Enter input size for training"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingModelData}
                />
              </div>
            )}

            {/* Is Full Training field - Only for Training task type in pre-deployment */}
            {optimizationMode === 'pre-deployment' && taskType === 'Training' && (
              <div>
                <label className="flex items-center gap-2 text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Is Full Training
                  <div className="relative">
                    <Info
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                      onMouseEnter={() => setShowTooltip('isFullTraining')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'isFullTraining' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Whether this is full training or fine-tuning.
                      </div>
                    )}
                  </div>
                </label>
                <select
                  value={isFullTraining}
                  onChange={(e) => setIsFullTraining(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingModelData}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            )}

          </div>


          {/* Load More Parameters Button */}
          {modelName && taskType && !showMoreParams && optimizationMode === 'pre-deployment' && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowMoreParams(true)}
                disabled={isLoadingModelData}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load More Parameters
              </button>
            </div>
          )}

          {/* Load More Parameters Button for Post-Deployment Bare-Metal */}
          {optimizationMode === 'post-deployment' && postDeploymentMode === 'bare-metal' && modelName && taskType && !showAdvancedParamsBare && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAdvancedParamsBare(true)}
                disabled={isLoadingModelData}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load Advanced Parameters
              </button>
            </div>
          )}

          {/* Load More Parameters Button for Post-Deployment VM-Level */}
          {optimizationMode === 'post-deployment' && postDeploymentMode === 'vm-level' && modelName && taskType && !showAdvancedParamsVM && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAdvancedParamsVM(true)}
                disabled={isLoadingModelData}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load Advanced Parameters
              </button>
            </div>
          )}

          {/* Additional Parameters - Show based on mode */}
          {(showMoreParams ||
            (optimizationMode === 'post-deployment' && postDeploymentMode === 'bare-metal' && showAdvancedParamsBare) ||
            (optimizationMode === 'post-deployment' && postDeploymentMode === 'vm-level' && showAdvancedParamsVM)) && (
              <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Advanced Parameters</h3>
                {optimizationMode === 'post-deployment' && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mb-4">
                    ⚠️ These fields are required for post-deployment optimization
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Architecture Type */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Architecture Type
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('architectureType')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'architectureType' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Specific architecture variant or implementation type.
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={architectureType}
                        onChange={(e) => setArchitectureType(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        disabled={isLoadingModelData}
                      >
                        <option value="">Select architecture type</option>
                        <option value="LlamaForCausalLM">LlamaForCausalLM</option>
                        <option value="Qwen2ForCausalLM">Qwen2ForCausalLM</option>
                        <option value="Phi3ForCausalLM">Phi3ForCausalLM</option>
                        <option value="MistralForCausalLM">MistralForCausalLM</option>
                        <option value="GemmaForCausalLM">GemmaForCausalLM</option>
                        <option value="PhiForCausalLM">PhiForCausalLM</option>
                        <option value="GPT2LMHeadModel">GPT2LMHeadModel</option>
                        <option value="BertForMaskedLM">BertForMaskedLM</option>
                        <option value="RobertaForMaskedLM">RobertaForMaskedLM</option>
                        <option value="AlbertForMaskedLM">AlbertForMaskedLM</option>
                        <option value="DistilBertForMaskedLM">DistilBertForMaskedLM</option>
                        <option value="resnet18">resnet18</option>
                        <option value="resnet34">resnet34</option>
                        <option value="resnet50">resnet50</option>
                        <option value="vgg16">vgg16</option>
                        <option value="vgg19">vgg19</option>
                        <option value="inception_v3">inception_v3</option>
                        <option value="efficientnet_b0">efficientnet_b0</option>
                        <option value="ViTForImageClassification">ViTForImageClassification</option>
                        <option value="DeiTForImageClassificationWithTeacher">DeiTForImageClassificationWithTeacher</option>
                        <option value="SwinForImageClassification">SwinForImageClassification</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Number of Hidden Layers */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Hidden Layers
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('hiddenLayers')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'hiddenLayers' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Total number of hidden layers in the neural network.
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      value={hiddenLayers}
                      onChange={(e) => setHiddenLayers(e.target.value)}
                      placeholder="Enter number of hidden layers"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
                  </div>

                  {/* Vocabulary Size */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vocabulary Size
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('vocabularySize')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'vocabularySize' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Size of the vocabulary used by the model (for NLP models).
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      value={vocabularySize}
                      onChange={(e) => setVocabularySize(e.target.value)}
                      placeholder="Enter vocabulary size"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
                  </div>

                  {/* Number of Attention Layers */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Attention Layers
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('attentionLayers')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'attentionLayers' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Number of attention/transformer layers in the model.
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      value={attentionLayers}
                      onChange={(e) => setAttentionLayers(e.target.value)}
                      placeholder="Enter number of attention layers"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
                  </div>

                  {/* Precision */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Precision
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('precision')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'precision' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Numerical precision used for model computations (FP16, FP32, etc.).
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={precision}
                        onChange={(e) => setPrecision(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        disabled={isLoadingModelData}
                      >
                        <option value="">Select precision</option>
                        <option value="FP16">FP16 (Half Precision)</option>
                        <option value="FP32">FP32 (Single Precision)</option>
                        <option value="FP64">FP64 (Double Precision)</option>
                        <option value="INT8">INT8 (8-bit Integer)</option>
                        <option value="INT4">INT4 (4-bit Integer)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Activation Function */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Activation Function
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('activationFunction')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'activationFunction' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Primary activation function used in the model layers.
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={activationFunction}
                        onChange={(e) => setActivationFunction(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
                        disabled={isLoadingModelData}
                      >
                        <option value="">Select activation function</option>
                        <option value="silu">SiLU</option>
                        <option value="gelu">GELU</option>
                        <option value="gelu_new">GELU New</option>
                        <option value="gelu_pytorch_tanh">GELU PyTorch Tanh</option>
                        <option value="relu">ReLU</option>
                        <option value="swish">Swish</option>
                        <option value="tanh">Tanh</option>
                        <option value="sigmoid">Sigmoid</option>
                        <option value="leaky_relu">Leaky ReLU</option>
                        <option value="elu">ELU</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Embedding Vector Dimension */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Embedding Vector Dimension
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('embeddingDimension')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'embeddingDimension' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Dimension of the embedding vectors (hidden size).
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      value={embeddingDimension}
                      onChange={(e) => setEmbeddingDimension(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
                  </div>

                  {/* FFN (MLP) Dimension */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      FFN (MLP) Dimension
                      <div className="relative">
                        <Info
                          className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help"
                          onMouseEnter={() => setShowTooltip('ffnDimension')}
                          onMouseLeave={() => setShowTooltip('')}
                        />
                        {showTooltip === 'ffnDimension' && (
                          <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                            <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                            Dimension of the feed-forward network (MLP) layers.
                          </div>
                        )}
                      </div>
                    </label>
                    <input
                      type="number"
                      value={ffnDimension}
                      onChange={(e) => setFfnDimension(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
                  </div>
                </div>

                {/* Collapse Buttons */}
                {optimizationMode === 'pre-deployment' && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowMoreParams(false)}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Show Less Parameters
                    </button>
                  </div>
                )}
                {optimizationMode === 'post-deployment' && postDeploymentMode === 'bare-metal' && showAdvancedParamsBare && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowAdvancedParamsBare(false)}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Hide Advanced Parameters
                    </button>
                  </div>
                )}
                {optimizationMode === 'post-deployment' && postDeploymentMode === 'vm-level' && showAdvancedParamsVM && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowAdvancedParamsVM(false)}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      Hide Advanced Parameters
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end gap-4 my-3">
            <button
              onClick={handleGetRecommendations}
              disabled={isLoadingModelData || isLoadingDropdowns || isRunningOptimization || !modelName || !taskType}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-300 text-emerald-700 rounded-full border text-lg font-medium flex items-center gap-2 h-11 transition-colors"
            >
              {isRunningOptimization ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Getting Recommendations...
                </div>
              ) : (
                optimizationMode === 'pre-deployment' ? 'Configuration' : 'Configuration'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {optimizationResults && (
        optimizationMode === 'pre-deployment' ? (
          <SimulationResults
            results={optimizationResults}
            title="Top 3 Hardware Recommendations"
            subtitle="Hardware configurations sorted by cost per 1000 inferences"
          />
        ) : (
          <OptimizationResults results={optimizationResults} mode={optimizationMode} />
        )
      )}
    </>
  );
};

export default OptimizeTab;