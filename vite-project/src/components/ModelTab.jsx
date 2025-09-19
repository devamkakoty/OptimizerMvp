import React, { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import apiClient from '../config/axios';
import ModelOptimizerResults from './ModelOptimizerResults';
import { useDropdownData } from '../hooks/useDropdownData';
import '../styles/AdminDashboardNew.css';

const ModelTab = () => {
  // Primary fields - Model Name and Task Type (user fills these first)
  const [modelName, setModelName] = useState('');
  const [taskType, setTaskType] = useState('Inference'); // Default to Inference for optimization
  const [scenario, setScenario] = useState('Single Stream');

  // Auto-filled fields from database (user can override)
  const [framework, setFramework] = useState('');
  const [modelType, setModelType] = useState('');
  const [modelSize, setModelSize] = useState('');
  const [parameters, setParameters] = useState('');
  const [flops, setFlops] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [showTooltip, setShowTooltip] = useState('');

  // Training-specific fields
  const [inputSize, setInputSize] = useState('');
  const [isFullTraining, setIsFullTraining] = useState('No');

  // Additional parameters state
  const [showMoreParams, setShowMoreParams] = useState(false);
  const [architectureType, setArchitectureType] = useState('');
  const [hiddenLayers, setHiddenLayers] = useState('');
  const [vocabularySize, setVocabularySize] = useState('');
  const [attentionLayers, setAttentionLayers] = useState('');
  const [activationFunction, setActivationFunction] = useState('');
  const [precision, setPrecision] = useState('');
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

  // Optimization results state
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [isRunningOptimization, setIsRunningOptimization] = useState(false);

  // Error handling for dropdown data
  useEffect(() => {
    if (dropdownError) {
      setError(dropdownError);
    }
  }, [dropdownError]);

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

          // For Training task type, keep batch size empty (user must input)
          // For Inference task type, set default batch size
          if (taskType === 'Training') {
            setBatchSize('');
          } else {
            setBatchSize('1'); // Default batch size for Inference
          }

          // Auto-fill additional parameters if available - map fields correctly based on CSV columns
          setArchitectureType(modelData.architecture_type || '');
          setHiddenLayers(modelData.number_of_hidden_layers?.toString() || '');
          setAttentionLayers(modelData.number_of_attention_layers?.toString() || '');
          setEmbeddingDimension(modelData.embedding_vector_dimension?.toString() || '');
          setFfnDimension(modelData.ffn_dimension?.toString() || '');
          setVocabularySize(modelData.vocabulary_size?.toString() || '');
          setActivationFunction(modelData.activation_function || '');
          setPrecision(modelData.precision || 'FP32');

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

  // Handle Optimize Model
  const handleOptimizeModel = async () => {
    if (!modelName || !taskType) {
      setError('Please select both model name and task type');
      return;
    }

    setIsRunningOptimization(true);
    setError('');
    setOptimizationResults(null);

    try {
      // Prepare optimization parameters in the correct format for the API
      const optimizationParams = {
        Model_Name: modelName,
        Framework: framework,
        Task_Type: taskType || 'Inference', // Default to Inference if not specified
        Total_Parameters_Millions: parseFloat(parameters) || 0,
        Model_Size_MB: parseFloat(modelSize) || 0,
        Architecture_type: architectureType,
        Model_Type: modelType,
        'Embedding Vector Dimension (Hidden Size)': parseFloat(embeddingDimension) || 0,
        Number_of_hidden_Layers: parseInt(hiddenLayers) || 0,
        Precision: precision || 'FP32',
        Vocabulary_Size: parseInt(vocabularySize) || 0,
        'FFN (MLP) Dimension': parseFloat(ffnDimension) || 0,
        Number_of_Attention_Layers: parseInt(attentionLayers) || 0,
        Activation_Function: activationFunction,
        'GFLOPs (Billions)': parseFloat(flops) || 0
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


  return (
    <div className="main">
      <h1 className="text-4xl font-medium mb-6" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>
      <div className="para">

        {/* Outer Container */}
        <div className="w-full mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
          <div className="text-[24px] font-normal text-gray-900 dark:text-white">Model Optimizer</div>

          {/* Inner Container */}
          <div className="bg-white bgr py-4">
            {/* Header Section */}
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text6">
                Model Parameters
              </h1>
              <p className="text-md text-gray-500 dark:text-gray-300 py-2">
                Configure your model optimization parameters
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

            <div className="simulate-form-grid rounded-lg border border-gray-200 p-6">
              {/* Model Name */}
              <div>
                <label className="flex items-center gap-2 text-md font-medium text-gray-600 dark:text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                    disabled={isLoadingDropdowns}
                  >
                    <option value="">
                      {isLoadingDropdowns ? 'Loading model names...' : 'Select model name'}
                    </option>
                    {availableModelNames.map(name => (
                      <option key={name} value={name}>{name}</option>
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
                <label className="flex items-center gap-2 text-md font-medium text-gray-600 dark:text-gray-300 mb-2">
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
                        Different task types require different optimization strategies for best performance.
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value="Inference (Optimizer)"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg focus:outline-none cursor-not-allowed"
                    disabled
                    readOnly
                  />
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
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                />
              </div>

              {/* Batch Size - Only for Training task type */}
              {taskType === 'Training' && (
                <>
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

                  {/* Input Size */}
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Is Full Training */}
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
                            Specify whether this is a full training process or partial training.
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={isFullTraining}
                        onChange={(e) => setIsFullTraining(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Load More Parameters Button */}
            {modelName && taskType && !showMoreParams && (
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
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoadingModelData}
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
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
                        disabled={isLoadingModelData}
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01a982] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoadingModelData}
                    />
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
            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={handleOptimizeModel}
                disabled={isLoadingModelData || isLoadingDropdowns || isRunningOptimization || !modelName || !taskType}
                className="px-5 py-2.5 bg-gray-100 hover:bg-[#00694d] text-emerald-700 rounded-full border text-lg font-medium flex items-center gap-2 h-11 transition-colors"
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
            </div>

            {/* Optimization Results */}
            {optimizationResults && (
              <ModelOptimizerResults results={optimizationResults} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelTab;