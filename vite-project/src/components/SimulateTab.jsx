import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import apiClient from '../config/axios';
import SimulationResults from './SimulationResults';
import { useDropdownData } from '../hooks/useDropdownData';
import '../styles/AdminDashboardNew.css';

const SimulateTab = () => {
  // Primary fields - Model Name and Task Type (user fills these first)
  const [modelName, setModelName] = useState('');
  const [taskType, setTaskType] = useState('');
  const [scenario, setScenario] = useState('Single Stream'); // New required field
  
  // Auto-filled fields from database (can be overridden by user)
  const [framework, setFramework] = useState('');
  const [modelType, setModelType] = useState('');
  const [modelSize, setModelSize] = useState('');
  const [parameters, setParameters] = useState('');
  const [flops, setFlops] = useState('');
  const [architectureType, setArchitectureType] = useState('');
  const [precision, setPrecision] = useState('');
  const [vocabularySize, setVocabularySize] = useState('');
  const [activationFunction, setActivationFunction] = useState('');
  
  // User input fields (not from database)
  const [batchSize, setBatchSize] = useState('');
  const [showTooltip, setShowTooltip] = useState('');
  
  // Training-specific fields
  const [inputSize, setInputSize] = useState('');
  const [isFullTraining, setIsFullTraining] = useState('No');
  
  // Additional parameters state (hidden section)
  const [showMoreParams, setShowMoreParams] = useState(false);
  const [hiddenLayers, setHiddenLayers] = useState('');
  const [attentionLayers, setAttentionLayers] = useState('');
  const [embeddingDimension, setEmbeddingDimension] = useState('');
  const [ffnDimension, setFfnDimension] = useState('');
  
  // Use custom hook for dropdown data with caching
  const { 
    modelNames: availableModelNames, 
    taskTypes: availableTaskTypes, 
    isLoading: isLoadingDropdowns, 
    error: dropdownError 
  } = useDropdownData();
  
  // Loading and error states
  const [isLoadingModelData, setIsLoadingModelData] = useState(false);
  const [error, setError] = useState('');
  
  // Simulation results state
  const [simulationResults, setSimulationResults] = useState(null);
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);

  // Error handling for dropdown data
  useEffect(() => {
    if (dropdownError) {
      setError(dropdownError);
    }
  }, [dropdownError]);

  // Fetch and prefill parameters when both model name and task type are selected
  useEffect(() => {
    const fetchModelData = async () => {
      if (!modelName || !taskType) {
        return;
      }

      setIsLoadingModelData(true);
      setError('');

      try {
        console.log(`Fetching model data for: ${modelName} - ${taskType}`);
        
        // Call the backend API to get model data using model name and task type
        const response = await apiClient.post('/model/get-model-data', {
          model_name: modelName,
          task_type: taskType
        });
        
        // Check if the response is successful
        if (response.data.status === 'success' && response.data.model_data) {
          const modelData = response.data.model_data;
          
          console.log('Model data received:', modelData);
          
          // Prefill the form with model data from backend (field names match DB columns)
          setFramework(modelData.framework || '');
          setModelType(modelData.model_type || '');
          setModelSize(modelData.model_size_mb?.toString() || '');
          setParameters(modelData.total_parameters_millions?.toString() || '');
          
          // For Training task type, keep GFLOPs empty (user must input)
          // For Inference task type, prefill GFLOPs from database
          if (taskType === 'Training') {
            setFlops('');
          } else {
            setFlops(modelData.gflops_billions?.toString() || '');
          }
          
          setArchitectureType(modelData.architecture_type || '');
          setPrecision(modelData.precision || '');
          setVocabularySize(modelData.vocabulary_size?.toString() || '');
          setActivationFunction(modelData.activation_function || '');
          
          // Map fields correctly based on CSV columns
          setHiddenLayers(modelData.number_of_hidden_layers?.toString() || '');
          setAttentionLayers(modelData.number_of_attention_layers?.toString() || '');
          setEmbeddingDimension(modelData.embedding_vector_dimension?.toString() || '');
          setFfnDimension(modelData.ffn_dimension?.toString() || '');
          
          // Keep user input fields empty (batch size)
          console.log('Model data prefilled successfully');
        } else {
          setError('Model data not found for the selected type and task.');
        }
        
      } catch (err) {
        console.error('Error fetching model data:', err);
        if (err.response?.status === 404) {
          setError(`No model found for "${modelName}" with task type "${taskType}".`);
        } else {
          setError('Failed to load model data from backend. Please try again.');
        }
      } finally {
        setIsLoadingModelData(false);
      }
    };

    fetchModelData();
  }, [modelName, taskType]);

  // Handle Run Simulation
  const handleRunSimulation = async () => {
    // Validate required fields
    if (!modelName || !taskType) {
      setError('Please select both Model Name and Task Type');
      return;
    }

    if (!scenario) {
      setError('Please select a Scenario');
      return;
    }

    if (!modelSize || !parameters || !flops) {
      setError('Please ensure Model Size, Parameters, and GFLOPs are filled in.');
      return;
    }

    // Additional validation for Training task type
    if (taskType === 'Training') {
      if (!batchSize || !inputSize) {
        setError('For Training task type, please fill in Batch Size and Input Size.');
        return;
      }
      if (!isFullTraining) {
        setError('For Training task type, please select Is Full Training option.');
        return;
      }
    }

    setIsRunningSimulation(true);
    setError('');
    setSimulationResults(null);

    try {
      // Prepare simulation parameters according to backend API format
      const simulationParams = {
        Model: modelName,
        Framework: framework,
        Task_Type: taskType,
        Scenario: scenario, // New field
        Total_Parameters_Millions: parseFloat(parameters),
        Model_Size_MB: parseFloat(modelSize),
        Architecture_type: architectureType,
        Model_Type: modelType,
        Embedding_Vector_Dimension: parseInt(embeddingDimension),
        Precision: precision,
        Vocabulary_Size: parseInt(vocabularySize),
        FFN_Dimension: parseInt(ffnDimension),
        Activation_Function: activationFunction,
        Number_of_hidden_Layers: parseInt(hiddenLayers),
        Number_of_Attention_Layers: parseInt(attentionLayers),
        GFLOPs_Billions: parseFloat(flops)
      };
      
      // Add Training-specific fields if task type is Training
      if (taskType === 'Training') {
        simulationParams.Batch_Size = parseInt(batchSize);
        simulationParams.Input_Size = parseInt(inputSize);
        simulationParams.Full_Training = isFullTraining === 'Yes' ? 1 : 0; // Map Yes/No to 1/0
      }
      
      console.log('Simulation request payload:', simulationParams);

      // Make API call to run simulation
      const response = await apiClient.post('/model/simulate-performance', simulationParams);
      
      // Process and format simulation results
      if (response.data.status === 'success' && response.data.performance_results) {
        console.log('Raw API Response:', response.data.performance_results);
        
        // Format results to match the expected structure
        const formattedResults = {
          hardwareComparison: response.data.performance_results.map(result => {
            console.log(`Processing hardware result:`, result);
            console.log(`GPU: "${result.GPU}", Hardware Name: "${result['Hardware Name']}"`);
            console.log(`Latency: "${result['Latency (ms)']}", Total Cost: "${result['Total Cost']}"`);
            console.log(`Confidence Score: "${result['Confidence Score']}", Status: "${result.Status}"`);
            
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

  return (
    <div className="main">
      <div className="txt5">GreenMatrix Panel</div>
      <div className="para">


        {/* Outer Container */}
        <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
          <div className="paraetext-lg font-semibold text-gray-900 dark:text-white text7">Simulate Performance</div>

          {/* Inner Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-6xl mx-auto mt-4 bgr">
            {/* Header Section */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text6">
                Simulate Parameters
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Enter your AI workload details to simulate performance across different hardware options.
              </p>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        
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
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
              disabled={isLoadingModelData}
            >
              <option value="">Select framework</option>
              <option value="PyTorch">PyTorch</option>
              <option value="TensorFlow">TensorFlow</option>
              <option value="JAX">JAX</option>
              <option value="ONNX">ONNX</option>
              <option value="TensorRT">TensorRT</option>
              <option value="Hugging Face">Hugging Face</option>
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
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingModelData || isLoadingDropdowns}
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
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  Single Stream for individual requests, Server for batch processing.
                </div>
              )}
            </div>
          </label>
          <div className="relative">
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all"
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingModelData}
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingModelData}
          />
        </div>

        {/* FLOPs */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingModelData}
          />
        </div>

        {/* Training-specific fields */}
        {taskType === 'Training' && (
          <>
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
                      Number of samples processed in parallel during training.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder="Enter batch size for training"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>

            {/* Input Size */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      Dimension/size of input data for training.
                    </div>
                  )}
                </div>
              </label>
              <input
                type="number"
                value={inputSize}
                onChange={(e) => setInputSize(e.target.value)}
                placeholder="Enter input size for training"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>
          </>
        )}
      </div>

      {/* Load More Parameters Button */}
      {modelType && taskType && !showMoreParams && (
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                placeholder="Enter embedding dimension"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                placeholder="Enter FFN dimension"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingModelData}
              />
            </div>
          </div>

          {/* Is Full Training field - only for Training task type */}
          {taskType === 'Training' && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Is Full Training
                </label>
                <select
                  value={isFullTraining}
                  onChange={(e) => setIsFullTraining(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoadingModelData}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          )}

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
          disabled={isLoadingModelData || isLoadingDropdowns || isRunningSimulation || !modelName || !taskType}
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
        </div>

            {/* Simulation Results */}
            {simulationResults && (
              <SimulationResults results={simulationResults} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulateTab;