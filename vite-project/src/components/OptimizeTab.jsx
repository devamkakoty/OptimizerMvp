import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import apiClient from '../config/axios';
import OptimizationResults from './OptimizationResults';

const OptimizeTab = () => {
  const [optimizationMode, setOptimizationMode] = useState('pre-deployment');
  const [modelType, setModelType] = useState('');
  const [framework, setFramework] = useState('');
  const [taskType, setTaskType] = useState('');
  const [modelSize, setModelSize] = useState('');
  const [parameters, setParameters] = useState('');
  const [flops, setFlops] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [latency, setLatency] = useState('');
  const [throughput, setThroughput] = useState('');
  const [showTooltip, setShowTooltip] = useState('');

  // Additional parameters state
  const [showMoreParams, setShowMoreParams] = useState(false);
  const [architectureType, setArchitectureType] = useState('');
  const [hiddenLayers, setHiddenLayers] = useState('');
  const [vocabularySize, setVocabularySize] = useState('');
  const [attentionLayers, setAttentionLayers] = useState('');
  const [activationFunction, setActivationFunction] = useState('');

  // Dropdown options from backend
  const [availableModelTypes, setAvailableModelTypes] = useState([]);
  const [availableTaskTypes, setAvailableTaskTypes] = useState([]);

  // Post-deployment specific state
  const [currentCpuUsage, setCurrentCpuUsage] = useState('');
  const [currentGpuUsage, setCurrentGpuUsage] = useState('');
  const [currentMemoryUsage, setCurrentMemoryUsage] = useState('');
  const [currentCostPer1000, setCurrentCostPer1000] = useState('');
  const [optimizationPriority, setOptimizationPriority] = useState('balanced');

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
  const [error, setError] = useState('');
  
  // Optimization results state
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isRunningOptimization, setIsRunningOptimization] = useState(false);

  // Fetch dropdown options on component mount
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      setIsLoadingDropdowns(true);
      try {
        console.log('Fetching dropdown options for OptimizeTab...');
        
        // Fetch model types and task types in parallel
        const [modelTypesResponse, taskTypesResponse] = await Promise.all([
          apiClient.get('/model/types'),
          apiClient.get('/model/task-types')
        ]);

        console.log('Model types response:', modelTypesResponse.data);
        console.log('Task types response:', taskTypesResponse.data);

        if (modelTypesResponse.data.status === 'success') {
          console.log('Setting model types:', modelTypesResponse.data.model_types);
          setAvailableModelTypes(modelTypesResponse.data.model_types || []);
        } else {
          console.error('Model types response not successful:', modelTypesResponse.data);
        }

        if (taskTypesResponse.data.status === 'success') {
          console.log('Setting task types:', taskTypesResponse.data.task_types);
          setAvailableTaskTypes(taskTypesResponse.data.task_types || []);
        } else {
          console.error('Task types response not successful:', taskTypesResponse.data);
        }
      } catch (err) {
        console.error('Error fetching dropdown options:', err);
        console.error('Error details:', err.response?.data || err.message);
        
        // Fallback to hardcoded values if backend is not available
        console.log('Using fallback dropdown values...');
        setAvailableModelTypes(['bert', 'gpt', 'resnet', 'llama', 't5']);
        setAvailableTaskTypes(['Inference']);
        
        setError('Failed to load model and task type options from backend. Using default values.');
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    fetchDropdownOptions();
  }, []);

  // Clear form data when switching between pre/post deployment modes
  useEffect(() => {
    // Clear all form fields when mode changes
    setModelType('');
    setTaskType('');
    setFramework('');
    setModelSize('');
    setParameters('');
    setFlops('');
    setBatchSize('');
    setLatency('');
    setThroughput('');
    setArchitectureType('');
    setHiddenLayers('');
    setVocabularySize('');
    setAttentionLayers('');
    setActivationFunction('');
    
    // Clear post-deployment specific fields
    setCurrentCpuUsage('');
    setCurrentGpuUsage('');
    setCurrentMemoryUsage('');
    setCurrentCostPer1000('');
    setOptimizationPriority('balanced');
    
    setError('');
    setOptimizationResults(null);
    setShowMoreParams(false);
  }, [optimizationMode]);

  // Fetch and prefill parameters when both model type and task type are selected (PRE-DEPLOYMENT ONLY)
  useEffect(() => {
    const fetchData = async () => {
      if (!modelType || !taskType) {
        return;
      }

      // Auto-fill data for both pre-deployment and post-deployment modes

      setIsLoading(true);
      setError('');

      try {
        // Call the backend API to get model data
        const response = await apiClient.post('/model/get-model-data', {
          model_type: modelType,
          task_type: taskType
        });
        
        // Check if the response is successful
        if (response.data.status === 'success' && response.data.model_data) {
          const modelData = response.data.model_data;
          
          // Prefill the form with model data from backend (pre-deployment only)
          setModelSize(modelData.model_size_mb?.toString() || '');
          setParameters(modelData.total_parameters_millions?.toString() || '');
          // Set a default FLOPs value based on model size and parameters
          const estimatedFlops = (modelData.total_parameters_millions || 0) * 2; // Rough estimation
          setFlops(estimatedFlops.toString());
          setBatchSize('1'); // Default batch size
          setLatency(''); // Keep empty for user to set requirements
          setThroughput(''); // Keep empty for user to set requirements
          
          // Set framework from model data
          setFramework(modelData.framework?.toLowerCase() || 'pytorch');
          
          // Prefill additional parameters if available
          setArchitectureType(modelData.architecture_type || '');
          setHiddenLayers(modelData.number_of_hidden_layers?.toString() || '');
          setVocabularySize(modelData.vocabulary_size?.toString() || '');
          setAttentionLayers(modelData.number_of_attention_layers?.toString() || '');
          setActivationFunction(modelData.activation_function || '');
        } else {
          setError('Model data not found for the selected type and task.');
        }
        
      } catch (err) {
        console.error('Error fetching model data:', err);
        if (err.response?.status === 404) {
          setError('No model found for the selected type and task combination.');
        } else {
          setError('Failed to load model data from backend. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [modelType, taskType, optimizationMode]);

  // Handle Get Recommendations
  const handleGetRecommendations = async () => {
    if (!modelType || !taskType) {
      setError('Please select both model type and task type');
      return;
    }

    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    try {
      let optimizationParams;
      
      if (optimizationMode === 'pre-deployment') {
        // Pre-deployment: Use workload parameters for hardware recommendation
        optimizationParams = {
          model_type: modelType,
          framework: framework || 'pytorch',
          task_type: taskType,
          model_size_mb: parseFloat(modelSize) || 0,
          parameters_millions: parseFloat(parameters) || 0,
          flops_billions: parseFloat(flops) || 0,
          batch_size: parseInt(batchSize) || 1,
          latency_requirement_ms: parseFloat(latency) || null,
          throughput_requirement_qps: parseFloat(throughput) || null,
          target_fp16_performance: true,
          optimization_priority: optimizationPriority
        };
      } else {
        // Post-deployment: Use current metrics + workload parameters for optimization
        optimizationParams = {
          // Basic workload info
          model_type: modelType,
          framework: framework || 'pytorch',
          task_type: taskType,
          model_size_mb: parseFloat(modelSize) || 0,
          parameters_millions: parseFloat(parameters) || 0,
          flops_billions: parseFloat(flops) || 0,
          batch_size: parseInt(batchSize) || 1,
          latency_requirement_ms: parseFloat(latency) || null,
          throughput_requirement_qps: parseFloat(throughput) || null,
          target_fp16_performance: true,
          optimization_priority: optimizationPriority,
          
          // Current resource metrics (from form input)
          cpu_usage_percent: parseFloat(currentCpuUsage) || null,
          gpu_usage_percent: parseFloat(currentGpuUsage) || null,
          memory_usage_percent: parseFloat(currentMemoryUsage) || null,
          current_latency_ms: parseFloat(latency) || null, // Use the existing latency field
          current_throughput_qps: parseFloat(throughput) || null, // Use the existing throughput field
          current_memory_gb: parseFloat(modelSize) / 1000 || null,
          current_cost_per_1000: parseFloat(currentCostPer1000) || null
        };
      }

      // Use the unified post-deployment optimization endpoint
      const response = await apiClient.post('/deployment/post-deployment-optimization', optimizationParams);
      
      // Process and format optimization results
      if (response.data.status === 'success' && response.data.optimization_results) {
        // Format results to match the expected structure
        const formattedResults = {
          recommendedConfiguration: {
            description: `${response.data.optimization_results[0]?.hardware} recommended for optimal performance`,
            recommendedInstance: response.data.optimization_results[0]?.hardware || 'A10',
            expectedInferenceTime: `${response.data.optimization_results[0]?.projected_performance?.latency_ms?.toFixed(2)} ms` || '1.74 ms',
            costPer1000: `$${response.data.optimization_results[0]?.projected_performance?.cost_per_1000?.toFixed(4)}` || '$0.0004'
          },
          hardwareAnalysis: {
            name: response.data.optimization_results[0]?.full_name || 'NVIDIA A10 GPU',
            memory: `${response.data.optimization_results[0]?.projected_performance?.memory_gb?.toFixed(0)}GB` || '24GB',
            fp16Performance: response.data.optimization_results[0]?.projected_performance?.fp16_support ? 'Supported' : 'Not Supported',
            architecture: 'Ampere', // Default
            strengths: ['Good price-performance ratio', 'Moderate power consumption', 'Versatile'],
            considerations: ['Performance may vary based on specific workload'],
            useCase: `Optimized for ${optimizationMode} workload`
          },
          alternativeOptions: response.data.optimization_results.map(result => ({
            hardware: result.hardware,
            fullName: result.full_name,
            inferenceTime: `${result.projected_performance?.latency_ms?.toFixed(2)} ms`,
            costPer1000: `$${result.projected_performance?.cost_per_1000?.toFixed(4)}`,
            status: 'Meets requirements',
            recommended: result === response.data.optimization_results[0],
            memory: `${result.projected_performance?.memory_gb?.toFixed(0)}GB`,
            architecture: 'Ampere' // Default
          })) || []
        };
        
        setOptimizationResults(formattedResults);
      } else {
        setError('Optimization completed but no results were returned.');
      }
      
    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setIsRunningOptimization(false);
    }
  };

  // Handle Demo Recommendations (with mock data)
  const handleDemoRecommendations = () => {
    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    // Simulate API delay
    setTimeout(() => {
      const mockResults = {
        recommendedConfiguration: {
          description: "A10 meets your SLA at $0.00036 per 1000 inferences and latency 1.74 ms. The next best is T4 at $0.00037 per 1000 inferences and latency 3.72 ms.",
          recommendedInstance: "A10",
          expectedInferenceTime: "1.74 ms",
          costPer1000: "$0.0004"
        },
        hardwareAnalysis: {
          name: "NVIDIA A10 GPU",
          memory: "24GB GDDR6",
          fp16Performance: "125 TFLOPS",
          architecture: "Ampere",
          strengths: [
            "Good price-performance ratio",
            "Moderate power consumption",
            "Versatile"
          ],
          considerations: [
            "Lower memory than A100",
            "Less suitable for very large models"
          ],
          useCase: "Balanced performance for inference and light training"
        },
        alternativeOptions: [
          {
            hardware: "A10",
            fullName: "NVIDIA A10 GPU",
            inferenceTime: "1.74 ms",
            costPer1000: "$0.0004",
            status: "Meets all requirements",
            recommended: true,
            memory: "24GB GDDR6",
            architecture: "Ampere"
          },
          {
            hardware: "T4",
            fullName: "NVIDIA Tesla T4 GPU",
            inferenceTime: "3.72 ms",
            costPer1000: "$0.0004",
            status: "Meets all requirements",
            memory: "16GB GDDR6",
            architecture: "Turing"
          },
          {
            hardware: "RTX_3070",
            fullName: "NVIDIA GeForce RTX 3070",
            inferenceTime: "2.81 ms",
            costPer1000: "$0.0004",
            status: "Meets all requirements",
            memory: "8GB GDDR6",
            architecture: "Ampere"
          },
          {
            hardware: "A100",
            fullName: "NVIDIA A100 Tensor Core GPU",
            inferenceTime: "0.96 ms",
            costPer1000: "$0.0005",
            status: "Meets all requirements",
            memory: "40GB HBM2e",
            architecture: "Ampere"
          },
          {
            hardware: "H100",
            fullName: "NVIDIA H100 Tensor Core GPU",
            inferenceTime: "0.76 ms",
            costPer1000: "$0.0006",
            status: "Meets all requirements",
            memory: "80GB HBM3",
            architecture: "Hopper"
          }
        ]
      };
      
      setOptimizationResults(mockResults);
      setIsRunningOptimization(false);
    }, 2000); // 2 second delay to show loading
  };

  return (
    <>
      {/* Optimization Mode Selector */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimization Mode:</span>
          <button
            onClick={() => setOptimizationMode('pre-deployment')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              optimizationMode === 'pre-deployment'
                ? 'bg-[#01a982] text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Pre-Deployment
          </button>
          <button
            onClick={() => setOptimizationMode('post-deployment')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              optimizationMode === 'post-deployment'
                ? 'bg-[#01a982] text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Post-Deployment
          </button>
        </div>
      </div>

      {/* Resource Metrics for Post-Deployment */}
      {optimizationMode === 'post-deployment' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Resource Metrics</h2>
              <p className="text-gray-600 dark:text-gray-300">Real-time resource utilization metrics</p>
            </div>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 text-sm text-[#01a982] hover:text-[#019670]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Override
              </button>
              <button className="flex items-center gap-2 text-sm text-[#01a982] hover:text-[#019670]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Gpu Utilization', value: '72%' },
              { label: 'Gpu Memory Usage', value: '41%' },
              { label: 'Cpu Utilization', value: '31%' },
              { label: 'Ram Usage', value: '35%' },
              { label: 'Disk I O P S', value: '168 IOPS' },
              { label: 'Network Bandwidth', value: '92 MB/s' },
              { label: 'Avg Latency', value: '48 ms' },
              { label: 'Throughput', value: '100/sec' }
            ].map((metric, index) => (
              <div key={index}>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {metric.label}
                  <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Form Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {optimizationMode === 'pre-deployment' ? 'Workload Parameters' : 'Runtime Parameters'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
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
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-blue-600 dark:text-blue-400 text-sm">Loading optimization parameters...</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model Type
              <div className="relative">
                <Info 
                  className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                  onMouseEnter={() => setShowTooltip('modelType')}
                  onMouseLeave={() => setShowTooltip('')}
                />
                {showTooltip === 'modelType' && (
                  <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                    <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                    Select the type of AI model architecture you want to optimize.
                  </div>
                )}
              </div>
            </label>
            <div className="relative">
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isLoadingDropdowns}
              >
                <option value="">
                  {isLoadingDropdowns ? 'Loading model types...' : 'Select model type'}
                </option>
                {availableModelTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.toUpperCase()}
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <option value="">Select framework</option>
                <option value="pytorch">PyTorch</option>
                <option value="tensorflow">TensorFlow</option>
                <option value="jax">JAX</option>
                <option value="onnx">ONNX</option>
                <option value="tensorrt">TensorRT</option>
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isLoadingDropdowns}
              >
                <option value="">
                  {isLoadingDropdowns ? 'Loading task types...' : 'Select task type'}
                </option>
                {availableTaskTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
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

          {/* Model Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          {/* Parameters */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          {/* FLOPs */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              FLOPs (Billions)
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
              placeholder="Enter FLOPs in billions"
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          {/* Batch Size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          {/* Latency - Context aware based on deployment mode */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {optimizationMode === 'pre-deployment' ? 'Latency Requirement (ms)' : 'Current Latency (ms)'}
              <div className="relative">
                <Info 
                  className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                  onMouseEnter={() => setShowTooltip('latency')}
                  onMouseLeave={() => setShowTooltip('')}
                />
                {showTooltip === 'latency' && (
                  <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                    <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                    {optimizationMode === 'pre-deployment' 
                      ? 'Maximum acceptable latency for inference in milliseconds.' 
                      : 'Current inference latency in milliseconds.'}
                  </div>
                )}
              </div>
            </label>
            <input
              type="number"
              value={latency}
              onChange={(e) => setLatency(e.target.value)}
              placeholder={optimizationMode === 'pre-deployment' 
                ? 'Optional - Enter max latency in ms' 
                : 'Enter current latency in ms'}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>

          {/* Throughput - Context aware based on deployment mode */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {optimizationMode === 'pre-deployment' ? 'Throughput Requirement (QPS)' : 'Current Throughput (QPS)'}
              <div className="relative">
                <Info 
                  className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                  onMouseEnter={() => setShowTooltip('throughput')}
                  onMouseLeave={() => setShowTooltip('')}
                />
                {showTooltip === 'throughput' && (
                  <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                    <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                    {optimizationMode === 'pre-deployment' 
                      ? 'Minimum required queries per second.' 
                      : 'Current queries per second.'}
                  </div>
                )}
              </div>
            </label>
            <input
              type="number"
              value={throughput}
              onChange={(e) => setThroughput(e.target.value)}
              placeholder={optimizationMode === 'pre-deployment' 
                ? 'Optional - Enter min throughput in QPS' 
                : 'Enter current throughput in QPS'}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Post-Deployment Additional Metrics */}
        {optimizationMode === 'post-deployment' && (
          <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Resource Metrics</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
              Enter additional system metrics to improve optimization accuracy.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current CPU Usage */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current CPU Usage (%)
                  <div className="relative">
                    <Info 
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                      onMouseEnter={() => setShowTooltip('currentCpuUsage')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'currentCpuUsage' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Current CPU utilization percentage (0-100)
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={currentCpuUsage}
                  onChange={(e) => setCurrentCpuUsage(e.target.value)}
                  placeholder="Optional - Enter current CPU usage %"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                />
              </div>

              {/* Current GPU Usage */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current GPU Usage (%)
                  <div className="relative">
                    <Info 
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                      onMouseEnter={() => setShowTooltip('currentGpuUsage')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'currentGpuUsage' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Current GPU utilization percentage (0-100)
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={currentGpuUsage}
                  onChange={(e) => setCurrentGpuUsage(e.target.value)}
                  placeholder="Optional - Enter current GPU usage %"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                />
              </div>

              {/* Current Memory Usage */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Memory Usage (%)
                  <div className="relative">
                    <Info 
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                      onMouseEnter={() => setShowTooltip('currentMemoryUsage')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'currentMemoryUsage' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Current memory utilization percentage (0-100)
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={currentMemoryUsage}
                  onChange={(e) => setCurrentMemoryUsage(e.target.value)}
                  placeholder="Optional - Enter current memory usage %"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                />
              </div>

              {/* Current Cost */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Cost per 1000 Inferences ($)
                  <div className="relative">
                    <Info 
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                      onMouseEnter={() => setShowTooltip('currentCost')}
                      onMouseLeave={() => setShowTooltip('')}
                    />
                    {showTooltip === 'currentCost' && (
                      <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                        <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                        Current cost per 1000 inferences in USD
                      </div>
                    )}
                  </div>
                </label>
                <input
                  type="number"
                  value={currentCostPer1000}
                  onChange={(e) => setCurrentCostPer1000(e.target.value)}
                  placeholder="Optional - Enter current cost per 1000 inferences"
                  min="0"
                  step="0.0001"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Load More Parameters Button */}
        {modelType && taskType && !showMoreParams && (
          <div className="mt-6 flex justify-center">
            <button 
              onClick={() => setShowMoreParams(true)}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load More Parameters
            </button>
          </div>
        )}

        {/* Additional Parameters */}
        {showMoreParams && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Parameters</h3>
            
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    <option value="">Select architecture type</option>
                    <option value="encoder-decoder">Encoder-Decoder</option>
                    <option value="encoder-only">Encoder-Only</option>
                    <option value="decoder-only">Decoder-Only</option>
                    <option value="autoencoder">Autoencoder</option>
                    <option value="vanilla">Vanilla</option>
                    <option value="residual">Residual</option>
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>

              {/* Activation Function */}
              <div className="md:col-span-2">
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    <option value="">Select activation function</option>
                    <option value="relu">ReLU</option>
                    <option value="gelu">GELU</option>
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
            </div>

            {/* Collapse Button */}
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setShowMoreParams(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Show Less Parameters
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={handleGetRecommendations}
            disabled={isLoading || isRunningOptimization || !modelType || !taskType}
            className="px-8 py-3 bg-gradient-to-r from-[#01a982] to-[#00d4aa] text-white font-medium rounded-lg hover:from-[#019670] hover:to-[#00c299] transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isRunningOptimization ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Getting Recommendations...
              </div>
            ) : (
              optimizationMode === 'pre-deployment' ? 'Get Recommended Configuration' : 'Get Optimized Configuration'
            )}
          </button>
          
          <button 
            onClick={handleDemoRecommendations}
            disabled={isLoading || isRunningOptimization}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isRunningOptimization ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading Demo...
              </div>
            ) : (
              'Demo Results'
            )}
          </button>
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResults && (
        <OptimizationResults results={optimizationResults} mode={optimizationMode} />
      )}
    </>
  );
};

export default OptimizeTab;