import React, { useState, useEffect } from 'react';
import { ClipboardList, Check, AlertCircle, Save, X } from 'lucide-react';
import { useModelConfig } from '../contexts/ModelConfigContext';
import { useDropdownData } from '../hooks/useDropdownData';

const UserGoalsTab = () => {
  const {
    config,
    metadata,
    updateField,
    autoFillFromBackend,
    isAutoFilled,
    isOverridden,
    calculateCompletion,
    saveToBackend,
    clearConfig,
    isSaving,
    lastSaveError
  } = useModelConfig();

  const { modelNames, taskTypes, isLoading: isLoadingDropdowns } = useDropdownData();

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState(null);

  // Trigger auto-fill when both Model Name and Task Type are selected
  useEffect(() => {
    const fetchModelData = async () => {
      if (!config.modelName || !config.taskType) {
        return;
      }

      setIsAutoFilling(true);
      setAutoFillError(null);

      const result = await autoFillFromBackend(config.modelName, config.taskType);

      if (!result.success) {
        setAutoFillError(result.error || 'Failed to auto-fill model data');
      }

      setIsAutoFilling(false);
    };

    fetchModelData();
  }, [config.modelName, config.taskType]);

  // Helper to render field badge
  const renderFieldBadge = (fieldName) => {
    if (isOverridden(fieldName)) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          <AlertCircle size={12} className="mr-1" />
          Modified
        </span>
      );
    }
    if (isAutoFilled(fieldName)) {
      return (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Check size={12} className="mr-1" />
          Auto-filled
        </span>
      );
    }
    return null;
  };

  // Completion percentage
  const completionPercentage = calculateCompletion();

  // Handle save
  const handleSave = async () => {
    await saveToBackend();
  };

  // Handle clear
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all configuration data? This cannot be undone.')) {
      clearConfig();
    }
  };

  return (
    <div className="w-full mx-auto px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList size={32} className="text-[#01a982]" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                User Goals
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Configure your AI model requirements and objectives
              </p>
            </div>
          </div>

          {/* Completion Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-300">Completion</div>
              <div className="text-xl font-bold text-[#01a982]">{completionPercentage}%</div>
              {metadata.lastSaved && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last saved: {new Date(metadata.lastSaved).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-fill Status */}
      {isAutoFilling && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Auto-filling model data from backend...
          </p>
        </div>
      )}

      {autoFillError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            {autoFillError}
          </p>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">

          {/* Common Questions Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Common Questions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Model Name - REQUIRED, Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the name of the AI model you plan to use? <span className="text-red-500">*</span>
                </label>
                <select
                  value={config.modelName}
                  onChange={(e) => updateField('modelName', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  disabled={isLoadingDropdowns}
                >
                  <option value="">Select model name</option>
                  {modelNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Task Type - REQUIRED, Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the primary task for this model? <span className="text-red-500">*</span>
                </label>
                <select
                  value={config.taskType}
                  onChange={(e) => updateField('taskType', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  disabled={isLoadingDropdowns}
                >
                  <option value="">Select task type</option>
                  {taskTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Framework - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Which framework is the model built in?
                  {renderFieldBadge('framework')}
                </label>
                <input
                  type="text"
                  value={config.framework}
                  onChange={(e) => updateField('framework', e.target.value)}
                  placeholder="e.g., PyTorch, TensorFlow, JAX"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Architecture Type - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the underlying architecture of the model?
                  {renderFieldBadge('architectureType')}
                </label>
                <input
                  type="text"
                  value={config.architectureType}
                  onChange={(e) => updateField('architectureType', e.target.value)}
                  placeholder="e.g., PhiForCausalLM"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Model Type - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What type of model is it?
                  {renderFieldBadge('modelType')}
                </label>
                <input
                  type="text"
                  value={config.modelType}
                  onChange={(e) => updateField('modelType', e.target.value)}
                  placeholder="e.g., phi, llama"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Parameters - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the size of the model in terms of total parameters (in millions)?
                  {renderFieldBadge('parameters')}
                </label>
                <input
                  type="text"
                  value={config.parameters}
                  onChange={(e) => updateField('parameters', e.target.value)}
                  placeholder="e.g., 7000"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Model Size - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the file size of the model on disk (in MB)?
                  {renderFieldBadge('modelSize')}
                </label>
                <input
                  type="text"
                  value={config.modelSize}
                  onChange={(e) => updateField('modelSize', e.target.value)}
                  placeholder="e.g., 14000"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Precision - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What numerical precision is required for inference?
                  {renderFieldBadge('precision')}
                </label>
                <input
                  type="text"
                  value={config.precision}
                  onChange={(e) => updateField('precision', e.target.value)}
                  placeholder="e.g., FP32, FP16, INT8"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Vocabulary Size - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What is the vocabulary size of the model?
                  {renderFieldBadge('vocabularySize')}
                </label>
                <input
                  type="text"
                  value={config.vocabularySize}
                  onChange={(e) => updateField('vocabularySize', e.target.value)}
                  placeholder="e.g., 32000"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Activation Function - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Which activation function is predominantly used in the model?
                  {renderFieldBadge('activationFunction')}
                </label>
                <input
                  type="text"
                  value={config.activationFunction}
                  onChange={(e) => updateField('activationFunction', e.target.value)}
                  placeholder="e.g., ReLU, GeLU"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* GFLOPs - AUTO-FILLED (Inference only), Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What are the computational requirements of the model in GFLOPs (billions)?
                  {renderFieldBadge('gflops')}
                </label>
                <input
                  type="text"
                  value={config.gflops}
                  onChange={(e) => updateField('gflops', e.target.value)}
                  placeholder="e.g., 500"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Hidden Layers - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  How many hidden layers does the model contain?
                  {renderFieldBadge('hiddenLayers')}
                </label>
                <input
                  type="text"
                  value={config.hiddenLayers}
                  onChange={(e) => updateField('hiddenLayers', e.target.value)}
                  placeholder="e.g., 32"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Attention Layers - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  How many attention layers are in the model?
                  {renderFieldBadge('attentionLayers')}
                </label>
                <input
                  type="text"
                  value={config.attentionLayers}
                  onChange={(e) => updateField('attentionLayers', e.target.value)}
                  placeholder="e.g., 32"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Embedding Dimension - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Embedding Vector Dimension (Hidden Size)
                  {renderFieldBadge('embeddingDimension')}
                </label>
                <input
                  type="text"
                  value={config.embeddingDimension}
                  onChange={(e) => updateField('embeddingDimension', e.target.value)}
                  placeholder="e.g., 768"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* FFN Dimension - AUTO-FILLED, Editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  FFN (MLP) Dimension
                  {renderFieldBadge('ffnDimension')}
                </label>
                <input
                  type="text"
                  value={config.ffnDimension}
                  onChange={(e) => updateField('ffnDimension', e.target.value)}
                  placeholder="e.g., 3072"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

              {/* Business Objectives - USER INPUT, Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What are the primary business objectives of this new infrastructure?
                </label>
                <select
                  value={config.businessObjectives}
                  onChange={(e) => updateField('businessObjectives', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                >
                  <option value="">Select option</option>
                  <option value="AI">AI</option>
                  <option value="IoT">IoT</option>
                </select>
              </div>

              {/* HPC/GPU Needed - USER INPUT, Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Is high-performance computing (HPC) or GPU acceleration needed?
                </label>
                <select
                  value={config.hpcGpuNeeded}
                  onChange={(e) => updateField('hpcGpuNeeded', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                >
                  <option value="">Select option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Number of GPUs - USER INPUT */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of GPUs that the model will run on?
                </label>
                <input
                  type="text"
                  value={config.numberOfGpus}
                  onChange={(e) => updateField('numberOfGpus', e.target.value)}
                  placeholder="e.g., 4"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                />
              </div>

            </div>
          </div>

          {/* Conditional Sections: Inference-Specific */}
          {config.taskType === 'Inference' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Inference-Specific Questions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Input Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the typical number of input size?
                  </label>
                  <input
                    type="text"
                    value={config.inferenceInputSize}
                    onChange={(e) => updateField('inferenceInputSize', e.target.value)}
                    placeholder="e.g., 512 tokens"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Output Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the expected number of output size to be generated per request?
                  </label>
                  <input
                    type="text"
                    value={config.inferenceOutputSize}
                    onChange={(e) => updateField('inferenceOutputSize', e.target.value)}
                    placeholder="e.g., 256 tokens"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Deployment Scenario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the primary deployment scenario?
                  </label>
                  <select
                    value={config.deploymentScenario}
                    onChange={(e) => updateField('deploymentScenario', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  >
                    <option value="">Select scenario</option>
                    <option value="Single">Single</option>
                    <option value="Batch">Batch</option>
                  </select>
                </div>

                {/* Batch Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What batch size do you plan to use for inference?
                  </label>
                  <input
                    type="text"
                    value={config.inferenceBatchSize}
                    onChange={(e) => updateField('inferenceBatchSize', e.target.value)}
                    placeholder="e.g., 32"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Target Throughput */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is your target throughput (e.g., tokens per second, inferences per second)?
                  </label>
                  <input
                    type="text"
                    value={config.targetThroughput}
                    onChange={(e) => updateField('targetThroughput', e.target.value)}
                    placeholder="e.g., 1000 tokens/sec"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Target Latency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the maximum acceptable latency for a single inference request (in milliseconds)?
                  </label>
                  <input
                    type="text"
                    value={config.targetLatency}
                    onChange={(e) => updateField('targetLatency', e.target.value)}
                    placeholder="e.g., 100 ms"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Concurrent Users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How many concurrent users will be accessing the model simultaneously?
                  </label>
                  <input
                    type="text"
                    value={config.concurrentUsers}
                    onChange={(e) => updateField('concurrentUsers', e.target.value)}
                    placeholder="e.g., 100"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Requests per Second */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How many requests per second do you expect to handle at peak load?
                  </label>
                  <input
                    type="text"
                    value={config.requestsPerSecond}
                    onChange={(e) => updateField('requestsPerSecond', e.target.value)}
                    placeholder="e.g., 500"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Inference Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is your budget or target cost for inference (e.g., per 1000 inference)?
                  </label>
                  <input
                    type="text"
                    value={config.inferenceBudget}
                    onChange={(e) => updateField('inferenceBudget', e.target.value)}
                    placeholder="e.g., $10 per 1000"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Time to First Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How quickly should the response begin? (Target Time-to-First-Token in ms)
                  </label>
                  <input
                    type="text"
                    value={config.timeToFirstToken}
                    onChange={(e) => updateField('timeToFirstToken', e.target.value)}
                    placeholder="e.g., 50 ms"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Conditional Sections: Training-Specific */}
          {config.taskType === 'Training' && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                Training-Specific Questions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Is Full Training */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Are you performing full training from scratch or single pass training?
                  </label>
                  <select
                    value={config.isFullTraining}
                    onChange={(e) => updateField('isFullTraining', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  >
                    <option value="">Select option</option>
                    <option value="Full Training">Full Training</option>
                    <option value="Single Pass">Single Pass</option>
                  </select>
                </div>

                {/* Fine-tuning Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    If fine-tuning, which method will be used?
                  </label>
                  <select
                    value={config.fineTuningMethod}
                    onChange={(e) => updateField('fineTuningMethod', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  >
                    <option value="">Select method</option>
                    <option value="LoRA">LoRA</option>
                    <option value="QLoRA">QLoRA</option>
                    <option value="Full Fine-Tuning">Full Fine-Tuning</option>
                  </select>
                </div>

                {/* Training Dataset Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the size of your training dataset (e.g., number of samples)?
                  </label>
                  <input
                    type="text"
                    value={config.trainingDatasetSize}
                    onChange={(e) => updateField('trainingDatasetSize', e.target.value)}
                    placeholder="e.g., 1000000 samples"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Training Input Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the input size or sequence length for the training data?
                  </label>
                  <input
                    type="text"
                    value={config.trainingInputSize}
                    onChange={(e) => updateField('trainingInputSize', e.target.value)}
                    placeholder="e.g., 512 tokens"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Training Output Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the expected output size or sequence length?
                  </label>
                  <input
                    type="text"
                    value={config.trainingOutputSize}
                    onChange={(e) => updateField('trainingOutputSize', e.target.value)}
                    placeholder="e.g., 512 tokens"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Training Batch Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What batch size will be used for training?
                  </label>
                  <input
                    type="text"
                    value={config.trainingBatchSize}
                    onChange={(e) => updateField('trainingBatchSize', e.target.value)}
                    placeholder="e.g., 32"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Optimizer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Which optimizer will you be using?
                  </label>
                  <select
                    value={config.optimizer}
                    onChange={(e) => updateField('optimizer', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  >
                    <option value="">Select optimizer</option>
                    <option value="AdamW">AdamW</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>

                {/* Learning Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the learning rate for the training process?
                  </label>
                  <input
                    type="text"
                    value={config.learningRate}
                    onChange={(e) => updateField('learningRate', e.target.value)}
                    placeholder="e.g., 0.001"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Epochs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How many epochs do you plan to train for?
                  </label>
                  <input
                    type="text"
                    value={config.epochs}
                    onChange={(e) => updateField('epochs', e.target.value)}
                    placeholder="e.g., 10"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Target Training Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is the target time to complete the entire training job?
                  </label>
                  <input
                    type="text"
                    value={config.targetTrainingTime}
                    onChange={(e) => updateField('targetTrainingTime', e.target.value)}
                    placeholder="e.g., 24 hours"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Training Throughput */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is your target training throughput (e.g., samples per second, steps per second)?
                  </label>
                  <input
                    type="text"
                    value={config.trainingThroughput}
                    onChange={(e) => updateField('trainingThroughput', e.target.value)}
                    placeholder="e.g., 100 samples/sec"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Concurrent Training Jobs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How many concurrent training jobs do you plan to run?
                  </label>
                  <input
                    type="text"
                    value={config.concurrentTrainingJobs}
                    onChange={(e) => updateField('concurrentTrainingJobs', e.target.value)}
                    placeholder="e.g., 5"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

                {/* Training Budget */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    What is your budget or target cost for the entire training process?
                  </label>
                  <input
                    type="text"
                    value={config.trainingBudget}
                    onChange={(e) => updateField('trainingBudget', e.target.value)}
                    placeholder="e.g., $5000"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-transparent"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Clear All
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#018f73] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {lastSaveError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                Error saving: {lastSaveError}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default UserGoalsTab;
