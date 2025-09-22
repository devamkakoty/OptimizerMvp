import React, { useState, useEffect } from 'react';
import { Search, Funnel, BatteryCharging, Factory, Lightbulb } from 'lucide-react';

const CostManagementTab = () => {
  const [costModels, setCostModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    resource_name: 'ELECTRICITY_KWH',
    cost_per_unit: '',
    currency: 'USD',
    region: '',
    description: ''
  });

  const regions = [
    'US', 'us-west-2', 'us-east-1', 'eu-west-1', 'ap-southeast-1',
    'ap-south-1', 'eu-central-1', 'us-central-1', 'ca-central-1',
    'ap-northeast-1', 'sa-east-1'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR'];
  const resourceTypes = ['ELECTRICITY_KWH', 'COMPUTE_HOUR', 'STORAGE_GB', 'NETWORK_GB'];

  // Fetch cost models
  const fetchCostModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cost-models');
      const data = await response.json();

      if (data.success) {
        setCostModels(data.cost_models || []);
      } else {
        setError(data.message || 'Failed to fetch cost models');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create cost model
  const createCostModel = async (modelData) => {
    try {
      const response = await fetch('/api/cost-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCostModels(); // Refresh the list
        return { success: true };
      } else {
        return { success: false, error: data.detail || data.message || 'Failed to create cost model' };
      }
    } catch (err) {
      return { success: false, error: 'Network error: ' + err.message };
    }
  };

  // Update cost model
  const updateCostModel = async (id, modelData) => {
    try {
      const response = await fetch(`/api/cost-models/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCostModels(); // Refresh the list
        return { success: true };
      } else {
        return { success: false, error: data.detail || data.message || 'Failed to update cost model' };
      }
    } catch (err) {
      return { success: false, error: 'Network error: ' + err.message };
    }
  };

  // Delete cost model
  const deleteCostModel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cost model?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cost-models/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await fetchCostModels(); // Refresh the list
        alert('Cost model deleted successfully');
      } else {
        alert('Failed to delete: ' + (data.detail || data.message));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  // Handle form submission for add/edit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const modelData = {
      ...formData,
      cost_per_unit: parseFloat(formData.cost_per_unit)
    };

    let result;
    if (editingModel) {
      result = await updateCostModel(editingModel.id, modelData);
    } else {
      result = await createCostModel(modelData);
    }

    if (result.success) {
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingModel(null);
      setFormData({
        resource_name: 'ELECTRICITY_KWH',
        cost_per_unit: '',
        currency: 'USD',
        region: '',
        description: ''
      });
      setError('');
    } else {
      setError(result.error);
    }
  };

  // Handle edit click
  const handleEdit = (model) => {
    setEditingModel(model);
    setFormData({
      resource_name: model.resource_name,
      cost_per_unit: model.cost_per_unit.toString(),
      currency: model.currency,
      region: model.region,
      description: model.description || ''
    });
    setShowEditModal(true);
    setError('');
  };

  // Handle add click
  const handleAdd = () => {
    setEditingModel(null);
    setFormData({
      resource_name: 'ELECTRICITY_KWH',
      cost_per_unit: '',
      currency: 'USD',
      region: '',
      description: ''
    });
    setShowAddModal(true);
    setError('');
  };

  // Format currency display
  const formatCurrency = (amount, currency) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', INR: '₹' };
    return `${symbols[currency] || currency} ${amount}`;
  };

  useEffect(() => {
    fetchCostModels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-4xl font-medium mb-6 text-left" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>

      {/* Main Bordered Container */}
      <div className="w-full mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">

        {/* Cost Management Header */}
        <div className="flex items-center gap-28">
          {/* Left: Cost Management */}
          <h2 className="text-[24px] font-normal text-gray-900 dark:text-white">
            Cost Management
          </h2>

          {/* Center: Subtext */}
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Manage regional pricing models for cost optimization and FinOps analysis
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 my-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Cost Models Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border-gray-700 overflow-hidden">
          <div className="px-2 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {/* Left: Title */}
              <h3 className="text-xl font-medium text-gray-800 dark:text-white">
                Regional Cost Models
              </h3>

              {/* Middle: Count */}
              <p className="text-md text-gray-500 dark:text-gray-400">
                {costModels.length} cost model{costModels.length !== 1 ? 's' : ''} configured
              </p>

              {/* Right: Button */}
              <button
                onClick={handleAdd}
                className="px-5 py-2.5 bg-[#008060] hover:bg-[#00694d] text-white rounded-full text-base font-medium flex items-center gap-2 h-11 transition-colors"
              >
                <span>Add Cost</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </button>
            </div>
          </div>



          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading cost models...</p>
            </div>
          ) : costModels.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">No cost models found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Add your first cost model to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Resource Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Cost per Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Search and Filter Bar */}
                <div className="mt-2 flex items-center gap-3">
                  {/* Search Input with Icon */}
                  <div className="relative w-[400px]">
                    <input
                      type="text"
                      placeholder="Search"
                      className="w-full pl-10 pr-4 py-2 border border-gray-400 rounded-lg text-gray-700 placeholder-gray-500 text-base focus:outline-none focus:ring-1 focus:ring-gray-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 font-bolder text-gray-900" />
                  </div>

                  {/* Filter Button */}
                  <button className="p-2 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
                    <Funnel className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {costModels.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {model.region}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {model.resource_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(model.cost_per_unit, model.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {model.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {model.description || "No description"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(model)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCostModel(model.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>

  );
};

export default CostManagementTab;