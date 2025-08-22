import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import apiClient from '../config/axios';
import SimulationResults from './SimulationResults';

const SimulateTab = () => {
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
  
  // Dropdown options from backend
  const [availableModelTypes, setAvailableModelTypes] = useState([]);
  const [availableTaskTypes, setAvailableTaskTypes] = useState([]);
  
  // Store the actual model name from the API
  const [selectedModelName, setSelectedModelName] = useState('');
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
  const [error, setError] = useState('');
  
  // Simulation results state
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);

  // Initialize dropdown options with fallback values
  useEffect(() => {
    const initializeDropdownOptions = () => {
      setIsLoadingDropdowns(true);
      
      console.log('Initializing dropdown options with fallback values...');
      
      // Use fallback values directly since backend endpoints don't exist
      setAvailableModelTypes(['llama', 'qwen2', 'phi3', 'mistral', 'gemma', 'phi', 'gpt2', 'bert', 'roberta', 'albert', 'distilbert', 'resnet18', 'resnet34', 'resnet50', 'vgg16', 'vgg19', 'inception_v3', 'efficientnet_b0', 'vit', 'deit', 'swin']);
      setAvailableTaskTypes(['Inference', 'Training']);
      
      setIsLoadingDropdowns(false);
    };

    initializeDropdownOptions();
  }, []);

  // Fetch and prefill parameters when both model type and task type are selected
  useEffect(() => {
    const fetchModelData = async () => {
      if (!modelType || !taskType) {
        return;
      }

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
          // Keep batch size, latency, and throughput empty for user input
          
          // Set framework from model data
          setFramework(modelData.framework?.toLowerCase());
          
          // Store the actual model name for simulation
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

    fetchModelData();
  }, [modelType, taskType]);

  // Handle Run Simulation
  const handleRunSimulation = async () => {
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

    setIsRunningSimulation(true);
    setError('');
    setSimulationResults(null);

    try {
      // Prepare simulation parameters according to backend API format
      const simulationParams = {
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
      
      console.log('Simulation request payload:', simulationParams);

      // Make API call to run simulation
      const response = await apiClient.post('/model/simulate-performance', simulationParams);
      
      // Process and format simulation results
      if (response.data.status === 'success' && response.data.performance_results) {
        console.log('Raw API Response:', response.data.performance_results);
        
        // Format results to match the expected structure
        const formattedResults = {
          hardwareComparison: response.data.performance_results.map(result => {
            console.log(`Processing hardware result:`, {
              hardware: result.hardware,
              latency_ms: result.latency_ms,
              throughput_qps: result.throughput_qps,
              cost_per_1000: result.cost_per_1000,
              memory_gb: result.memory_gb
            });
            
            return {
              name: result.hardware,
              fullName: result.full_name,
              latency: `${result.latency_ms?.toFixed(2) || 0} ms`,
              throughput: `${result.throughput_qps?.toFixed(2) || 0} QPS`,
              costPer1000: `$${result.cost_per_1000?.toFixed(4) || 0}`,
              memory: `${result.memory_gb?.toFixed(1) || 0} GB`,
              hardwareId: result.hardware_id,
              // Add additional details from your API
              modelConfidence: result.model_confidence || 0,
              inferenceUsed: result.inference_used || false
            };
          })
        };
        
        console.log('Formatted results:', formattedResults);
        
        setSimulationResults(formattedResults);
      } else {
        setError('Simulation completed but no results were returned.');
      }
      
    } catch (err) {
      console.error('Error running simulation:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 400) {
        const errorDetail = err.response.data?.detail || 'Invalid simulation parameters.';
        console.error('400 Error detail:', errorDetail);
        setError(`Simulation failed: ${errorDetail}`);
      } else if (err.response?.status === 404) {
        setError('Model not found in database. Please try a different model type.');
      } else {
        setError(`Failed to run simulation: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setIsRunningSimulation(false);
    }
  };

  // Handle Demo Simulation (with mock data)
  const handleDemoSimulation = () => {
    setIsRunningSimulation(true);
    setError('');
    setSimulationResults(null);

    // Simulate API delay
    setTimeout(() => {
      const mockResults = {
        hardwareComparison: [
          {
            name: "CPU_i7",
            fullName: "N/A",
            latency: "13186.07 ms",
            throughput: "0.08 QPS",
            costPer1000: "$0.3764",
            memory: "16.0 GB"
          },
          {
            name: "AMD_EPYC",
            fullName: "N/A",
            latency: "2776.52 ms",
            throughput: "0.36 QPS",
            costPer1000: "$0.2407",
            memory: "64.0 GB"
          },
          {
            name: "T4",
            fullName: "NVIDIA Tesla T4 GPU",
            latency: "589.30 ms",
            throughput: "1.70 QPS",
            costPer1000: "$0.0585",
            memory: "16.0 GB",
            additionalInfo: {
              arch: "Turing",
              memory: "16GB GDDR6",
              flops: "65 TFLOPS",
              power: "70W"
            }
          },
          {
            name: "A10",
            fullName: "NVIDIA A10 GPU",
            latency: "137.33 ms",
            throughput: "7.28 QPS",
            costPer1000: "$0.0288",
            memory: "24.0 GB",
            additionalInfo: {
              arch: "Ampere",
              memory: "24GB GDDR6",
              flops: "125 TFLOPS",
              power: "150W"
            }
          },
          {
            name: "A100",
            fullName: "NVIDIA A100 Tensor Core GPU",
            latency: "13.91 ms",
            throughput: "71.90 QPS",
            costPer1000: "$0.0079",
            memory: "40.0 GB",
            additionalInfo: {
              arch: "Ampere",
              memory: "40GB HBM2e",
              flops: "312 TFLOPS",
              power: "400W"
            }
          },
          {
            name: "H100",
            fullName: "NVIDIA H100 Tensor Core GPU",
            latency: "12.96 ms",
            throughput: "77.15 QPS",
            costPer1000: "$0.0108",
            memory: "80.0 GB",
            additionalInfo: {
              arch: "Hopper",
              memory: "80GB HBM3",
              flops: "989 TFLOPS",
              power: "700W"
            }
          },
          {
            name: "RTX_A5000",
            fullName: "NVIDIA RTX A5000",
            latency: "152.47 ms",
            throughput: "6.56 QPS",
            costPer1000: "$0.0510",
            memory: "24.0 GB",
            additionalInfo: {
              arch: "Ampere",
              memory: "24GB GDDR6",
              flops: "67 TFLOPS",
              power: "230W"
            }
          },
          {
            name: "RTX_3070",
            fullName: "NVIDIA GeForce RTX 3070",
            latency: "222.65 ms",
            throughput: "4.49 QPS",
            costPer1000: "$0.0311",
            memory: "8.0 GB",
            additionalInfo: {
              arch: "Ampere",
              memory: "8GB GDDR6",
              flops: "40 TFLOPS",
              power: "220W"
            }
          },
          {
            name: "Intel_Xeon_Gold",
            fullName: "N/A",
            latency: "6713.06 ms",
            throughput: "0.15 QPS",
            costPer1000: "$0.7618",
            memory: "128.0 GB"
          }
        ]
      };
      
      setSimulationResults(mockResults);
      setIsRunningSimulation(false);
    }, 2000); // 2 second delay to show loading
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Simulation Parameters</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Enter your AI workload details to simulate performance across different hardware options
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
              <p className="text-blue-600 dark:text-blue-400 text-sm">Loading default parameters...</p>
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
                  Select the type of AI model architecture you want to simulate.
                </div>
              )}
            </div>
          </label>
          <div className="relative">
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                <div className="absolute z-10 w-80 p-3 -top-20 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
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
        {/* <div>
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
        </div> */}

        {/* Latency Requirement */}
        {/* <div>
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
        </div> */}

        {/* Throughput Requirement */}
        {/* <div className="md:col-span-2">
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
        </div> */}
      </div>

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
          onClick={handleRunSimulation}
          disabled={isLoading || isRunningSimulation || !modelType || !taskType}
          className="px-8 py-3 bg-gradient-to-r from-[#01a982] to-[#00d4aa] text-white font-medium rounded-lg hover:from-[#019670] hover:to-[#00c299] transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isRunningSimulation ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Simulation...
            </div>
          ) : (
            'Run Simulation'
          )}
        </button>
        
        <button 
          onClick={handleDemoSimulation}
          disabled={isLoading || isRunningSimulation}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isRunningSimulation ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading Demo...
            </div>
          ) : (
            'Demo Results'
          )}
        </button>
      </div>

      {/* Simulation Results */}
      {simulationResults && (
        <SimulationResults results={simulationResults} />
      )}
    </div>
  );
};

export default SimulateTab;