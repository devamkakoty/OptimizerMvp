import React, { useState } from 'react';
import { Download, FileText, Database } from 'lucide-react';

const SimulationResults = ({ results }) => {
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  if (!results || !results.hardwareComparison) {
    return null;
  }

  const { hardwareComparison } = results;

  const exportData = (format) => {
    if (format === 'json') {
      // Export as JSON
      const jsonData = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation_results_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } else if (format === 'csv') {
      // Export as CSV
      const headers = ['Hardware', 'Full Name', 'Latency (ms)', 'Throughput (QPS)', 'Cost per 1000', 'Memory (GB)'];
      const csvContent = [
        headers.join(','),
        ...hardwareComparison.map(hw => [
          hw.name,
          hw.fullName || 'N/A',
          hw.latency.replace(' ms', ''),
          hw.throughput.replace(' QPS', ''),
          hw.costPer1000,
          hw.memory.replace(' GB', '')
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation_results_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } else if (format === 'report') {
      // Export as HTML Report
      const timestamp = new Date().toLocaleString();
      const filename = `Simulation_Report_${new Date().toISOString().slice(0, 10)}.html`;
      
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HPE Simulation Report</title>
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
        .hardware-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .hardware-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.25);
        }
        .hardware-card h3 {
            margin: 0 0 5px 0;
            font-size: 1.4em;
            font-weight: 700;
        }
        .hardware-card .subtitle {
            opacity: 0.8;
            margin-bottom: 20px;
            font-size: 0.9em;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .metric {
            display: flex;
            flex-direction: column;
        }
        .metric-label {
            font-size: 0.8em;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.2em;
            font-weight: 600;
        }
        .additional-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.3);
        }
        .additional-info .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 0.9em;
        }
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .comparison-table th {
            background: #6366f1;
            color: white;
            padding: 15px 12px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9em;
        }
        .comparison-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .comparison-table tr:hover {
            background: #f8f9fa;
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
        <h1>🚀 HPE Simulation Report</h1>
        <p>Hardware Performance Comparison Analysis</p>
        <p>Generated on: ${timestamp}</p>
    </div>

    <div class="section">
        <h2>📊 Hardware Performance Cards</h2>
        <div class="hardware-grid">
            ${hardwareComparison.map(hw => `
                <div class="hardware-card">
                    <h3>${hw.name}</h3>
                    <div class="subtitle">${hw.fullName || 'N/A'}</div>
                    <div class="metrics-grid">
                        <div class="metric">
                            <div class="metric-label">🕐 Latency</div>
                            <div class="metric-value">${hw.latency}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">⚡ Throughput</div>
                            <div class="metric-value">${hw.throughput}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">💰 Cost per 1000</div>
                            <div class="metric-value" style="color: #10b981;">${hw.costPer1000}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">🧠 Memory</div>
                            <div class="metric-value" style="color: #a78bfa;">${hw.memory}</div>
                        </div>
                    </div>
                    ${hw.additionalInfo ? `
                        <div class="additional-info">
                            <div class="info-grid">
                                ${hw.additionalInfo.arch ? `<div>🏗 Arch: ${hw.additionalInfo.arch}</div>` : ''}
                                ${hw.additionalInfo.memory ? `<div>📊 Memory: ${hw.additionalInfo.memory}</div>` : ''}
                                ${hw.additionalInfo.flops ? `<div>⚡ FP16: ${hw.additionalInfo.flops}</div>` : ''}
                                ${hw.additionalInfo.power ? `<div>🔋 Power: ${hw.additionalInfo.power}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📋 Detailed Comparison Table</h2>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Hardware</th>
                    <th>Full Name</th>
                    <th>Latency (ms)</th>
                    <th>Throughput (QPS)</th>
                    <th>Cost per 1000</th>
                    <th>Memory (GB)</th>
                </tr>
            </thead>
            <tbody>
                ${hardwareComparison.map(hw => `
                    <tr>
                        <td><strong>${hw.name}</strong></td>
                        <td>${hw.fullName || 'N/A'}</td>
                        <td>${hw.latency}</td>
                        <td>${hw.throughput}</td>
                        <td style="color: #10b981; font-weight: 600;">${hw.costPer1000}</td>
                        <td>${hw.memory}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>📄 This report was generated automatically by the HPE Simulation Dashboard</p>
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

  const HardwareCard = ({ hardware }) => (
    <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
      <h3 className="text-xl font-bold mb-1">{hardware.name}</h3>
      <p className="text-purple-100 text-sm mb-4">{hardware.fullName}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border border-white rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-sm text-purple-100">Latency</span>
          </div>
          <p className="text-lg font-semibold">{hardware.latency}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border border-white rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-white"></div>
            </div>
            <span className="text-sm text-purple-100">Throughput</span>
          </div>
          <p className="text-lg font-semibold">{hardware.throughput}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-300 text-lg">$</span>
            <span className="text-sm text-purple-100">Cost per 1000</span>
          </div>
          <p className="text-lg font-semibold text-green-300">{hardware.costPer1000}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border border-white rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-purple-300"></div>
            </div>
            <span className="text-sm text-purple-100">Memory</span>
          </div>
          <p className="text-lg font-semibold text-purple-300">{hardware.memory}</p>
        </div>
      </div>
      
      {hardware.additionalInfo && (
        <div className="mt-4 pt-4 border-t border-purple-400">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {hardware.additionalInfo.arch && (
              <div>
                <span className="text-purple-200">🏗 Arch: </span>
                <span>{hardware.additionalInfo.arch}</span>
              </div>
            )}
            {hardware.additionalInfo.memory && (
              <div>
                <span className="text-purple-200">📊 Mem: </span>
                <span>{hardware.additionalInfo.memory}</span>
              </div>
            )}
            {hardware.additionalInfo.flops && (
              <div>
                <span className="text-purple-200">⚡ FP16: </span>
                <span>{hardware.additionalInfo.flops}</span>
              </div>
            )}
            {hardware.additionalInfo.power && (
              <div>
                <span className="text-purple-200">Power: </span>
                <span>{hardware.additionalInfo.power}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              Simulation Results
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

      {/* Hardware Performance Comparison */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-4 text-center">
          Hardware Performance Comparison
        </h3>
        
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hardwareComparison.map((hardware, index) => (
              <HardwareCard key={index} hardware={hardware} />
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
                    Latency<br />(ms)
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Throughput<br />(QPS)
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Cost per<br />1000
                  </th>
                  <th className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-sm font-medium text-purple-700 dark:text-purple-300">
                    Memory<br />(GB)
                  </th>
                </tr>
              </thead>
              <tbody>
                {hardwareComparison.map((hardware, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {hardware.name}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-gray-600 dark:text-gray-300">
                      {hardware.fullName}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white">
                      {hardware.latency}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white">
                      {hardware.throughput}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">
                      {hardware.costPer1000}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-600 px-4 py-3 text-center text-gray-900 dark:text-white">
                      {hardware.memory}
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

export default SimulationResults;