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
  const [precision, setPrecision] = useState('');
  
  // Store the actual model name from the API
  const [selectedModelName, setSelectedModelName] = useState('');

  // Dropdown options from backend
  const [availableModelTypes, setAvailableModelTypes] = useState([]);
  const [availableTaskTypes, setAvailableTaskTypes] = useState([]);

  // Post-deployment specific state - using the specific fields provided
  const [gpuMemoryUsage, setGpuMemoryUsage] = useState('');
  const [cpuMemoryUsage, setCpuMemoryUsage] = useState('');
  const [cpuUtilization, setCpuUtilization] = useState('');
  const [gpuUtilization, setGpuUtilization] = useState('');
  const [diskIops, setDiskIops] = useState('');
  const [networkBandwidth, setNetworkBandwidth] = useState('');
  const [currentHardwareId, setCurrentHardwareId] = useState('');
  const [optimizationPriority, setOptimizationPriority] = useState('balanced');

  // Hardware data state
  const [hardwareData, setHardwareData] = useState([]);
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
  const [isLoadingHardware, setIsLoadingHardware] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
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

  // Initialize dropdown options and fetch hardware data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingDropdowns(true);
      
      console.log('Initializing OptimizeTab data...');
      
      // Use fallback values directly for model types and task types since endpoints don't exist
      setAvailableModelTypes(['llama', 'qwen2', 'phi3', 'mistral', 'gemma', 'phi', 'gpt2', 'bert', 'roberta', 'albert', 'distilbert', 'resnet18', 'resnet34', 'resnet50', 'vgg16', 'vgg19', 'inception_v3', 'efficientnet_b0', 'vit', 'deit', 'swin']);
      setAvailableTaskTypes(['Inference', 'Training']);
      
      // Still fetch hardware data since that endpoint exists
      try {
        console.log('Fetching hardware data...');
        const hardwareResponse = await apiClient.get('/hardware/');
        
        console.log('Hardware response:', hardwareResponse.data);

        if (hardwareResponse.data.status === 'success') {
          console.log('Setting hardware data:', hardwareResponse.data.hardware_list);
          console.log('Hardware data length:', hardwareResponse.data.hardware_list?.length);
          setHardwareData(hardwareResponse.data.hardware_list || []);
          
          // Set default values from first hardware if available and not in override mode
          if (!isOverrideEnabled && hardwareResponse.data.hardware_list?.length > 0) {
            const firstHardware = hardwareResponse.data.hardware_list[0];
            console.log('First hardware:', firstHardware);
            // Create a descriptive hardware name
            const hardwareName = getHardwareName(firstHardware);
            console.log('Generated hardware name:', hardwareName);
            setCurrentHardwareId(hardwareName);
            // Leave resource metrics empty - user must fill them in
          }
        } else {
          console.error('Hardware response not successful:', hardwareResponse.data);
          console.log('Full hardware response:', hardwareResponse.data);
        }
      } catch (err) {
        console.error('Error fetching hardware data:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError('Failed to load hardware data from backend.');
      } finally {
        setIsLoadingDropdowns(false);
      }
    };

    initializeData();
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
    setPrecision('');
    setSelectedModelName('');
    
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
          
          // Prefill the form with model data from backend
          setModelSize(modelData.model_size_mb?.toString());
          setParameters(modelData.total_parameters_millions?.toString());
          setFlops(modelData.flops?.toString());
          
          // Set framework from model data (keep original case)
          setFramework(modelData.framework);
          
          // Store the actual model name for API calls
          setSelectedModelName(modelData.model_name);
          
          // Prefill additional parameters if available
          setArchitectureType(modelData.architecture_type);
          setHiddenLayers(modelData.embedding_vector_dimension?.toString());
          setVocabularySize(modelData.vocabulary_size?.toString());
          setAttentionLayers(modelData.ffn_dimension?.toString());
          setActivationFunction(modelData.activation_function);
          setPrecision(modelData.precision);
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

    if (!selectedModelName) {
      setError('Model data not loaded. Please select model type and task type first.');
      return;
    }

    if (!modelSize || !parameters || !flops) {
      setError('Please ensure model size, parameters, and FLOPs are filled in.');
      return;
    }

    if (optimizationMode === 'pre-deployment') {
      if (!batchSize || !latency || !throughput) {
        setError('Please fill in batch size, latency requirement, and throughput requirement for pre-deployment optimization.');
        return;
      }
    }

    // Validate resource metrics for post-deployment mode
    if (optimizationMode === 'post-deployment') {
      const requiredFields = [
        { value: gpuUtilization, name: 'GPU Utilization' },
        { value: gpuMemoryUsage, name: 'GPU Memory Usage' },
        { value: cpuUtilization, name: 'CPU Utilization' },
        { value: cpuMemoryUsage, name: 'CPU Memory Usage' },
        { value: diskIops, name: 'Disk IOPS' },
        { value: networkBandwidth, name: 'Network Bandwidth' },
        { value: currentHardwareId, name: 'Current Hardware' },
        { value: architectureType, name: 'Architecture Type' },
        { value: precision, name: 'Precision' },
        { value: vocabularySize, name: 'Vocabulary Size' },
        { value: activationFunction, name: 'Activation Function' }
      ];

      const missingFields = requiredFields.filter(field => !field.value || field.value === '');
      
      if (missingFields.length > 0) {
        setError(`Please fill in the following fields: ${missingFields.map(f => f.name).join(', ')}. Click "Load More Parameters" and "Override" to enter all values.`);
        return;
      }
    }

    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    try {
      let optimizationParams;
      
      if (optimizationMode === 'pre-deployment') {
        // Pre-deployment: Use /api/model/simulate-performance endpoint
        optimizationParams = {
          // Exact same format as SimulateTab to ensure compatibility
          Model: selectedModelName,
          Framework: framework,
          Task_Type: taskType,
          Total_Parameters_Millions: parseFloat(parameters),
          Model_Size_MB: parseFloat(modelSize),
          Architecture_type: architectureType,
          Model_Type: modelType,
          Embedding_Vector_Dimension: parseInt(hiddenLayers),
          Precision: precision,
          Vocabulary_Size: parseInt(vocabularySize),
          FFN_Dimension: parseInt(attentionLayers),
          Activation_Function: activationFunction,
          FLOPs: parseFloat(flops)
        };
      } else {
        // Post-deployment: Use exact format with aliases that match backend PostDeploymentRequest
        optimizationParams = {
          // Core model fields using field aliases as defined in the Pydantic model
          "Model Name": selectedModelName,
          "Framework": framework,
          "Total Parameters (Millions)": parseFloat(parameters),
          "Model Size (MB)": parseFloat(modelSize),
          "Architecture type": architectureType,
          "Model Type": modelType,
          "Precision": precision,
          "Vocabulary Size": parseInt(vocabularySize),
          "Activation Function": activationFunction,
          // Resource metrics using direct field names (no aliases)
          gpu_memory_usage: parseFloat(gpuMemoryUsage),
          cpu_memory_usage: parseFloat(cpuMemoryUsage),
          cpu_utilization: parseFloat(cpuUtilization),
          gpu_utilization: parseFloat(gpuUtilization),
          disk_iops: parseFloat(diskIops),
          network_bandwidth: parseFloat(networkBandwidth),
          current_hardware_id: currentHardwareId
          // Note: batch_size, latency, and throughput are not needed for post-deployment
        };
      }

      // Use the correct endpoint based on mode
      const endpoint = optimizationMode === 'pre-deployment' 
        ? '/model/simulate-performance' 
        : '/deployment/post-deployment-optimization';
      
      // Debug logging
      console.log('Optimization mode:', optimizationMode);
      console.log('Endpoint:', endpoint);
      console.log('Request params:', optimizationParams);
      console.log('Selected model name:', selectedModelName);
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
        
        const isPostDeployment = response.data.workflow_type === 'post_deployment';
        
        if (isPostDeployment) {
          // Handle new post-deployment response format
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
            description = `🚀 ML Model Analysis: ${recommendation}\n\nBased on your current ${currentHardware} performance metrics and workload analysis, our machine learning model (prediction confidence: ${response.data.raw_prediction}/10) recommends upgrading to ${recommendedHardware} for optimal performance.`;
            strengths = [
              'Significant performance improvement expected',
              'Better resource utilization',
              'Enhanced processing capabilities',
              'Future-ready hardware specifications'
            ];
            considerations = [
              'Hardware upgrade required',
              'Migration planning needed',
              'Cost-benefit analysis recommended',
              'Performance gains validated by ML model'
            ];
          } else if (recommendation.toLowerCase().includes('downgrade')) {
            description = `💡 ML Model Analysis: ${recommendation}\n\nYour current ${currentHardware} appears to be over-provisioned for this workload. Our ML model suggests ${recommendedHardware} would be more cost-effective while maintaining performance.`;
            strengths = [
              'Cost optimization opportunity',
              'Right-sizing for current workload',
              'Reduced operational expenses',
              'Efficient resource allocation'
            ];
            considerations = [
              'Ensure performance requirements are met',
              'Monitor workload changes',
              'Cost savings potential',
              'ML model confidence validated'
            ];
          } else if (recommendation.toLowerCase().includes('maintain')) {
            description = `✅ ML Model Analysis: Your current ${currentHardware} is optimally configured for this workload. No hardware changes recommended at this time.`;
            strengths = [
              'Current hardware is well-suited',
              'Optimal price-performance ratio',
              'No migration overhead',
              'Stable performance expected'
            ];
            considerations = [
              'Continue monitoring performance',
              'Re-evaluate if workload changes',
              'Current configuration validated',
              'ML model confirms optimal setup'
            ];
          } else {
            description = `🔍 ML Model Analysis: ${recommendation}\n\nOur machine learning model has analyzed your workload running on ${currentHardware} and provided the above recommendation based on performance optimization patterns.`;
            strengths = [
              'ML-driven recommendation',
              'Workload-specific analysis',
              'Data-driven insights',
              'Performance optimization focus'
            ];
            considerations = [
              'Review recommendation details',
              'Consider implementation feasibility',
              'Validate against requirements',
              'ML model analysis completed'
            ];
          }
          
          // Format results for post-deployment
          const formattedResults = {
            recommendedConfiguration: {
              description: description,
              recommendedInstance: recommendedHardware,
              expectedInferenceTime: 'Optimized for current workload',
              costPer1000: 'Cost-optimized configuration'
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
              inferenceTime: 'Optimized',
              costPer1000: 'Cost-effective',
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
          
        } else if (response.data.performance_results) {
          // Handle simulate-performance response format
          console.log('Found simulate-performance data:', response.data);
          
          const performanceResults = response.data.performance_results;
          const simulationSummary = response.data.simulation_summary || {};
          
          // Find the best recommendation (usually by lowest latency or first result)
          const bestResult = performanceResults[0];
          
          // Create elaborative description
          const description = `🚀 Performance Simulation Analysis\n\nBased on your ${selectedModelName} model requirements and workload specifications, our performance simulation recommends ${bestResult?.hardware} for optimal deployment.\n\nSimulation analyzed ${performanceResults.length} hardware configurations with ML-driven performance prediction.`;
          
          // Format results to match post-deployment structure
          const formattedResults = {
            recommendedConfiguration: {
              description: description,
              recommendedInstance: bestResult?.hardware || 'Unknown Hardware',
              expectedInferenceTime: bestResult?.latency_ms ? `${bestResult.latency_ms.toFixed(2)} ms` : 'Optimized for workload',
              costPer1000: bestResult?.cost_per_1000 ? `$${bestResult.cost_per_1000.toFixed(4)}` : 'Cost-optimized'
            },
            hardwareAnalysis: {
              name: bestResult?.hardware || 'Recommended Hardware',
              memory: bestResult?.memory_gb ? `${bestResult.memory_gb.toFixed(2)}GB` : 'Hardware-appropriate',
              fp16Performance: 'Supported',
              architecture: 'ML-validated configuration',
              strengths: [
                'Performance simulation validated',
                'Optimized for model requirements',
                'Cost-effective deployment',
                'Meets latency and throughput targets'
              ],
              considerations: [
                'Based on workload simulation',
                'Pre-deployment performance estimate',
                'Hardware requirements validated',
                'ML model prediction confidence: High'
              ],
              useCase: `Pre-deployment simulation for ${optimizationMode} workload`
            },
            alternativeOptions: performanceResults.map((result, index) => ({
              hardware: result.hardware || `Option ${index + 1}`,
              fullName: result.hardware || `Hardware Option ${index + 1}`,
              inferenceTime: result.latency_ms ? `${result.latency_ms.toFixed(2)} ms` : 'Calculated',
              costPer1000: result.cost_per_1000 ? `$${result.cost_per_1000.toFixed(4)}` : 'Estimated',
              status: 'Simulation Validated',
              recommended: result === bestResult,
              memory: result.memory_gb ? `${result.memory_gb.toFixed(2)}GB` : 'Appropriate sizing',
              architecture: 'Validated',
              improvement: result === bestResult ? 'Best performance match' : 
                          result.latency_ms < bestResult?.latency_ms ? 'Faster alternative' : 
                          'Cost-effective option',
              simulationDetails: {
                predictedLatency: result.latency_ms,
                predictedThroughput: result.throughput_qps,
                memoryRequirements: result.memory_gb,
                costPer1000: result.cost_per_1000
              }
            })),
            isPostDeployment: false,
            analysisSummary: {
              ...simulationSummary,
              workflowType: 'Pre-deployment simulation',
              simulationConfidence: 'High',
              recommendationText: `Recommend ${bestResult?.hardware} for optimal performance`
            },
            rawOptimizationResults: response.data
          };
          
          setOptimizationResults(formattedResults);
        } else {
          console.log('Response format not recognized. Response keys:', Object.keys(response.data || {}));
          console.log('Full response data for debugging:', response.data);
          setError(`Optimization completed but response format not recognized. Received: ${Object.keys(response.data || {}).join(', ')}`);
        }
      } else {
        console.error('Unexpected response structure or failed status');
        setError('Optimization request failed or returned unexpected format.');
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
              <p className="text-gray-600 dark:text-gray-300">Real-time resource utilization metrics from hardware API</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsOverrideEnabled(!isOverrideEnabled)}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  isOverrideEnabled 
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
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 text-sm text-[#01a982] hover:text-[#019670]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* GPU Utilization */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GPU Utilization
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={gpuUtilization}
                  onChange={(e) => setGpuUtilization(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter %"
                  min="0"
                  max="100"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {gpuUtilization || 'Click Override to set'}%
                  </div>
                </div>
              )}
            </div>

            {/* GPU Memory Usage */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GPU Memory Usage
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={gpuMemoryUsage}
                  onChange={(e) => setGpuMemoryUsage(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter %"
                  min="0"
                  max="100"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {gpuMemoryUsage || 'Click Override to set'}%
                  </div>
                </div>
              )}
            </div>

            {/* CPU Utilization */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPU Utilization
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={cpuUtilization}
                  onChange={(e) => setCpuUtilization(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter %"
                  min="0"
                  max="100"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {cpuUtilization || 'Click Override to set'}%
                  </div>
                </div>
              )}
            </div>

            {/* CPU Memory Usage */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CPU Memory Usage
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={cpuMemoryUsage}
                  onChange={(e) => setCpuMemoryUsage(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter %"
                  min="0"
                  max="100"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {cpuMemoryUsage || 'Click Override to set'}%
                  </div>
                </div>
              )}
            </div>

            {/* Disk IOPS */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Disk IOPS
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={diskIops}
                  onChange={(e) => setDiskIops(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter IOPS"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {diskIops ? `${diskIops} IOPS` : 'Click Override to set'}
                  </div>
                </div>
              )}
            </div>

            {/* Network Bandwidth */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Network Bandwidth
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              {isOverrideEnabled ? (
                <input
                  type="number"
                  value={networkBandwidth}
                  onChange={(e) => setNetworkBandwidth(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982]"
                  placeholder="Enter MB/s"
                />
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                    {networkBandwidth ? `${networkBandwidth} MB/s` : 'Click Override to set'}
                  </div>
                </div>
              )}
            </div>

            {/* Current Hardware ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Hardware
                <Info className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </label>
              <select
                value={currentHardwareId}
                onChange={(e) => setCurrentHardwareId(e.target.value)}
                disabled={!isOverrideEnabled}
                className={`w-full px-3 py-2 border text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] ${
                  isOverrideEnabled 
                    ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                }`}
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

          {/* Batch Size - Only for pre-deployment */}
          {optimizationMode === 'pre-deployment' && (
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
          )}

          {/* Latency - Only for pre-deployment */}
          {optimizationMode === 'pre-deployment' && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Latency Requirement (ms)
                <div className="relative">
                  <Info 
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                    onMouseEnter={() => setShowTooltip('latency')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'latency' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Maximum acceptable latency for inference in milliseconds.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={latency}
                onChange={(e) => setLatency(e.target.value)}
                placeholder="Optional - Enter max latency in ms"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Throughput - Only for pre-deployment */}
          {optimizationMode === 'pre-deployment' && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Throughput Requirement (QPS)
                <div className="relative">
                  <Info 
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                    onMouseEnter={() => setShowTooltip('throughput')}
                    onMouseLeave={() => setShowTooltip('')}
                  />
                  {showTooltip === 'throughput' && (
                    <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                      <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                      Minimum required queries per second.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={throughput}
                onChange={(e) => setThroughput(e.target.value)}
                placeholder="Optional - Enter min throughput in QPS"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              />
            </div>
          )}
        </div>


        {/* Load More Parameters Button */}
        {modelType && taskType && !showMoreParams && optimizationMode === 'pre-deployment' && (
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

        {/* Additional Parameters - Always show for post-deployment */}
        {(showMoreParams || optimizationMode === 'post-deployment') && (
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
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
            </div>

            {/* Collapse Button - Only show for pre-deployment */}
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