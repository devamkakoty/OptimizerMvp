import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/axios';

const ModelConfigContext = createContext();

export const useModelConfig = () => {
  const context = useContext(ModelConfigContext);
  if (!context) {
    throw new Error('useModelConfig must be used within ModelConfigProvider');
  }
  return context;
};

export const ModelConfigProvider = ({ children }) => {
  // Initial state structure for all fields
  const [config, setConfig] = useState({
    // Common Questions (16 fields)
    modelName: '',
    framework: '',
    taskType: '',
    parameters: '',
    modelSize: '',
    architectureType: '',
    modelType: '',
    precision: '',
    vocabularySize: '',
    activationFunction: '',
    gflops: '',
    hiddenLayers: '',
    attentionLayers: '',
    embeddingDimension: '',  // ADDED - Missing from original
    ffnDimension: '',         // ADDED - Missing from original
    businessObjectives: '',
    hpcGpuNeeded: '',
    numberOfGpus: '',

    // Inference-Specific Questions (11 fields)
    inferenceInputSize: '',
    inferenceOutputSize: '',      // ADDED - Missing from original
    deploymentScenario: '',       // ADDED - Missing from original
    inferenceBatchSize: '',
    targetThroughput: '',
    targetLatency: '',
    concurrentUsers: '',          // Renamed from concurrentRequests
    requestsPerSecond: '',        // ADDED - Missing from original
    inferenceBudget: '',          // ADDED - Missing from original
    timeToFirstToken: '',         // ADDED - Missing from original

    // Training-Specific Questions (15 fields)
    isFullTraining: '',           // ADDED - Missing from original
    fineTuningMethod: '',         // ADDED - Missing from original
    trainingDatasetSize: '',
    trainingInputSize: '',        // ADDED - Missing from original
    trainingOutputSize: '',       // ADDED - Missing from original
    trainingBatchSize: '',        // ADDED - Missing from original
    optimizer: '',
    learningRate: '',
    epochs: '',
    targetTrainingTime: '',       // ADDED - Missing from original
    trainingThroughput: '',       // ADDED - Missing from original
    concurrentTrainingJobs: '',   // ADDED - Missing from original
    trainingBudget: ''            // ADDED - Missing from original
  });

  // Metadata for tracking auto-filled and overridden fields
  const [metadata, setMetadata] = useState({
    autoFilledFields: [], // Fields that were auto-filled from backend
    overriddenFields: [], // Fields that were manually changed after auto-fill
    lastSaved: null, // Timestamp of last save
    lastAutoFilled: null // Timestamp of last auto-fill
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveError, setLastSaveError] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Track if localStorage is being loaded

  // Auto-fillable fields from backend (15 fields)
  const AUTO_FILLABLE_FIELDS = [
    'framework',
    'parameters',
    'modelSize',
    'architectureType',
    'modelType',
    'precision',
    'vocabularySize',
    'activationFunction',
    'gflops',
    'hiddenLayers',
    'attentionLayers',
    'embeddingDimension',
    'ffnDimension'
  ];

  // Load from localStorage on mount
  useEffect(() => {
    setIsLoading(true);

    const savedConfig = localStorage.getItem('modelConfig');
    const savedMetadata = localStorage.getItem('modelConfigMetadata');

    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
        console.log('[ModelConfigContext] Loaded config from localStorage:', {
          modelName: parsedConfig.modelName,
          taskType: parsedConfig.taskType,
          totalFields: Object.keys(parsedConfig).filter(key => parsedConfig[key] !== '').length
        });
      } catch (error) {
        console.error('Error parsing saved config:', error);
      }
    } else {
      console.log('[ModelConfigContext] No saved config found in localStorage');
    }

    if (savedMetadata) {
      try {
        setMetadata(JSON.parse(savedMetadata));
      } catch (error) {
        console.error('Error parsing saved metadata:', error);
      }
    }

    // Mark as loaded
    setIsLoading(false);
  }, []);

  // Debounced auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('modelConfig', JSON.stringify(config));
      localStorage.setItem('modelConfigMetadata', JSON.stringify(metadata));
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [config, metadata]);

  // Update a single field
  const updateField = (fieldName, value) => {
    setConfig(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Check if this field was auto-filled and is now being changed
    if (metadata.autoFilledFields.includes(fieldName) && !metadata.overriddenFields.includes(fieldName)) {
      setMetadata(prev => ({
        ...prev,
        overriddenFields: [...prev.overriddenFields, fieldName]
      }));
    }
  };

  // Update multiple fields at once (used for auto-fill)
  const updateMultipleFields = (fieldsObject) => {
    setConfig(prev => ({
      ...prev,
      ...fieldsObject
    }));
  };

  // Auto-fill fields from backend API
  const autoFillFromBackend = async (modelName, taskType) => {
    if (!modelName || !taskType) {
      console.warn('Model name and task type are required for auto-fill');
      return { success: false, error: 'Missing required fields' };
    }

    try {
      const response = await apiClient.post('/model/get-model-data', {
        model_name: modelName,
        task_type: taskType
      });

      if (response.data.status === 'success' && response.data.model_data) {
        const modelData = response.data.model_data;

        // Map backend fields to config fields
        const autoFilledFields = {
          framework: modelData.framework || '',
          parameters: modelData.total_parameters_millions?.toString() || '',
          modelSize: modelData.model_size_mb?.toString() || '',
          architectureType: modelData.architecture_type || '',
          modelType: modelData.model_type || '',
          precision: modelData.precision || '',
          vocabularySize: modelData.vocabulary_size?.toString() || '',
          activationFunction: modelData.activation_function || '',
          hiddenLayers: modelData.number_of_hidden_layers?.toString() || '',
          attentionLayers: modelData.number_of_attention_layers?.toString() || '',
          embeddingDimension: modelData.embedding_vector_dimension?.toString() || '',
          ffnDimension: modelData.ffn_dimension?.toString() || '',
          // Only set GFLOPs for Inference, leave empty for Training
          gflops: taskType === 'Training' ? '' : (modelData.gflops_billions?.toString() || '')
        };

        // Update config with auto-filled fields
        updateMultipleFields(autoFilledFields);

        // Update metadata
        const newAutoFilledFields = Object.keys(autoFilledFields).filter(
          field => autoFilledFields[field] !== ''
        );

        setMetadata(prev => ({
          ...prev,
          autoFilledFields: newAutoFilledFields,
          // Remove from overridden if it was previously there
          overriddenFields: prev.overriddenFields.filter(
            field => !newAutoFilledFields.includes(field)
          ),
          lastAutoFilled: new Date().toISOString()
        }));

        return { success: true, fieldsUpdated: newAutoFilledFields };
      } else {
        return { success: false, error: 'No model data found' };
      }
    } catch (error) {
      console.error('Error auto-filling from backend:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if a field is auto-filled
  const isAutoFilled = (fieldName) => {
    return metadata.autoFilledFields.includes(fieldName) && !metadata.overriddenFields.includes(fieldName);
  };

  // Check if a field is manually overridden
  const isOverridden = (fieldName) => {
    return metadata.overriddenFields.includes(fieldName);
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const totalFields = Object.keys(config).length;
    const filledFields = Object.values(config).filter(value => value !== '').length;
    return Math.round((filledFields / totalFields) * 100);
  };

  // Save to backend (placeholder - will be implemented when backend endpoint is ready)
  const saveToBackend = async () => {
    setIsSaving(true);
    setLastSaveError(null);

    try {
      // TODO: Implement backend save endpoint
      // const response = await apiClient.post('/api/model-config', {
      //   config,
      //   metadata
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 500));

      setMetadata(prev => ({
        ...prev,
        lastSaved: new Date().toISOString()
      }));

      return { success: true };
    } catch (error) {
      console.error('Error saving to backend:', error);
      setLastSaveError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  // Load from backend (placeholder - will be implemented when backend endpoint is ready)
  const loadFromBackend = async () => {
    try {
      // TODO: Implement backend load endpoint
      // const response = await apiClient.get('/api/model-config/latest');
      // if (response.data.success) {
      //   setConfig(response.data.config);
      //   setMetadata(response.data.metadata);
      // }

      return { success: false, error: 'Backend loading not yet implemented' };
    } catch (error) {
      console.error('Error loading from backend:', error);
      return { success: false, error: error.message };
    }
  };

  // Clear all configuration
  const clearConfig = () => {
    const emptyConfig = Object.keys(config).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});

    setConfig(emptyConfig);
    setMetadata({
      autoFilledFields: [],
      overriddenFields: [],
      lastSaved: null,
      lastAutoFilled: null
    });

    localStorage.removeItem('modelConfig');
    localStorage.removeItem('modelConfigMetadata');
  };

  const value = {
    config,
    metadata,
    updateField,
    updateMultipleFields,
    autoFillFromBackend,
    isAutoFilled,
    isOverridden,
    calculateCompletion,
    saveToBackend,
    loadFromBackend,
    clearConfig,
    isSaving,
    isLoading,
    lastSaveError
  };

  return (
    <ModelConfigContext.Provider value={value}>
      {children}
    </ModelConfigContext.Provider>
  );
};
