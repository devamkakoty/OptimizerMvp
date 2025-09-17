import { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { apiCache } from '../utils/apiCache';

// Custom hook for fetching and caching dropdown data
export const useDropdownData = () => {
  const [modelNames, setModelNames] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [hardwareData, setHardwareData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fallback values
  const fallbackModelNames = ['llama', 'qwen2', 'phi3', 'mistral', 'gemma', 'phi', 'gpt2', 'bert', 'roberta'];
  const fallbackTaskTypes = ['Inference', 'Training'];

  const fetchDropdownData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Check cache first
      let cachedModelNames = apiCache.get('/model/unique-names');
      let cachedTaskTypes = apiCache.get('/model/unique-task-types');
      let cachedHardwareData = apiCache.get('/hardware/');

      const needsModelNames = !cachedModelNames;
      const needsTaskTypes = !cachedTaskTypes;
      const needsHardwareData = !cachedHardwareData;

      // Only make API calls for data not in cache
      const promises = [];
      if (needsModelNames) {
        promises.push(
          apiClient.get('/model/unique-names')
            .then(response => ({ type: 'modelNames', response }))
            .catch(error => ({ type: 'modelNames', error }))
        );
      }

      if (needsTaskTypes) {
        promises.push(
          apiClient.get('/model/unique-task-types')
            .then(response => ({ type: 'taskTypes', response }))
            .catch(error => ({ type: 'taskTypes', error }))
        );
      }

      if (needsHardwareData) {
        promises.push(
          apiClient.get('/hardware/')
            .then(response => ({ type: 'hardware', response }))
            .catch(error => ({ type: 'hardware', error }))
        );
      }

      // Wait for all API calls
      const results = await Promise.all(promises);

      // Process results
      results.forEach(result => {
        if (result.error) {
          console.error(`${result.type} API failed:`, result.error);
          return;
        }

        const response = result.response;
        if (result.type === 'modelNames' && response.data?.status === 'success') {
          cachedModelNames = response.data.model_names || [];
          apiCache.set('/model/unique-names', cachedModelNames);
        } else if (result.type === 'taskTypes' && response.data?.status === 'success') {
          cachedTaskTypes = response.data.task_types || [];
          apiCache.set('/model/unique-task-types', cachedTaskTypes);
        } else if (result.type === 'hardware' && response.data?.status === 'success') {
          cachedHardwareData = response.data.hardware_list || [];
          apiCache.set('/hardware/', cachedHardwareData);
        }
      });

      // Set final values (use cache if available, fallback if not)
      setModelNames(cachedModelNames || fallbackModelNames);
      setTaskTypes(cachedTaskTypes || fallbackTaskTypes);
      setHardwareData(cachedHardwareData || []);

      console.log('Dropdown data loaded successfully:', {
        modelNames: cachedModelNames?.length || 'fallback',
        taskTypes: cachedTaskTypes?.length || 'fallback',
        hardware: cachedHardwareData?.length || 0
      });

    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setError('Failed to load dropdown options from backend.');
      
      // Use fallback values
      setModelNames(fallbackModelNames);
      setTaskTypes(fallbackTaskTypes);
      setHardwareData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Return data and utility functions
  return {
    modelNames,
    taskTypes,
    hardwareData,
    isLoading,
    error,
    refetchData: fetchDropdownData,
    clearCache: () => {
      apiCache.clearAll();
      fetchDropdownData();
    }
  };
};