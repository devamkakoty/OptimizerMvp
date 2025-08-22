import React, { useState } from 'react';
import { Download, FileText, Database, Cpu, Clock, DollarSign, HardDrive, CheckCircle, AlertTriangle } from 'lucide-react';

const OptimizationResults = ({ results, mode }) => {
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  if (!results || !results.recommendedConfiguration) {
    return null;
  }

  const { 
    recommendedConfiguration, 
    hardwareAnalysis, 
    alternativeOptions,
    isPostDeployment,
    analysisSummary,
    currentBaseline,
    rawOptimizationResults
  } = results;

  const exportData = (format) => {
    if (format === 'json') {
      // Export as JSON
      const jsonData = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mode}_recommendations_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } else if (format === 'csv') {
      // Export as CSV
      const headers = ['Hardware', 'Full Name', 'Inference Time (ms)', 'Cost per 1000', 'Status'];
      const csvContent = [
        headers.join(','),
        ...alternativeOptions.map(hw => [
          hw.hardware,
          hw.fullName,
          hw.inferenceTime,
          hw.costPer1000,
          hw.status
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${mode}_recommendations_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } else if (format === 'report') {
      // Export as HTML Report
      const timestamp = new Date().toLocaleString();
      const filename = `${mode}_Recommendations_Report_${new Date().toISOString().slice(0, 10)}.html`;
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HPE ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Recommendations</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid #e1e5e9;
        }
        .section h2 {
            color: #6366f1;
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.8em;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 10px;
        }
        .recommended-config {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .config-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .config-card h3 {
            margin: 0 0 10px 0;
            font-size: 0.9em;
            opacity: 0.8;
        }
        .config-card .value {
            font-size: 1.5em;
            font-weight: 700;
        }
        .hardware-analysis {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin: 20px 0;
        }
        .specs-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .spec-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
        }
        .strengths-considerations {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        .strengths h4, .considerations h4 {
            margin: 0 0 15px 0;
            font-size: 1.1em;
        }
        .strengths {
            color: #059669;
        }
        .considerations {
            color: #d97706;
        }
        .alternatives-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .alternatives-table th {
            background: #6366f1;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9em;
        }
        .alternatives-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .alternatives-table tr:hover {
            background: #f8f9fa;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
        }
        .status-meets {
            background: #d1fae5;
            color: #065f46;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6b7280;
            font-size: 0.9em;
        }
        @media print {
            body { background: white; }
            .header, .section { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 HPE ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Recommendations</h1>
        <p>Hardware Configuration Analysis & Recommendations</p>
        <p>Generated on: ${timestamp}</p>
    </div>

    <div class="section">
        <h2>🎯 Recommended Configuration</h2>
        <p>${recommendedConfiguration.description}</p>
        
        <div class="recommended-config">
            <div class="config-card">
                <h3>RECOMMENDED INSTANCE</h3>
                <div class="value">${recommendedConfiguration.recommendedInstance}</div>
            </div>
            <div class="config-card">
                <h3>EXPECTED INFERENCE TIME</h3>
                <div class="value">${recommendedConfiguration.expectedInferenceTime}</div>
            </div>
            <div class="config-card">
                <h3>COST PER 1000 INFERENCES</h3>
                <div class="value">${recommendedConfiguration.costPer1000}</div>
            </div>
        </div>

        <div class="hardware-analysis">
            <h3>🔧 Hardware Analysis: ${hardwareAnalysis.name}</h3>
            <div class="specs-grid">
                <div class="spec-item">💾 Memory: ${hardwareAnalysis.memory}</div>
                <div class="spec-item">⚡ FP16 Performance: ${hardwareAnalysis.fp16Performance}</div>
                <div class="spec-item">🏗 Architecture: ${hardwareAnalysis.architecture}</div>
            </div>
            
            <div class="strengths-considerations">
                <div class="strengths">
                    <h4>✅ Strengths</h4>
                    <ul>
                        ${hardwareAnalysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
                    </ul>
                </div>
                <div class="considerations">
                    <h4>⚠️ Considerations</h4>
                    <ul>
                        ${hardwareAnalysis.considerations.map(consideration => `<li>${consideration}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <p><strong>Use Case:</strong> ${hardwareAnalysis.useCase}</p>
        </div>
    </div>

    <div class="section">
        <h2>🔄 Alternative Hardware Options</h2>
        <p>Other hardware configurations that could meet your requirements</p>
        
        <table class="alternatives-table">
            <thead>
                <tr>
                    <th>Hardware</th>
                    <th>Full Name</th>
                    <th>Inference Time (ms)</th>
                    <th>Cost per 1000</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${alternativeOptions.map(hw => `
                    <tr>
                        <td><strong>${hw.hardware}</strong></td>
                        <td>${hw.fullName}</td>
                        <td>${hw.inferenceTime}</td>
                        <td style="color: #10b981; font-weight: 600;">${hw.costPer1000}</td>
                        <td><span class="status-badge status-meets">${hw.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>📄 This report was generated automatically by the HPE ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Optimization Dashboard</p>
        <p>💡 For more details, visit the HPE Analytics Platform</p>
    </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const AlternativeCard = ({ hardware }) => (
    <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{hardware.hardware}</h3>
        {hardware.recommended && (
          <span className="bg-yellow-400 text-purple-900 px-2 py-1 rounded-full text-xs font-bold">
            Recommended
          </span>
        )}
      </div>
      <p className="text-purple-100 text-sm mb-4">{hardware.fullName}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm text-purple-100">Inference Time:</span>
          </div>
          <p className="text-lg font-semibold">{hardware.inferenceTime}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm text-purple-100">Cost per 1000:</span>
          </div>
          <p className="text-lg font-semibold text-green-300">{hardware.costPer1000}</p>
        </div>
        
        {hardware.memory && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm text-purple-100">Memory:</span>
            </div>
            <p className="text-lg font-semibold text-purple-300">{hardware.memory}</p>
          </div>
        )}
        
        {hardware.architecture && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm text-purple-100">Architecture:</span>
            </div>
            <p className="text-lg font-semibold text-purple-300">{hardware.architecture}</p>
          </div>
        )}
      </div>
      
      {/* Post-deployment improvements */}
      {hardware.currentVsProjected && (
        <div className="mt-4 pt-4 border-t border-purple-400">
          <div className="text-xs text-purple-200 mb-2">Improvements vs Current</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-green-300 font-bold">
                {hardware.currentVsProjected.latency_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-purple-200">Latency</div>
            </div>
            <div>
              <div className="text-green-300 font-bold">
                {hardware.currentVsProjected.memory_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-purple-200">Memory</div>
            </div>
            <div>
              <div className="text-green-300 font-bold">
                {hardware.currentVsProjected.cost_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-purple-200">Cost</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-purple-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-300" />
          <span className="text-sm text-green-300">{hardware.status}</span>
        </div>
        
        {/* Optimization scores */}
        {hardware.optimizationScores && (
          <div className="mt-2 text-xs text-purple-200">
            Overall Score: {hardware.optimizationScores.overall_score.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              Recommendation Results
            </h2>
          </div>
          
          {/* Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Database className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => exportData('report')}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Configuration */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 text-center">
          Recommended Configuration
        </h3>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          {recommendedConfiguration.description}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white text-center">
            <div className="flex items-center justify-center mb-2">
              <Cpu className="w-8 h-8" />
            </div>
            <h4 className="text-sm opacity-80 mb-2">RECOMMENDED INSTANCE</h4>
            <p className="text-2xl font-bold">{recommendedConfiguration.recommendedInstance}</p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-8 h-8" />
            </div>
            <h4 className="text-sm opacity-80 mb-2">EXPECTED INFERENCE TIME</h4>
            <p className="text-2xl font-bold">{recommendedConfiguration.expectedInferenceTime}</p>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-8 h-8" />
            </div>
            <h4 className="text-sm opacity-80 mb-2">COST PER 1000 INFERENCES</h4>
            <p className="text-2xl font-bold">{recommendedConfiguration.costPer1000}</p>
          </div>
        </div>
      </div>

      {/* Post-Deployment Analysis Summary */}
      {isPostDeployment && analysisSummary && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
              Analysis Summary
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-500">📊</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Hardware Evaluated</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {analysisSummary.total_hardware_evaluated}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-500">🎯</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Priority</span>
              </div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 capitalize">
                {analysisSummary.optimization_priority}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-500">⚙️</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">Workflow</span>
              </div>
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                Post-Deployment
              </p>
            </div>
          </div>

          {/* Current Performance Baseline */}
          {currentBaseline && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Current Performance Baseline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Latency:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {currentBaseline.latency_ms}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Memory:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {currentBaseline.memory_gb}GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Cost:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    ${currentBaseline.cost_per_1000}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hardware Analysis */}
      <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Hardware Analysis: {hardwareAnalysis.name}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <HardDrive className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Memory:</span>
            <span>{hardwareAnalysis.memory}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="w-4 h-4 text-yellow-500">⚡</span>
            <span className="font-medium">FP16 Performance:</span>
            <span>{hardwareAnalysis.fp16Performance}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="w-4 h-4 text-green-500">🏗</span>
            <span className="font-medium">Architecture:</span>
            <span>{hardwareAnalysis.architecture}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <h4 className="font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {hardwareAnalysis.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Considerations
            </h4>
            <ul className="space-y-2">
              {hardwareAnalysis.considerations.map((consideration, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  {consideration}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium text-blue-600 dark:text-blue-400">Use Case:</span>{' '}
          {hardwareAnalysis.useCase}
        </div>
      </div>

      {/* Alternative Hardware Options */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-2">
          Alternative Hardware Options
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Other hardware configurations that could meet your requirements
        </p>
        
        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                viewMode === 'card'
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Card View
            </button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {alternativeOptions.map((hardware, index) => (
              <AlternativeCard key={index} hardware={hardware} />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-purple-50 dark:bg-purple-900/20">
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-left text-sm font-medium text-purple-700 dark:text-purple-300">
                    Hardware
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-left text-sm font-medium text-purple-700 dark:text-purple-300">
                    Full Name
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Inference Time<br />(ms)
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Cost per<br />1000
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {alternativeOptions.map((hardware, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {hardware.recommended && (
                          <span className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded text-xs font-bold">
                            Recommended
                          </span>
                        )}
                        {hardware.hardware}
                      </div>
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-600 dark:text-gray-300">
                      {hardware.fullName}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white">
                      {hardware.inferenceTime}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                      {hardware.costPer1000}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        {hardware.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizationResults;