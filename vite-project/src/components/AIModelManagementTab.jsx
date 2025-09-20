import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Brain, BarChart3, Database, Activity, Funnel } from 'lucide-react';

const AIModelManagementTab = () => {
  const [modelData, setModelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  // Statistics
  const [statistics, setStatistics] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    model_name: '',
    framework: '',
    task_type: '',
    total_parameters_millions: '',
    model_size_mb: '',
    architecture_type: '',
    model_type: '',
    number_of_hidden_layers: '',
    embedding_vector_dimension: '',
    precision: '',
    vocabulary_size: '',
    ffn_dimension: '',
    activation_function: '',
    gflops_billions: '',
    number_of_attention_layers: ''
  });

  // Framework and task type options
  const frameworkOptions = ['PyTorch', 'TensorFlow', 'JAX', 'ONNX', 'Hugging Face'];
  const taskTypeOptions = ['Inference', 'Training', 'Fine-tuning', 'Transfer Learning'];
  const precisionOptions = ['FP32', 'FP16', 'BF16', 'INT8', 'INT4'];
  const activationOptions = ['silu', 'gelu', 'relu', 'gelu_new', 'gelu_pytorch_tanh'];

  // Fetch models data from API
  useEffect(() => {
    fetchModelsData();
    fetchStatistics();
  }, []);

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(modelData);
    } else {
      const filtered = modelData.filter(model =>
        model.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.framework?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.task_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.architecture_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, modelData]);

  const fetchModelsData = async () => {
    try {
      setLoading(true);
      console.log('Fetching models data from /api/model-management/');
      const response = await fetch('/api/model-management/');
      const data = await response.json();

      console.log('Models API Response:', data);

      if (response.ok && data.success) {
        setModelData(data.models || []);
        setError(null);
      } else {
        console.error('API returned error:', data);
        setError('Failed to fetch models data');
        setModelData([]);
      }
    } catch (err) {
      console.error('Error fetching models data:', err);
      setError('Failed to connect to server');
      setModelData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/model-management/statistics/');
      const data = await response.json();

      if (response.ok && data.success) {
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      model_name: '',
      framework: '',
      task_type: '',
      total_parameters_millions: '',
      model_size_mb: '',
      architecture_type: '',
      model_type: '',
      number_of_hidden_layers: '',
      embedding_vector_dimension: '',
      precision: '',
      vocabulary_size: '',
      ffn_dimension: '',
      activation_function: '',
      gflops_billions: '',
      number_of_attention_layers: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new model
  const handleAddModel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/model-management/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchModelsData(); // Refresh the list
        setShowAddModal(false);
        resetForm();
      } else {
        setError(result.message || 'Failed to add model');
      }
    } catch (err) {
      console.error('Error adding model:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update model
  const handleUpdateModel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/model-management/${selectedModel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchModelsData(); // Refresh the list
        setShowEditModal(false);
        setSelectedModel(null);
        resetForm();
      } else {
        setError(result.message || 'Failed to update model');
      }
    } catch (err) {
      console.error('Error updating model:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete model
  const handleDeleteModel = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/model-management/${selectedModel.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchModelsData(); // Refresh the list
        setShowDeleteModal(false);
        setSelectedModel(null);
      } else {
        setError(result.message || 'Failed to delete model');
      }
    } catch (err) {
      console.error('Error deleting model:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (model) => {
    setSelectedModel(model);
    setFormData({
      model_name: model.model_name || '',
      framework: model.framework || '',
      task_type: model.task_type || '',
      total_parameters_millions: model.total_parameters_millions || '',
      model_size_mb: model.model_size_mb || '',
      architecture_type: model.architecture_type || '',
      model_type: model.model_type || '',
      number_of_hidden_layers: model.number_of_hidden_layers || '',
      embedding_vector_dimension: model.embedding_vector_dimension || '',
      precision: model.precision || '',
      vocabulary_size: model.vocabulary_size || '',
      ffn_dimension: model.ffn_dimension || '',
      activation_function: model.activation_function || '',
      gflops_billions: model.gflops_billions || '',
      number_of_attention_layers: model.number_of_attention_layers || ''
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (model) => {
    setSelectedModel(model);
    setShowDeleteModal(true);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return typeof num === 'number' ? num.toLocaleString() : num;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <h1 className="text-4xl font-medium mb-6" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>
      {/* Header with Statistics */}
      <div className="w-full mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-normal text-gray-900 dark:text-white">AI Model Management</h2>
            <p className="text-gray-600 dark:text-gray-400 text-base">Manage your AI models database</p>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 bg-[#008060] hover:bg-[#00694d] text-white rounded-full text-lg font-medium flex items-center gap-2 h-11 transition-colors"
            >
              <span>Add</span>
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Statistics Cards */}
          {/* {statistics && ( */}
          <div className="flex gap-4 mb-6">
            {/* Total Models */}
            <div className="bg-white rounded-lg p-4 text-left shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:brightness-95 transition-colors w-full md:w-1/4">
              <Database className="w-8 h-8 mb-3" />
              <div className="flex justify-between items-center">
                <div className="text-lg text-gray-900 dark:text-white">Total Models</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                   {/* {statistics.total_models} */}
                  {0}
                </div>
              </div>
            </div>

            {/* Frameworks */}
            <div className="bg-white rounded-lg p-4 text-left shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:brightness-95 transition-colors w-full md:w-1/4">
              <BarChart3 className="w-8 h-8 mb-3" />
              <div className="flex justify-between items-center">
                <div className="text-lg text-gray-900 dark:text-white">Frameworks</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {/* {statistics.frameworks?.length || 0} */}
                  {0}
                </div>
              </div>
            </div>

            {/* Task Types */}
            <div className="bg-white rounded-lg p-4 text-left shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:brightness-95 transition-colors w-full md:w-1/4">
              <Activity className="w-8 h-8 mb-3" />
              <div className="flex justify-between items-center">
                <div className="text-lg text-gray-900 dark:text-white">Task Types</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {/* {statistics.task_types?.length || 0} */}
                  {0}
                </div>
              </div>
            </div>

            {/* Architectures */}
            <div className="bg-white rounded-lg p-4 text-left shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:brightness-95 transition-colors w-full md:w-1/4">
              <Brain className="w-8 h-8 mb-3" />
              <div className="flex justify-between items-center">
                <div className="text-lg text-gray-900 dark:text-white">Architectures</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {/* {statistics.architecture_types?.length || 0} */}
                  {0}
                </div>
              </div>
            </div>
          </div>
          {/* )} */}

          <div className="mt-2 flex items-center gap-3 mb-3">
            {/* Search Input with Icon */}
            <div className="relative w-[400px]">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg dark:bg-gray-800 text-gray-700 placeholder-gray-500 text-base focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 font-bolder text-gray-900" />
            </div>

            {/* Filter Button */}
            <button className="p-2 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
              <Funnel className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Models Table */}
        <div className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01a982]"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading models...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchModelsData}
                className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Model Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Framework</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Task Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Parameters (M)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Size (MB)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Architecture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Precision</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No models found matching your search.' : 'No models found. Add some models to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((model) => (
                      <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {model.model_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {model.framework}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {model.task_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(model.total_parameters_millions)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {formatNumber(model.model_size_mb)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-32">
                          {model.architecture_type || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {model.precision || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(model)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit model"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(model)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Results Count */}
          {filteredData.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredData.length} of {modelData.length} models
              {searchTerm && ` for "${searchTerm}"`}
            </div>
          )}
        </div>

        {/* Add Model Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New AI Model</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fill in the model details (* required fields)</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Basic Information Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Name *
                        </label>
                        <input
                          type="text"
                          name="model_name"
                          value={formData.model_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., GPT-4, BERT-Large"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Framework *
                        </label>
                        <select
                          name="framework"
                          value={formData.framework}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          required
                        >
                          <option value="">Select Framework</option>
                          {frameworkOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Task Type *
                        </label>
                        <select
                          name="task_type"
                          value={formData.task_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          required
                        >
                          <option value="">Select Task Type</option>
                          {taskTypeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Type
                        </label>
                        <input
                          type="text"
                          name="model_type"
                          value={formData.model_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., transformer, cnn, rnn"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Architecture Details Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Architecture Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Architecture Type
                        </label>
                        <input
                          type="text"
                          name="architecture_type"
                          value={formData.architecture_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., LlamaForCausalLM, BertForSequenceClassification"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Hidden Layers
                        </label>
                        <input
                          type="number"
                          name="number_of_hidden_layers"
                          value={formData.number_of_hidden_layers}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 12, 24, 32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Attention Layers
                        </label>
                        <input
                          type="number"
                          name="number_of_attention_layers"
                          value={formData.number_of_attention_layers}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 12, 16, 32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Embedding Vector Dimension
                        </label>
                        <input
                          type="number"
                          name="embedding_vector_dimension"
                          value={formData.embedding_vector_dimension}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 768, 1024, 4096"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          FFN (MLP) Dimension
                        </label>
                        <input
                          type="number"
                          name="ffn_dimension"
                          value={formData.ffn_dimension}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 3072, 11008, 14336"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Vocabulary Size
                        </label>
                        <input
                          type="number"
                          name="vocabulary_size"
                          value={formData.vocabulary_size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 30000, 50000, 32000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Model Specifications Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Total Parameters (Millions)
                        </label>
                        <input
                          type="number"
                          name="total_parameters_millions"
                          value={formData.total_parameters_millions}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 175000, 6700, 13000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Size (MB)
                        </label>
                        <input
                          type="number"
                          name="model_size_mb"
                          value={formData.model_size_mb}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 25000, 13000, 49000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          GFLOPs (Billions)
                        </label>
                        <input
                          type="number"
                          name="gflops_billions"
                          value={formData.gflops_billions}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 1500.5, 3000.2, 11205.2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Precision
                        </label>
                        <select
                          name="precision"
                          value={formData.precision}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                        >
                          <option value="">Select Precision</option>
                          {precisionOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Activation Function
                        </label>
                        <select
                          name="activation_function"
                          value={formData.activation_function}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                        >
                          <option value="">Select Activation</option>
                          {activationOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddModel}
                  disabled={!formData.model_name || !formData.framework || !formData.task_type}
                  className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Model
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Model Modal */}
        {showEditModal && selectedModel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit AI Model</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update model details (* required fields)</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Basic Information Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Name *
                        </label>
                        <input
                          type="text"
                          name="model_name"
                          value={formData.model_name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., GPT-4, BERT-Large"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Framework *
                        </label>
                        <select
                          name="framework"
                          value={formData.framework}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          required
                        >
                          <option value="">Select Framework</option>
                          {frameworkOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Task Type *
                        </label>
                        <select
                          name="task_type"
                          value={formData.task_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          required
                        >
                          <option value="">Select Task Type</option>
                          {taskTypeOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Type
                        </label>
                        <input
                          type="text"
                          name="model_type"
                          value={formData.model_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., transformer, cnn, rnn"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Architecture Details Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Architecture Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Architecture Type
                        </label>
                        <input
                          type="text"
                          name="architecture_type"
                          value={formData.architecture_type}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., LlamaForCausalLM, BertForSequenceClassification"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Hidden Layers
                        </label>
                        <input
                          type="number"
                          name="number_of_hidden_layers"
                          value={formData.number_of_hidden_layers}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 12, 24, 32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Number of Attention Layers
                        </label>
                        <input
                          type="number"
                          name="number_of_attention_layers"
                          value={formData.number_of_attention_layers}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 12, 16, 32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Embedding Vector Dimension
                        </label>
                        <input
                          type="number"
                          name="embedding_vector_dimension"
                          value={formData.embedding_vector_dimension}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 768, 1024, 4096"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          FFN (MLP) Dimension
                        </label>
                        <input
                          type="number"
                          name="ffn_dimension"
                          value={formData.ffn_dimension}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 3072, 11008, 14336"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Vocabulary Size
                        </label>
                        <input
                          type="number"
                          name="vocabulary_size"
                          value={formData.vocabulary_size}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 30000, 50000, 32000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Model Specifications Section */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Total Parameters (Millions)
                        </label>
                        <input
                          type="number"
                          name="total_parameters_millions"
                          value={formData.total_parameters_millions}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 175000, 6700, 13000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Model Size (MB)
                        </label>
                        <input
                          type="number"
                          name="model_size_mb"
                          value={formData.model_size_mb}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 25000, 13000, 49000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          GFLOPs (Billions)
                        </label>
                        <input
                          type="number"
                          name="gflops_billions"
                          value={formData.gflops_billions}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                          placeholder="e.g., 1500.5, 3000.2, 11205.2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Precision
                        </label>
                        <select
                          name="precision"
                          value={formData.precision}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                        >
                          <option value="">Select Precision</option>
                          {precisionOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Activation Function
                        </label>
                        <select
                          name="activation_function"
                          value={formData.activation_function}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
                        >
                          <option value="">Select Activation</option>
                          {activationOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedModel(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateModel}
                  disabled={!formData.model_name || !formData.framework || !formData.task_type}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Update Model
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedModel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Model</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete the model "{selectedModel.model_name}"?
                  This action cannot be undone.
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedModel(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteModel}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIModelManagementTab;