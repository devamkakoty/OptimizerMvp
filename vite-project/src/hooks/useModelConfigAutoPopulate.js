import { useEffect, useRef, useMemo } from 'react';
import { useModelConfig } from '../contexts/ModelConfigContext';

/**
 * Custom hook to auto-populate form fields from User Goals configuration
 *
 * This hook reads the saved User Goals configuration and automatically
 * fills the provided setter functions with the saved values.
 *
 * Usage in a component:
 * ```
 * const setters = {
 *   setModelName,
 *   setTaskType,
 *   setFramework,
 *   // ... other setters
 * };
 *
 * const userGoalsConfig = useModelConfigAutoPopulate(setters);
 * ```
 *
 * @param {Object} setters - Object containing setter functions for each field
 * @returns {Object} The current user goals configuration
 */
export const useModelConfigAutoPopulate = (setters = {}) => {
  const { config, isLoading } = useModelConfig();
  const hasPopulated = useRef(false); // Track if we've already populated fields
  const lastConfigHash = useRef(''); // Track config hash to detect meaningful changes

  // Create a hash of the config to detect meaningful changes (memoized)
  const configHash = useMemo(() => {
    return JSON.stringify({
      modelName: config.modelName,
      taskType: config.taskType
    });
  }, [config.modelName, config.taskType]);

  useEffect(() => {
    // Wait for context to finish loading from localStorage
    if (isLoading) {
      console.log('[useModelConfigAutoPopulate] Context is still loading. Waiting...');
      return;
    }

    // Only auto-populate if User Goals has been configured (at minimum, model name and task type)
    if (!config.modelName || !config.taskType) {
      console.log('[useModelConfigAutoPopulate] No User Goals configuration found. Skipping auto-populate.');
      hasPopulated.current = false; // Reset so it can populate when config becomes available
      lastConfigHash.current = '';
      return;
    }

    // Skip if we've already populated fields for THIS config
    if (hasPopulated.current && lastConfigHash.current === configHash) {
      console.log('[useModelConfigAutoPopulate] Already populated for this config. Skipping.');
      return;
    }

    console.log('[useModelConfigAutoPopulate] Auto-populating fields from User Goals:', {
      modelName: config.modelName,
      taskType: config.taskType,
      totalFields: Object.keys(config).filter(key => config[key] !== '').length,
      isFirstPopulation: !hasPopulated.current,
      configChanged: lastConfigHash.current !== configHash
    });

    // Map User Goals config fields to setter functions
    const fieldMappings = {
      // Common fields
      modelName: setters.setModelName,
      taskType: setters.setTaskType,
      framework: setters.setFramework,
      parameters: setters.setParameters,
      modelSize: setters.setModelSize,
      architectureType: setters.setArchitectureType,
      modelType: setters.setModelType,
      precision: setters.setPrecision,
      vocabularySize: setters.setVocabularySize,
      activationFunction: setters.setActivationFunction,
      gflops: setters.setFlops, // Note: different naming in OptimizeTab
      hiddenLayers: setters.setHiddenLayers,
      attentionLayers: setters.setAttentionLayers,
      embeddingDimension: setters.setEmbeddingDimension,
      ffnDimension: setters.setFfnDimension,
      numberOfGpus: setters.setNumberOfGpus,

      // Inference-specific fields
      inferenceInputSize: setters.setInputSize,
      inferenceOutputSize: setters.setOutputSize,
      deploymentScenario: setters.setScenario,
      inferenceBatchSize: setters.setBatchSize,
      targetThroughput: setters.setTargetThroughput,
      targetLatency: setters.setTargetLatency,
      concurrentUsers: setters.setConcurrentUsers,
      requestsPerSecond: setters.setRequestsPerSecond,
      inferenceBudget: setters.setInferenceBudget,
      timeToFirstToken: setters.setTimeToFirstToken,

      // Training-specific fields
      isFullTraining: setters.setIsFullTraining,
      fineTuningMethod: setters.setTrainingMethod, // Maps to trainingMethod state
      trainingDatasetSize: setters.setDatasetSize,
      trainingInputSize: setters.setInputSize, // For Training, uses same input size field
      trainingOutputSize: setters.setOutputSize, // For Training, uses same output size field
      trainingBatchSize: setters.setBatchSize, // For Training, uses same batch size field
      optimizer: setters.setOptimizer,
      learningRate: setters.setLearningRate,
      epochs: setters.setNumOfEpochs, // Maps to numOfEpochs state
      targetTrainingTime: setters.setTargetTrainingTime,
      trainingThroughput: setters.setTrainingThroughput,
      concurrentTrainingJobs: setters.setConcurrentTrainingJobs,
      trainingBudget: setters.setTrainingBudget,
    };

    // Auto-populate fields that have corresponding setters
    let populatedCount = 0;
    Object.entries(fieldMappings).forEach(([configKey, setterFn]) => {
      if (setterFn && config[configKey] && config[configKey] !== '') {
        setterFn(config[configKey]);
        populatedCount++;
      }
    });

    console.log(`[useModelConfigAutoPopulate] Auto-populated ${populatedCount} fields from User Goals`);

    // Mark as populated for this config
    hasPopulated.current = true;
    lastConfigHash.current = configHash;

  }, [configHash, config, isLoading]); // Depend on configHash, config, and isLoading

  // Return the config so components can access it if needed
  return config;
};

/**
 * Helper function to check if User Goals has been configured
 *
 * @returns {boolean} True if User Goals has minimum required fields
 */
export const useHasUserGoals = () => {
  const { config } = useModelConfig();
  return !!(config.modelName && config.taskType);
};

/**
 * Helper function to get field value from User Goals with fallback
 *
 * @param {string} fieldName - The field name in User Goals config
 * @param {any} fallback - Fallback value if field is empty
 * @returns {any} The field value or fallback
 */
export const useUserGoalsField = (fieldName, fallback = '') => {
  const { config } = useModelConfig();
  return config[fieldName] || fallback;
};
