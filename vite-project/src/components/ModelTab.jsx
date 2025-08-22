import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import apiClient from '../config/axios';
import ModelOptimizerResults from './ModelOptimizerResults';

const ModelTab = () => {
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
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dropdown options state
  const [modelTypes, setModelTypes] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  
  // Optimization results state
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isRunningOptimization, setIsRunningOptimization] = useState(false);

  // Initialize dropdown options with fallback values
  useEffect(() => {
    console.log('Initializing Model Optimizer dropdown options with fallback values...');
    
    // Use fallback values directly since backend endpoints don't exist
    setModelTypes(['llama', 'qwen2', 'phi3', 'mistral', 'gemma', 'phi', 'gpt2', 'bert', 'roberta', 'albert', 'distilbert', 'resnet18', 'resnet34', 'resnet50', 'vgg16', 'vgg19', 'inception_v3', 'efficientnet_b0', 'vit', 'deit', 'swin']);
    setTaskTypes(['Inference', 'Training']);
  }, []);

  // Fetch and prefill parameters when both model type and task type are selected
  useEffect(() => {
    const fetchData = async () => {
      if (!modelType || !taskType) {
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await apiClient.post('/model/get-model-data', {
          model_type: modelType,
          task_type: taskType
        });
        
        // Check if the response is successful
        if (response.data.status === 'success' && response.data.model_data) {
          const modelData = response.data.model_data;
          
          console.log('Model data received:', modelData);
          
          // Store the actual model name for API calls
          setSelectedModelName(modelData.model_name);
          
          // Prefill the form with model data from backend
          setFramework(modelData.framework || '');
          setModelSize(modelData.model_size_mb?.toString() || '');
          setParameters(modelData.total_parameters_millions?.toString() || '');
          setFlops(modelData.flops?.toString() || ''); // Use actual FLOPs from database
          setBatchSize('1'); // Default batch size
          setLatency(''); // Keep empty for user to set requirements
          setThroughput(''); // Keep empty for user to set requirements
          
          // Advanced parameters - use actual database values
          setArchitectureType(modelData.architecture_type || '');
          setHiddenLayers(modelData.embedding_vector_dimension?.toString() || ''); // This is correct for hidden layers
          setVocabularySize(modelData.vocabulary_size?.toString() || '');
          setAttentionLayers(modelData.ffn_dimension?.toString() || ''); // FFN dimension for attention layers
          setActivationFunction(modelData.activation_function || '');
          setPrecision(modelData.precision || 'FP32');
        }
      } catch (err) {
        console.error('Error fetching model data:', err);
        setError('Failed to load model data from backend');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [modelType, taskType]);

  // Handle Optimize Model
  const handleOptimizeModel = async () => {
    if (!modelType || !taskType) {
      setError('Please select both model type and task type');
      return;
    }

    if (!selectedModelName) {
      setError('Model data not loaded. Please select model type and task type first.');
      return;
    }

    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    try {
      // Prepare optimization parameters in the correct format for the API
      const optimizationParams = {
        Model_Name: selectedModelName,
        Framework: framework,
        Total_Parameters_Millions: parseFloat(parameters) || 0,
        Model_Size_MB: parseFloat(modelSize) || 0,
        Architecture_type: architectureType,
        Model_Type: modelType,
        Number_of_hidden_Layers: parseInt(hiddenLayers) || 0,
        Precision: precision || 'FP32',
        Vocabulary_Size: parseInt(vocabularySize) || 0,
        Number_of_Attention_Layers: parseInt(attentionLayers) || 0,
        Activation_Function: activationFunction
      };

      console.log('Sending optimization request:', optimizationParams);

      // Make API call to model optimization endpoint
      const response = await apiClient.post('/model/optimization-recommendation', optimizationParams);
      
      console.log('Optimization response:', response.data);
      
      // Set optimization results
      setOptimizationResults(response.data);
      
    } catch (err) {
      console.error('Error optimizing model:', err);
      setError('Failed to optimize model. Please try again.');
    } finally {
      setIsRunningOptimization(false);
    }
  };

  // Handle Demo Optimization (with mock data)
  const handleDemoOptimization = () => {
    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    // Simulate API delay
    setTimeout(() => {
      const mockResults = {
        recommendedMethods: {
          primary: "Quantization (INT8)",
          secondary: "Pruning (Structured)",
          description: "Based on your model characteristics and performance requirements, we recommend INT8 quantization as the primary optimization method, combined with structured pruning for optimal results."
        },
        recommendedPrecision: {
          precision: "Mixed Precision (FP16/INT8)",
          benefits: "50% memory reduction, 2.3x inference speedup",
          description: "Mixed precision provides the best balance between model accuracy and performance for your use case."
        },
        prosAndCons: {
          pros: [
            "Significant reduction in model size (up to 75% smaller)",
            "2-3x faster inference times on supported hardware",
            "Lower memory requirements enable deployment on edge devices",
            "Maintained accuracy within 1-2% of original model",
            "Energy efficient for mobile and IoT applications"
          ],
          cons: [
            "Potential slight accuracy degradation (typically <2%)",
            "Requires hardware support for optimal performance",
            "Initial optimization process can be time-consuming",
            "Some models may be more sensitive to quantization",
            "May require fine-tuning for optimal results"
          ],
          considerations: [
            "Test thoroughly with your specific dataset and use case",
            "Monitor model performance across different input distributions",
            "Consider gradual optimization approach for critical applications"
          ]
        }
      };
      
      setOptimizationResults(mockResults);
      setIsRunningOptimization(false);
    }, 2000); // 2 second delay to show loading
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Model Parameters</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Configure your model optimization parameters
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
              disabled={isLoading}
            >
              <option value="">Select model type</option>
              {modelTypes.map(type => (
                <option key={type} value={type}>{type}</option>
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
                  Choose the deep learning framework for your model.
                </div>
              )}
            </div>
          </label>
          <div className="relative">
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                  Different task types require different optimization strategies for best performance.
                </div>
              )}
            </div>
          </label>
          <div className="relative">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <option value="">Select task type</option>
              {taskTypes.map(type => (
                <option key={type} value={type}>{type}</option>
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                  Number of samples processed in parallel during model optimization.
                </div>
              )}
            </div>
          </label>
          <input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            placeholder="Enter batch size"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
          />
        </div>

        {/* Latency Requirement */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Latency (ms)
            <div className="relative">
              <Info 
                className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                onMouseEnter={() => setShowTooltip('latency')}
                onMouseLeave={() => setShowTooltip('')}
              />
              {showTooltip === 'latency' && (
                <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                  <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                  Target latency for optimized model inference in milliseconds.
                </div>
              )}
            </div>
          </label>
          <input
            type="number"
            value={latency}
            onChange={(e) => setLatency(e.target.value)}
            placeholder="Optional - Enter target latency in ms"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
          />
        </div>

        {/* Throughput Requirement */}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Throughput (QPS)
            <div className="relative">
              <Info 
                className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" 
                onMouseEnter={() => setShowTooltip('throughput')}
                onMouseLeave={() => setShowTooltip('')}
              />
              {showTooltip === 'throughput' && (
                <div className="absolute z-10 w-64 p-3 -top-2 left-6 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg">
                  <div className="absolute w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-gray-800 dark:border-r-gray-700 border-b-[6px] border-b-transparent -left-2 top-3"></div>
                  Target throughput for optimized model in queries per second.
                </div>
              )}
            </div>
          </label>
          <input
            type="number"
            value={throughput}
            onChange={(e) => setThroughput(e.target.value)}
            placeholder="Optional - Enter target throughput in QPS"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
          />
        </div>
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
                  <option value="BertForMaskedLM">BertForMaskedLM</option>
                  <option value="BertForSequenceClassification">BertForSequenceClassification</option>
                  <option value="RobertaForMaskedLM">RobertaForMaskedLM</option>
                  <option value="AlbertForMaskedLM">AlbertForMaskedLM</option>
                  <option value="DistilBertForMaskedLM">DistilBertForMaskedLM</option>
                  <option value="ResNet">ResNet</option>
                  <option value="VGG">VGG</option>
                  <option value="InceptionV3">InceptionV3</option>
                  <option value="EfficientNet">EfficientNet</option>
                  <option value="ViTForImageClassification">ViTForImageClassification</option>
                  <option value="DeiTForImageClassification">DeiTForImageClassification</option>
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
                      Numerical precision used for model weights and computations.
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
                  <option value="FP32">FP32 (Float32)</option>
                  <option value="FP16">FP16 (Half Precision)</option>
                  <option value="BF16">BF16 (BFloat16)</option>
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
          onClick={handleOptimizeModel}
          disabled={isLoading || isRunningOptimization || !modelType || !taskType}
          className="px-8 py-3 bg-gradient-to-r from-[#01a982] to-[#00d4aa] text-white font-medium rounded-lg hover:from-[#019670] hover:to-[#00c299] transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isRunningOptimization ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Optimizing Model...
            </div>
          ) : (
            'Optimize Model'
          )}
        </button>
        
        <button 
          onClick={handleDemoOptimization}
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

      {/* Optimization Results */}
      {optimizationResults && (
        <ModelOptimizerResults results={optimizationResults} />
      )}
    </div>
  );
};

export default ModelTab;