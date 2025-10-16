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
    optimizationAnalysis,
    alternativeOptions,
    isPostDeployment,
    analysisSummary,
    currentBaseline,
    rawOptimizationResults
  } = results;

  const exportData = (format) => {
    if (format === 'json') {
      // Export comprehensive JSON including all data from HTML report
      const comprehensiveData = {
        ...results,
        exportMetadata: {
          exportDate: new Date().toISOString(),
          reportType: mode,
          includesAdvancedStats: !!results.advancedStats,
          includesHostMetrics: !!results.hostMetrics
        }
      };

      const jsonData = JSON.stringify(comprehensiveData, null, 2);
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
      // Export comprehensive CSV including advanced metrics for post-deployment mode
      let csvContent = '';

      if (mode === 'post-deployment' && (results.hostMetrics || results.vmMetrics) && (results.advancedStats || results.advancedVmStats)) {
        // Enhanced CSV for post-deployment with advanced stats (both bare metal and VM)
        const isVM = !!results.vmMetrics;
        const metrics = results.vmMetrics || results.hostMetrics;
        const advStats = results.advancedVmStats || results.advancedStats;

        const headers = [
          'Section', 'Metric', 'Value', 'Unit', 'Category'
        ];

        const rows = [
          // Current Metrics (VM or Host)
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'GPU Utilization', metrics.gpuUtilization || 'N/A', '%', 'Real-time'],
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'GPU Memory Usage', metrics.gpuMemoryUsage || 'N/A', '%', 'Real-time'],
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'CPU Utilization', metrics.cpuUtilization || 'N/A', '%', 'Real-time'],
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'CPU Memory Usage', metrics.cpuMemoryUsage || 'N/A', '%', 'Real-time'],
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'Disk IOPS', metrics.diskIops || 'N/A', 'IOPS', 'Real-time'],
          [`Current ${isVM ? 'VM' : 'Host'} Metrics`, 'Network Bandwidth', metrics.networkBandwidth || 'N/A', 'MB/s', 'Real-time'],

          // Advanced Statistics (VM or Host)
          ['Advanced Analytics', 'Average CPU', (advStats.avg_cpu_usage || advStats.avg_host_cpu_percent) || 0, '%', '7-day average'],
          ['Advanced Analytics', 'CPU 95th Percentile', (advStats.cpu_95th_percentile || advStats.host_cpu_95th_percentile) || 0, '%', '7-day statistics'],
          ['Advanced Analytics', 'CPU Volatility', (advStats.cpu_volatility || advStats.host_cpu_volatility) || 0, '%', '7-day statistics'],
          ['Advanced Analytics', 'Average Memory', (advStats.avg_memory_usage || advStats.avg_host_ram_percent) || 0, '%', '7-day average'],
          ['Advanced Analytics', 'Memory 95th Percentile', (advStats.memory_95th_percentile || advStats.host_ram_95th_percentile) || 0, '%', '7-day statistics'],
          ['Advanced Analytics', 'Memory Volatility', (advStats.memory_volatility || advStats.host_ram_volatility) || 0, '%', '7-day statistics'],
          ['Advanced Analytics', 'Average GPU', (advStats.avg_gpu_usage || advStats.avg_host_gpu_percent) || 0, '%', '7-day average'],
          ['Advanced Analytics', 'GPU 95th Percentile', (advStats.gpu_95th_percentile || advStats.host_gpu_95th_percentile) || 0, '%', '7-day statistics'],
          ['Advanced Analytics', 'Average Power', (advStats.avg_power_consumption || advStats.avg_process_power_watts) || 0, 'W', '7-day average'],
          ['Advanced Analytics', 'Peak Power', (advStats.max_power_consumption || advStats.max_process_power_watts) || 0, 'W', '7-day peak'],
          ['Advanced Analytics', 'Total Energy', (advStats.total_energy_kwh || advStats.total_energy_kwh) || 0, 'kWh', '7-day total'],

          // Threshold Breaches
          ['Threshold Analysis', 'CPU Critical Breaches', (advStats.cpu_critical_breach_percent || advStats.cpu_critical_breach_percent) || 0, '% of time', '>90% threshold'],
          ['Threshold Analysis', 'CPU Warning Breaches', (advStats.cpu_warning_breach_percent || advStats.cpu_warning_breach_percent) || 0, '% of time', '>80% threshold'],
          ['Threshold Analysis', 'Memory Critical Breaches', (advStats.memory_critical_breach_percent || advStats.memory_critical_breach_percent) || 0, '% of time', '>90% threshold'],
          ['Threshold Analysis', 'Memory Warning Breaches', (advStats.memory_warning_breach_percent || advStats.memory_warning_breach_percent) || 0, '% of time', '>80% threshold'],

          // Recommendation
          ['Recommendation', 'Recommended Action', recommendedConfiguration.recommendedInstance, '', 'ML Model Output'],
          ['Recommendation', 'Expected Inference Time', recommendedConfiguration.expectedInferenceTime, '', 'Performance'],
          ['Recommendation', 'Cost per 1000 Inferences', recommendedConfiguration.costPer1000, '', 'Economics']
        ];

        csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      } else {
        // Basic CSV for pre-deployment or VM-level mode
        const headers = ['Hardware', 'Full Name', 'Inference Time (ms)', 'Cost per 1000', 'Status'];
        csvContent = [
          headers.join(','),
          ...alternativeOptions.map(hw => [
            hw.hardware,
            hw.fullName,
            hw.inferenceTime || hw.latency,
            hw.costPer1000,
            hw.status
          ].join(','))
        ].join('\n');
      }
      
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
    <title>GreenMatrix ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Recommendations</title>
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
            background: linear-gradient(135deg, #01a982 0%, #059669 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(1, 169, 130, 0.2);
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
            color: #01a982;
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.8em;
            border-bottom: 3px solid #01a982;
            padding-bottom: 10px;
        }
        .recommended-config {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .config-card {
            background: linear-gradient(135deg, #01a982 0%, #059669 100%);
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
        .metrics-section {
            background: #f0f9ff;
            padding: 25px;
            border-radius: 12px;
            margin: 20px 0;
            border: 1px solid #e0f2fe;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .metric-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .metric-label {
            font-size: 0.8em;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.2em;
            font-weight: 600;
            color: #01a982;
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
            padding: 10px;
            background: white;
            border-radius: 6px;
            font-size: 0.9em;
        }
        .spec-label {
            font-weight: 600;
            color: #374151;
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
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6b7280;
            font-size: 0.9em;
            border-top: 1px solid #e5e7eb;
        }
        @media print {
            body { background: white; }
            .header, .section { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GreenMatrix ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Recommendations</h1>
        <p>AI Workload Hardware Optimization Analysis</p>
        <p>Generated on: ${timestamp}</p>
    </div>

    <div class="section">
        <h2>Recommended Configuration</h2>
        <p>${recommendedConfiguration.description}</p>

        ${recommendedConfiguration.recommendedVRAM ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; font-size: 0.95em;">
                <div>
                    <span style="color: #6b7280;">Current VRAM Allocation:</span>
                    <strong style="color: #1d4ed8; margin-left: 5px;">${recommendedConfiguration.currentVRAM}</strong>
                </div>
                <span style="color: #d1d5db;">|</span>
                <div>
                    <span style="color: #6b7280;">Model Required VRAM:</span>
                    <strong style="color: #d97706; margin-left: 5px;">${recommendedConfiguration.requiredVRAM}</strong>
                </div>
                <span style="color: #d1d5db;">|</span>
                <div>
                    <span style="color: #6b7280;">Recommended VRAM:</span>
                    <strong style="color: #059669; margin-left: 5px;">${recommendedConfiguration.recommendedVRAM}</strong>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="recommended-config">
            <div class="config-card">
                <h3>RECOMMENDED CONFIGURATION</h3>
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
    </div>

    ${mode === 'post-deployment' && results.modelParameters ? `
    <div class="section">
        <h2>AI Model Details</h2>
        <p>Model characteristics and runtime parameters selected for optimization analysis.</p>

        <div class="metrics-grid">
            <div class="metric-item">
                <div class="metric-label">Model Name</div>
                <div class="metric-value">${results.modelParameters.modelName || 'N/A'}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Task Type</div>
                <div class="metric-value">${results.modelParameters.taskType || 'N/A'}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Framework</div>
                <div class="metric-value">${results.modelParameters.framework || 'N/A'}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Total Parameters</div>
                <div class="metric-value">${results.modelParameters.parameters || 'N/A'} Million</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Model Size</div>
                <div class="metric-value">${results.modelParameters.modelSize || 'N/A'} MB</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Precision</div>
                <div class="metric-value">${results.modelParameters.precision || 'N/A'}</div>
            </div>
            ${results.modelParameters.taskType === 'Inference' ? `
            <div class="metric-item">
                <div class="metric-label">Input Size</div>
                <div class="metric-value">${results.modelParameters.inputSize || 'N/A'} tokens</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Output Size</div>
                <div class="metric-value">${results.modelParameters.outputSize || 'N/A'} tokens</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Batch Size</div>
                <div class="metric-value">${results.modelParameters.batchSize || 'N/A'}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Scenario</div>
                <div class="metric-value">${results.modelParameters.scenario || 'N/A'}</div>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    ${mode === 'post-deployment' ? `
    <div class="section">
        <h2>${results.vmMetrics ? 'Current VM Resource Metrics' : 'Current Host Metrics'}</h2>
        <p>${results.vmMetrics ? 'Real-time resource utilization metrics from the virtual machine at the time of analysis.' : 'Real-time resource utilization metrics from the bare metal host machine at the time of analysis.'}</p>

        <div class="metrics-grid">
            <div class="metric-item">
                <div class="metric-label">GPU Utilization</div>
                <div class="metric-value">${(results.vmMetrics?.gpuUtilization || results.hostMetrics?.gpuUtilization) || 'N/A'}%</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">GPU Memory Usage</div>
                <div class="metric-value">${(results.vmMetrics?.gpuMemoryUsage || results.hostMetrics?.gpuMemoryUsage) || 'N/A'}%</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">CPU Utilization</div>
                <div class="metric-value">${(results.vmMetrics?.cpuUtilization || results.hostMetrics?.cpuUtilization) || 'N/A'}%</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">CPU Memory Usage</div>
                <div class="metric-value">${(results.vmMetrics?.cpuMemoryUsage || results.hostMetrics?.cpuMemoryUsage) || 'N/A'}%</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Disk IOPS</div>
                <div class="metric-value">${(results.vmMetrics?.diskIops || results.hostMetrics?.diskIops) || 'N/A'}</div>
            </div>
            <div class="metric-item">
                <div class="metric-label">Network Bandwidth</div>
                <div class="metric-value">${(results.vmMetrics?.networkBandwidth || results.hostMetrics?.networkBandwidth) || 'N/A'} MB/s</div>
            </div>
        </div>
    </div>

    ${(results.advancedStats || results.advancedVmStats) ? `
    <div class="section">
        <h2>${results.vmMetrics ? 'Advanced VM Analytics (Last 7 Days)' : 'Advanced Host Analytics (Last 7 Days)'}</h2>
        <p>${results.vmMetrics ? 'Comprehensive statistical analysis of virtual machine performance metrics and workload patterns.' : 'Comprehensive statistical analysis of bare metal host performance metrics and workload patterns.'}</p>

        <div class="section">
            <h3>Resource Utilization Statistics</h3>
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-label">CPU Analysis</div>
                    <div class="metric-value">
                        Avg: ${(results.advancedVmStats?.avg_cpu_usage || results.advancedStats?.avg_host_cpu_percent) || 0}% |
                        95th: ${(results.advancedVmStats?.cpu_95th_percentile || results.advancedStats?.host_cpu_95th_percentile) || 0}% |
                        Volatility: ${(results.advancedVmStats?.cpu_volatility || results.advancedStats?.host_cpu_volatility) || 0}%
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Memory Analysis</div>
                    <div class="metric-value">
                        Avg: ${(results.advancedVmStats?.avg_memory_usage || results.advancedStats?.avg_host_ram_percent) || 0}% |
                        95th: ${(results.advancedVmStats?.memory_95th_percentile || results.advancedStats?.host_ram_95th_percentile) || 0}% |
                        Volatility: ${(results.advancedVmStats?.memory_volatility || results.advancedStats?.host_ram_volatility) || 0}%
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">GPU Performance</div>
                    <div class="metric-value">
                        Avg: ${(results.advancedVmStats?.avg_gpu_usage || results.advancedStats?.avg_host_gpu_percent) || 0}% |
                        95th: ${(results.advancedVmStats?.gpu_95th_percentile || results.advancedStats?.host_gpu_95th_percentile) || 0}% |
                        Temp: ${(results.advancedVmStats?.avg_gpu_temperature || results.advancedStats?.avg_gpu_temperature_celsius) || 0}°C
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Power Consumption</div>
                    <div class="metric-value">
                        Avg: ${(results.advancedVmStats?.avg_power_consumption || results.advancedStats?.avg_process_power_watts) || 0}W |
                        Peak: ${(results.advancedVmStats?.max_power_consumption || results.advancedStats?.max_process_power_watts) || 0}W |
                        Total: ${(results.advancedVmStats?.total_energy_kwh || results.advancedStats?.total_energy_kwh) || 0} kWh
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3>Threshold Breach Analysis</h3>
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-label">CPU Threshold Breaches</div>
                    <div class="metric-value">
                        Critical (>90%): ${results.advancedStats.cpu_critical_breach_percent || 0}% of time<br>
                        Warning (>80%): ${results.advancedStats.cpu_warning_breach_percent || 0}% of time<br>
                        Elevated (>70%): ${results.advancedStats.cpu_elevated_breach_percent || 0}% of time
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Memory Threshold Breaches</div>
                    <div class="metric-value">
                        Critical (>90%): ${results.advancedStats.memory_critical_breach_percent || 0}% of time<br>
                        Warning (>80%): ${results.advancedStats.memory_warning_breach_percent || 0}% of time
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">GPU Threshold Breaches</div>
                    <div class="metric-value">
                        Critical (>90%): ${results.advancedStats.gpu_critical_breach_percent || 0}% of time<br>
                        Warning (>80%): ${results.advancedStats.gpu_warning_breach_percent || 0}% of time
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Temperature Breaches</div>
                    <div class="metric-value">
                        Critical (>85°C): ${results.advancedStats.temp_critical_breach_percent || 0}% of time<br>
                        Warning (>80°C): ${results.advancedStats.temp_warning_breach_percent || 0}% of time
                    </div>
                </div>
            </div>
        </div>

        ${results.advancedStats.process_efficiency_data && results.advancedStats.process_efficiency_data.length > 0 ? `
        <div class="section">
            <h3>Process Efficiency Analysis</h3>
            <div class="hardware-analysis">
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <thead>
                        <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Process</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Avg Power (W)</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">CPU %</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Efficiency (CPU/W)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.advancedStats.process_efficiency_data.slice(0, 10).map(proc => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 10px;">${proc.process_name}</td>
                                <td style="padding: 10px;">${proc.avg_power_watts}W</td>
                                <td style="padding: 10px;">${proc.avg_cpu_percent}%</td>
                                <td style="padding: 10px;">${proc.efficiency_score}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}

        ${results.advancedStats.peak_usage_hours && results.advancedStats.peak_usage_hours.length > 0 ? `
        <div class="section">
            <h3>Peak Usage Pattern Analysis</h3>
            <div class="metrics-grid">
                ${results.advancedStats.peak_usage_hours.slice(0, 6).map(hour => `
                    <div class="metric-item">
                        <div class="metric-label">Hour ${hour.hour}:00</div>
                        <div class="metric-value">
                            Avg CPU: ${hour.avg_cpu}% | Peak: ${hour.peak_cpu}% |
                            High Usage Events: ${hour.high_cpu_count}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    ` : ''}
    ` : ''}

    ${hardwareAnalysis ? `
    <div class="section">
        <h2>Hardware Analysis</h2>

        <div class="hardware-analysis">
            <h3>Configuration: ${hardwareAnalysis.name}</h3>
            <div class="specs-grid">
                <div class="spec-item">
                    <span class="spec-label">Memory:</span> ${hardwareAnalysis.memory}
                </div>
                <div class="spec-item">
                    <span class="spec-label">FP16 Performance:</span> ${hardwareAnalysis.fp16Performance}
                </div>
                <div class="spec-item">
                    <span class="spec-label">Architecture:</span> ${hardwareAnalysis.architecture}
                </div>
            </div>

            <div class="strengths-considerations">
                <div class="strengths">
                    <h4>Strengths</h4>
                    <ul>
                        ${hardwareAnalysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
                    </ul>
                </div>
                <div class="considerations">
                    <h4>Considerations</h4>
                    <ul>
                        ${hardwareAnalysis.considerations.map(consideration => `<li>${consideration}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <p><strong>Use Case:</strong> ${hardwareAnalysis.useCase}</p>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was generated automatically by the GreenMatrix ${mode === 'pre-deployment' ? 'Pre-Deployment' : 'Post-Deployment'} Optimization Platform</p>
        <p>For more details, visit the GreenMatrix Analytics Dashboard</p>
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{hardware.hardware}</h3>
        {hardware.recommended && (
          <span className="bg-[#01a982]/10 text-[#01a982] px-2 py-1 rounded-full text-xs font-bold">
            Recommended
          </span>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{hardware.fullName}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Inference Time:</span>
          </div>
          <p className="text-lg font-semibold">{hardware.inferenceTime}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Cost per 1000:</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{hardware.costPer1000}</p>
        </div>
        
        {hardware.memory && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Memory:</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{hardware.memory}</p>
          </div>
        )}
        
        {hardware.architecture && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Architecture:</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{hardware.architecture}</p>
          </div>
        )}
      </div>
      
      {/* Post-deployment improvements */}
      {hardware.currentVsProjected && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Improvements vs Current</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">
                {hardware.currentVsProjected.latency_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Latency</div>
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-bold">
                {hardware.currentVsProjected.memory_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Memory</div>
            </div>
            <div>
              <div className="text-gray-900 dark:text-white font-bold">
                {hardware.currentVsProjected.cost_improvement_percent.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Cost</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-gray-900 dark:text-white" />
          <span className="text-sm text-gray-900 dark:text-white">{hardware.status}</span>
        </div>
        
        {/* Optimization scores */}
        {hardware.optimizationScores && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
            <h2 className="text-2xl font-bold text-[#01a982] dark:text-[#01a982] mb-2">
              Recommendation Results
            </h2>
          </div>
          
          {/* Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-2 px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Database className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => exportData('report')}
              className="flex items-center gap-2 px-4 py-2 text-[#01a982] dark:text-[#01a982] border border-[#01a982] rounded-lg hover:bg-[#01a982]/10 dark:hover:bg-[#01a982]/20 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Configuration */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-[#01a982] dark:text-[#01a982] mb-4 text-center">
          Recommended Configuration
        </h3>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          {recommendedConfiguration.description}
        </p>

        {/* VM-specific VRAM allocation info */}
        {recommendedConfiguration.recommendedVRAM && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">Current VRAM Allocation:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{recommendedConfiguration.currentVRAM}</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">Model Required VRAM:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">{recommendedConfiguration.requiredVRAM}</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-300">Recommended VRAM:</span>
                <span className="font-bold text-green-700 dark:text-green-300">{recommendedConfiguration.recommendedVRAM}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedConfiguration.recommendedMethod ? (
            // Optimization recommendations display
            <>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Cpu className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">OPTIMIZATION METHOD</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.recommendedMethod}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-600 dark:text-gray-400">⚡</span>
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">RECOMMENDED PRECISION</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.recommendedPrecision}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl text-gray-600 dark:text-gray-400">🔧</span>
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">OPTIMIZATION TYPE</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.optimizationType}</p>
              </div>
            </>
          ) : (
            // Hardware recommendations display
            <>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Cpu className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">RECOMMENDED CONFIGURATION</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.recommendedInstance}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">EXPECTED INFERENCE TIME</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.expectedInferenceTime}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                </div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">COST PER 1000 INFERENCES</h4>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{recommendedConfiguration.costPer1000}</p>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Hardware Analysis or Optimization Analysis */}
      {optimizationAnalysis ? (
        <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hardware Analysis: {optimizationAnalysis.modelName}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Cpu className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="font-medium">Method:</span>
              <span>{optimizationAnalysis.method}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Precision:</span>
              <span>{optimizationAnalysis.precision}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Architecture:</span>
              <span>{optimizationAnalysis.architecture}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {optimizationAnalysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-700 dark:text-gray-300 mt-0.5 flex-shrink-0" />
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
                {optimizationAnalysis.considerations.map((consideration, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    {consideration}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">Use Case:</span>{' '}
            {optimizationAnalysis.useCase}
          </div>
        </div>
      ) : hardwareAnalysis ? (
        <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hardware Analysis: {hardwareAnalysis.name}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Memory:</span>
              <span className="ml-2">{hardwareAnalysis.memory}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">FP16 Performance:</span>
              <span className="ml-2">{hardwareAnalysis.fp16Performance}</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Architecture:</span>
              <span className="ml-2">{hardwareAnalysis.architecture}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Strengths
              </h4>
              <ul className="space-y-2">
                {hardwareAnalysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                    • {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Considerations
              </h4>
              <ul className="space-y-2">
                {hardwareAnalysis.considerations.map((consideration, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                    • {consideration}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-white">Use Case:</span>{' '}
            {hardwareAnalysis.useCase}
          </div>
        </div>
      ) : null}

      {/* Optimization Details */}
      {optimizationAnalysis && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400 mb-2">
            Optimization Details
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Detailed optimization recommendations and implementation guidance
          </p>

        {/* Optimization Details Display */}
        {optimizationAnalysis && (
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Optimization Recommendation</h3>
              <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-bold">
                AI Recommended
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">Optimization Method:</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{optimizationAnalysis?.method || 'Unknown'}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Precision Setting:</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{optimizationAnalysis?.precision || 'Unknown'}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Implementation Benefits</div>
              <p className="text-gray-600 dark:text-gray-300">{optimizationAnalysis?.improvement || 'Optimized for your model configuration'}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{optimizationAnalysis?.status || 'AI Recommended'}</span>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

    </div>
  );
};

export default OptimizationResults;