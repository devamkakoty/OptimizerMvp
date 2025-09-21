import React, { useMemo } from 'react';
import { Download } from 'lucide-react';

const SystemInsightsGenerator = ({ processData, vmData, selectedDate, viewMode, hostMetrics, timeRangeDays = 7 }) => {
  const generateInsightsData = () => {
    const analysis = {
      cost: [],
      scaling: [],
      performance: [],
      security: [],
      summary: {}
    };

    // Ensure we have valid data
    const validProcessData = Array.isArray(processData) ? processData : [];
    const validVmData = Array.isArray(vmData) ? vmData : [];
    const validHostMetrics = hostMetrics || {};

    // Calculate system metrics including GPU
    const totalCpuUsage = validProcessData.reduce((sum, p) => sum + (p['CPU Usage (%)'] || 0), 0);
    const totalMemoryUsage = validProcessData.reduce((sum, p) => sum + (p['Memory Usage (MB)'] || 0), 0);
    const avgCpuUsage = validProcessData.length > 0 ? totalCpuUsage / validProcessData.length : 0;
    const avgMemoryUsagePercent = validProcessData.length > 0 ?
      validProcessData.reduce((sum, p) => sum + (p['Memory Usage (%)'] || 0), 0) / validProcessData.length : 0;

    // GPU metrics
    const avgGpuMemoryUsage = validProcessData.length > 0 ?
      validProcessData.reduce((sum, p) => sum + (p['GPU Memory (MB)'] || 0), 0) / validProcessData.length : 0;
    const avgGpuUtilization = validProcessData.length > 0 ?
      validProcessData.reduce((sum, p) => sum + (p['GPU Util %'] || 0), 0) / validProcessData.length : 0;

    const highCpuProcesses = validProcessData.filter(p => (p['CPU Usage (%)'] || 0) > 5);
    const highMemoryProcesses = validProcessData.filter(p => (p['Memory Usage (MB)'] || 0) > 500);
    const highGpuMemoryProcesses = validProcessData.filter(p => (p['GPU Memory (MB)'] || 0) > 100);
    const highGpuUtilProcesses = validProcessData.filter(p => (p['GPU Util %'] || 0) > 10);
    const idleProcesses = validProcessData.filter(p => (p['CPU Usage (%)'] || 0) < 0.1 && p['Status'] === 'running');

    // VM Analysis
    const runningVMs = validVmData.filter(vm => vm.status === 'Running');
    const vmCpuAvg = runningVMs.length > 0 ?
      runningVMs.reduce((sum, vm) => sum + (vm.cpuUsage || 0), 0) / runningVMs.length : 0;
    const vmRamAvg = runningVMs.length > 0 ?
      runningVMs.reduce((sum, vm) => sum + (vm.ramUsagePercent || 0), 0) / runningVMs.length : 0;
    const underutilizedVMs = runningVMs.filter(vm => (vm.cpuUsage || 0) < 20 && (vm.ramUsagePercent || 0) < 30);
    const overutilizedVMs = runningVMs.filter(vm => (vm.cpuUsage || 0) > 80 || (vm.ramUsagePercent || 0) > 85);

    // Determine analysis period for display - default to 7-day analysis
    const analysisDescription = viewMode === 'week' ?
      `${timeRangeDays}-Day Average Analysis` :
      selectedDate === 'today' ? `Last ${timeRangeDays} Days Analysis` : `Analysis for ${new Date(selectedDate).toLocaleDateString()}`;

    // Calculate peak usage and frequency statistics
    const cpuPeakUsage = Math.max(...validProcessData.map(p => p['CPU Usage (%)'] || 0));
    const memoryPeakUsage = Math.max(...validProcessData.map(p => p['Memory Usage (%)'] || 0));
    const gpuPeakUsage = Math.max(...validProcessData.map(p => p['GPU Utilization (%)'] || 0));

    // Power consumption analysis
    const totalPowerConsumption = validProcessData.reduce((sum, p) => sum + (p['Power Consumption (W)'] || 0), 0);
    const avgPowerConsumption = validProcessData.length > 0 ? totalPowerConsumption / validProcessData.length : 0;
    const maxPowerConsumption = Math.max(...validProcessData.map(p => p['Power Consumption (W)'] || 0));

    // Calculate cost metrics
    const totalEnergyCost = validProcessData.reduce((sum, p) => sum + (p['Energy Cost ($)'] || 0), 0);
    const avgEnergyCost = validProcessData.length > 0 ? totalEnergyCost / validProcessData.length : 0;

    // Process efficiency metrics
    const highCpuCount = highCpuProcesses.length;
    const highMemoryCount = highMemoryProcesses.length;
    const highGpuCount = highGpuUtilProcesses.length;
    const idleCount = idleProcesses.length;

    // Top resource consumers
    const topCpuProcess = validProcessData.reduce((max, p) =>
      (p['CPU Usage (%)'] || 0) > (max['CPU Usage (%)'] || 0) ? p : max, validProcessData[0] || {});
    const topMemoryProcess = validProcessData.reduce((max, p) =>
      (p['Memory Usage (MB)'] || 0) > (max['Memory Usage (MB)'] || 0) ? p : max, validProcessData[0] || {});
    const topGpuProcess = validProcessData.reduce((max, p) =>
      (p['GPU Utilization (%)'] || 0) > (max['GPU Utilization (%)'] || 0) ? p : max, validProcessData[0] || {});

    // Store only accurate metrics from real data sources
    analysis.summary = {
      // Host System Metrics - ACCURATE real-time data
      hostCpuUsage: (validHostMetrics.host_cpu_usage_percent || 0).toFixed(1),
      hostRamUsage: (validHostMetrics.host_ram_usage_percent || 0).toFixed(1),
      hostGpuUsage: (validHostMetrics.host_gpu_utilization_percent || 0).toFixed(1),
      hostGpuMemoryUsage: (validHostMetrics.host_gpu_memory_utilization_percent || 0).toFixed(1),
      hostGpuTemperature: (validHostMetrics.host_gpu_temperature_celsius || 0).toFixed(1),
      hostGpuPowerDraw: (validHostMetrics.host_gpu_power_draw_watts || 0).toFixed(1),
      hostNetworkTotal: validHostMetrics.host_network_bytes_sent && validHostMetrics.host_network_bytes_received
        ? Math.round((validHostMetrics.host_network_bytes_sent + validHostMetrics.host_network_bytes_received) / 1024 / 1024 / 1024)
        : 0,
      hostDiskTotal: validHostMetrics.host_disk_read_bytes && validHostMetrics.host_disk_write_bytes
        ? Math.round((validHostMetrics.host_disk_read_bytes + validHostMetrics.host_disk_write_bytes) / 1024 / 1024 / 1024)
        : 0,

      // VM metrics - ACCURATE from VM data
      runningVMs: runningVMs.length,
      stoppedVMs: validVmData.length - runningVMs.length,
      vmCpuAvg: vmCpuAvg.toFixed(1),
      vmRamAvg: vmRamAvg.toFixed(1),
      underutilizedVMCount: underutilizedVMs.length,
      overutilizedVMCount: overutilizedVMs.length,

      // Analysis metadata
      analysisDate: new Date().toLocaleDateString(),
      analysisTime: new Date().toLocaleTimeString(),
      analysisDescription: analysisDescription,
      viewMode: viewMode,
      timeRangeDays: timeRangeDays
    };

    // Debug logging (can be removed in production)
    console.log('SystemInsightsGenerator Debug:', {
      processDataLength: validProcessData.length,
      vmDataLength: validVmData.length,
      avgCpuUsage: avgCpuUsage,
      avgMemoryUsagePercent: avgMemoryUsagePercent,
      totalMemoryUsage: totalMemoryUsage,
      avgGpuMemoryUsage: avgGpuMemoryUsage,
      avgGpuUtilization: avgGpuUtilization,
      highGpuMemoryProcesses: highGpuMemoryProcesses.length,
      highGpuUtilProcesses: highGpuUtilProcesses.length,
      runningVMs: runningVMs.length,
      vmCpuAvg: vmCpuAvg,
      vmRamAvg: vmRamAvg,
      viewMode: viewMode,
      selectedDate: selectedDate,
      firstProcessSample: validProcessData[0],
      firstVmSample: validVmData[0]
    });

    // COST OPTIMIZATION INSIGHTS
    // Adjust thresholds based on analysis type (weekly data should be more conservative)
    const cpuThreshold = viewMode === 'week' ? 25 : 30;
    const memoryThreshold = viewMode === 'week' ? 35 : 40;
    const gpuThreshold = viewMode === 'week' ? 20 : 25;

    if (avgCpuUsage < cpuThreshold && avgMemoryUsagePercent < memoryThreshold && avgGpuUtilization < gpuThreshold) {
      const analysisContext = viewMode === 'week' ? 'consistently over the week' : 'during this period';
      analysis.cost.push({
        type: 'optimization',
        priority: 'high',
        title: 'Hardware Downscaling Opportunity',
        description: `System is underutilized ${analysisContext} (CPU: ${avgCpuUsage.toFixed(1)}%, Memory: ${avgMemoryUsagePercent.toFixed(1)}%, GPU: ${avgGpuUtilization.toFixed(1)}%). Consider downsizing hardware.`,
        savings: viewMode === 'week' ? '$3,600-7,200/year' : '$2,400-4,800/year',
        action: 'Migrate to smaller instance types or consolidate workloads',
        impact: 'Reduce infrastructure costs by 30-50%',
        timeframe: viewMode === 'week' ? '2-3 weeks' : '1-2 weeks',
        difficulty: 'Medium'
      });
    }

    // GPU-specific cost optimization
    if (avgGpuUtilization < 10 && avgGpuMemoryUsage < 50) {
      const analysisContext = viewMode === 'week' ? 'consistently over the week' : 'during this period';
      analysis.cost.push({
        type: 'optimization',
        priority: 'high',
        title: 'GPU Underutilization Detected',
        description: `GPU resources are significantly underutilized ${analysisContext} (Utilization: ${avgGpuUtilization.toFixed(1)}%, Memory: ${avgGpuMemoryUsage.toFixed(1)}MB). Consider CPU-only instances.`,
        savings: viewMode === 'week' ? '$4,800-9,600/year' : '$3,200-6,400/year',
        action: 'Migrate to CPU-only instances or downgrade GPU tier',
        impact: 'Reduce GPU costs by 60-80%',
        timeframe: '2-4 weeks',
        difficulty: 'Medium'
      });
    }

    const idleThreshold = viewMode === 'week' ? 3 : 5; // Lower threshold for weekly analysis
    if (idleProcesses.length > idleThreshold) {
      const analysisContext = viewMode === 'week' ? 'persistently idle over the week' : 'currently idle';
      analysis.cost.push({
        type: 'optimization',
        priority: viewMode === 'week' ? 'high' : 'medium',
        title: 'Idle Process Cleanup',
        description: `Found ${idleProcesses.length} processes ${analysisContext}: ${idleProcesses.slice(0, 3).map(p => p['Process Name']).join(', ')}${idleProcesses.length > 3 ? '...' : ''}`,
        savings: viewMode === 'week' ? '$300-750/month' : '$200-500/month',
        action: 'Review and terminate unnecessary processes',
        impact: viewMode === 'week' ? 'Free up 8-15% system resources' : 'Free up 5-10% system resources',
        timeframe: '1-2 days',
        difficulty: 'Easy'
      });
    }

    if (underutilizedVMs.length > 0) {
      analysis.cost.push({
        type: 'optimization',
        priority: 'high',
        title: 'VM Consolidation Opportunity',
        description: `${underutilizedVMs.length} VMs are underutilized: ${underutilizedVMs.map(vm => vm.name).join(', ')}`,
        savings: `$${(underutilizedVMs.length * 1800).toLocaleString()}/year`,
        action: 'Merge workloads or downsize VM instances',
        impact: `Consolidate ${underutilizedVMs.length} VMs to save significant costs`,
        timeframe: '2-4 weeks',
        difficulty: 'Medium'
      });
    }

    // SCALING RECOMMENDATIONS
    if (avgCpuUsage > 75 || avgMemoryUsagePercent > 80 || avgGpuUtilization > 85) {
      let resourceDetails = [];
      if (avgCpuUsage > 75) resourceDetails.push(`CPU: ${avgCpuUsage.toFixed(1)}%`);
      if (avgMemoryUsagePercent > 80) resourceDetails.push(`Memory: ${avgMemoryUsagePercent.toFixed(1)}%`);
      if (avgGpuUtilization > 85) resourceDetails.push(`GPU: ${avgGpuUtilization.toFixed(1)}%`);

      analysis.scaling.push({
        type: 'warning',
        priority: 'high',
        title: 'Resource Bottleneck Detected',
        description: `High resource utilization detected (${resourceDetails.join(', ')}). Risk of performance issues.`,
        action: 'Scale up hardware or distribute load',
        impact: 'Prevent performance degradation and system crashes',
        timeframe: '1 week',
        difficulty: 'Medium'
      });
    }

    // GPU-specific scaling recommendation
    if (highGpuUtilProcesses.length > 3 && avgGpuMemoryUsage > 80) {
      analysis.scaling.push({
        type: 'warning',
        priority: 'high',
        title: 'GPU Resource Saturation',
        description: `${highGpuUtilProcesses.length} processes consuming significant GPU resources. GPU memory usage at ${avgGpuMemoryUsage.toFixed(1)}MB.`,
        action: 'Upgrade to higher-tier GPU or add additional GPU units',
        impact: 'Improve ML/AI workload performance and prevent CUDA errors',
        timeframe: '1-2 weeks',
        difficulty: 'Medium'
      });
    }

    if (overutilizedVMs.length > 0) {
      analysis.scaling.push({
        type: 'warning',
        priority: 'high',
        title: 'VM Resource Constraints',
        description: `${overutilizedVMs.length} VMs are overutilized: ${overutilizedVMs.map(vm => `${vm.name} (CPU: ${vm.cpuUsage.toFixed(1)}%, RAM: ${vm.ramUsagePercent.toFixed(1)}%)`).join(', ')}`,
        action: 'Scale up VM resources or load balance',
        impact: 'Prevent VM crashes and improve application performance',
        timeframe: '3-5 days',
        difficulty: 'Easy'
      });
    }

    if (highCpuProcesses.length > 8) {
      analysis.scaling.push({
        type: 'warning',
        priority: 'medium',
        title: 'CPU-Heavy Workload',
        description: `${highCpuProcesses.length} processes consuming high CPU. Top consumers: ${highCpuProcesses.slice(0, 3).map(p => `${p['Process Name']} (${p['CPU Usage (%)'].toFixed(1)}%)`).join(', ')}`,
        action: 'Upgrade to higher CPU count or optimize processes',
        impact: 'Improve overall system responsiveness',
        timeframe: '1-2 weeks',
        difficulty: 'Medium'
      });
    }

    // PERFORMANCE INSIGHTS
    if (topMemoryProcess && topMemoryProcess['Memory Usage (MB)'] > 1000) {
      analysis.performance.push({
        type: 'info',
        priority: 'medium',
        title: 'Memory-Heavy Process Identified',
        description: `${topMemoryProcess['Process Name']} is using ${topMemoryProcess['Memory Usage (MB)']}MB (${topMemoryProcess['Memory Usage (%)']?.toFixed(1)}% of system memory)`,
        action: 'Monitor for memory leaks or optimize application',
        impact: 'Potential for significant memory savings',
        timeframe: '1 week',
        difficulty: 'Medium'
      });
    }

    // GPU performance insights
    if (topGpuProcess && topGpuProcess['GPU Memory (MB)'] > 500) {
      analysis.performance.push({
        type: 'info',
        priority: 'medium',
        title: 'GPU Memory-Heavy Process Identified',
        description: `${topGpuProcess['Process Name']} is using ${topGpuProcess['GPU Memory (MB)']}MB GPU memory (${topGpuProcess['GPU Util %']?.toFixed(1)}% utilization)`,
        action: 'Optimize GPU memory usage or consider batch processing',
        impact: 'Improve GPU efficiency and reduce memory contention',
        timeframe: '1-2 weeks',
        difficulty: 'Medium'
      });
    }

    if (avgGpuUtilization > 50 && avgGpuMemoryUsage < 200) {
      analysis.performance.push({
        type: 'info',
        priority: 'low',
        title: 'GPU Compute vs Memory Imbalance',
        description: `High GPU utilization (${avgGpuUtilization.toFixed(1)}%) but low memory usage (${avgGpuMemoryUsage.toFixed(1)}MB). Workload may benefit from memory optimization.`,
        action: 'Increase batch sizes or optimize memory access patterns',
        impact: 'Better GPU resource utilization and improved throughput',
        timeframe: '1 week',
        difficulty: 'Easy'
      });
    }

    const highIOPSProcesses = processData.filter(p => (p['IOPS'] || 0) > 30);
    if (highIOPSProcesses.length > 3) {
      analysis.performance.push({
        type: 'info',
        priority: 'medium',
        title: 'High Disk I/O Activity',
        description: `${highIOPSProcesses.length} processes with high IOPS (>30). This may indicate disk bottlenecks.`,
        action: 'Migrate to SSD storage or optimize disk access patterns',
        impact: 'Improve application response times by 40-60%',
        timeframe: '2-3 weeks',
        difficulty: 'Hard'
      });
    }

    // SECURITY INSIGHTS
    const suspiciousProcesses = processData.filter(p =>
      p['Open Files'] > 50 || ((p['GPU Util %'] > 0 || p['GPU Memory (MB)'] > 0) && !['chrome', 'steam', 'firefox', 'nvidia', 'cuda'].some(name =>
        p['Process Name']?.toLowerCase().includes(name)))
    );

    if (suspiciousProcesses.length > 0) {
      analysis.security.push({
        type: 'warning',
        priority: 'high',
        title: 'Unusual Process Activity',
        description: `${suspiciousProcesses.length} processes showing unusual resource patterns: ${suspiciousProcesses.slice(0, 2).map(p => p['Process Name']).join(', ')}`,
        action: 'Investigate processes for potential security issues',
        impact: 'Prevent potential security breaches',
        timeframe: '1-2 days',
        difficulty: 'Medium'
      });
    }

    // Cryptocurrency mining detection
    const potentialMiningProcesses = processData.filter(p =>
      (p['GPU Util %'] > 80 && p['GPU Memory (MB)'] > 1000) &&
      !['games', 'blender', 'premiere', 'davinci', 'obs', 'streamlabs'].some(name =>
        p['Process Name']?.toLowerCase().includes(name))
    );

    if (potentialMiningProcesses.length > 0) {
      analysis.security.push({
        type: 'warning',
        priority: 'high',
        title: 'Potential Unauthorized GPU Mining',
        description: `${potentialMiningProcesses.length} processes consuming excessive GPU resources: ${potentialMiningProcesses.slice(0, 2).map(p => `${p['Process Name']} (${p['GPU Util %']}% GPU)`).join(', ')}`,
        action: 'Verify legitimacy of GPU-intensive processes and check for mining software',
        impact: 'Prevent unauthorized resource usage and potential security compromise',
        timeframe: 'Immediate',
        difficulty: 'Easy'
      });
    }

    return analysis;
  };

  const generateHTMLReport = (insightsData) => {
    const { cost, scaling, performance, security, summary } = insightsData;
    const totalRecommendations = cost.length + scaling.length + performance.length + security.length;
    const totalPotentialSavings = cost.reduce((sum, item) => {
      if (item.savings && item.savings.includes('$')) {
        const match = item.savings.match(/\$[\d,]+/);
        if (match) {
          return sum + parseInt(match[0].replace(/[$,]/g, ''));
        }
      }
      return sum;
    }, 0);

    const generateSectionHTML = (title, items, icon, color) => {
      if (items.length === 0) {
        return `
          <div class="insight-section">
            <h3>${title}</h3>
            <div class="no-issues">
              <span class="checkmark">✓</span> No issues detected in this category.
            </div>
          </div>
        `;
      }

      const itemsHTML = items.map((item, index) => `
        <div class="insight-item ${item.priority}-priority">
          <div class="insight-header">
            <h4>${item.title}</h4>
            <span class="priority-badge ${item.priority}">${item.priority.toUpperCase()}</span>
          </div>
          <p class="description">${item.description}</p>
          <div class="insight-details">
            <div class="detail-row">
              <strong>Action:</strong> ${item.action}
            </div>
            <div class="detail-row">
              <strong>Impact:</strong> ${item.impact}
            </div>
            <div class="detail-row">
              <strong>Timeframe:</strong> ${item.timeframe}
            </div>
            <div class="detail-row">
              <strong>Difficulty:</strong> ${item.difficulty}
            </div>
            ${item.savings ? `
            <div class="detail-row savings">
              <strong>Potential Savings:</strong> ${item.savings}
            </div>
            ` : ''}
          </div>
        </div>
      `).join('');

      return `
        <div class="insight-section">
          <h3>${title} <span class="count">(${items.length})</span></h3>
          ${itemsHTML}
        </div>
      `;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HPE GreenMatrix - System Insights Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            color: #1f2937;
            line-height: 1.5;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            background: white;
            padding: 40px;
        }

        .report-header h1 {
            color: #111827;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
        }

        .report-header .subtitle {
            color: #6b7280;
            margin: 8px 0;
            font-size: 16px;
            opacity: 1;
        }
        
        .report-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .meta-item {
            text-align: center;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px 20px;
            border-radius: 8px;
        }

        .meta-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .meta-value {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }
        
        .report-summary {
            padding: 30px 40px;
            background: white;
            border-bottom: 1px solid #e5e7eb;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }

        .summary-card {
            border: 1px solid #d1d5db;
            padding: 20px;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .summary-card h4 {
            margin: 0 0 15px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
        }

        .summary-card .value {
            font-size: 28px;
            font-weight: 700;
            color: #10b981;
        }
        
        .report-content {
            padding: 40px;
        }

        .section {
            margin: 30px 0;
        }

        .section h2 {
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
        }

        .card {
            border: 1px solid #d1d5db;
            padding: 20px;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card h3 {
            margin: 0 0 15px 0;
            color: #111827;
            font-size: 16px;
            font-weight: 600;
        }

        .metric {
            margin: 8px 0;
            color: #374151;
        }

        .metric strong {
            color: #10b981;
            font-weight: 600;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        .table th, .table td {
            border: 1px solid #e5e7eb;
            padding: 12px 8px;
            text-align: left;
        }

        .table th {
            background-color: #f9fafb;
            color: #374151;
            font-weight: 600;
        }
        
        .insight-section {
            margin-bottom: 50px;
        }
        
        .insight-section h3 {
            font-size: 1.5em;
            color: #2d3748;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .count {
            background: #e2e8f0;
            color: #64748b;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
        }
        
        .insight-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .insight-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .insight-header {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            margin-bottom: 15px;
            gap: 15px;
        }
        
        .insight-header h4 {
            font-size: 1.2em;
            color: #2d3748;
            flex: 1;
        }
        
        .priority-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .high { background: #fee2e2; color: #dc2626; border-left-color: #dc2626; }
        .medium { background: #fef3c7; color: #d97706; border-left-color: #d97706; }
        .low { background: #dbeafe; color: #2563eb; border-left-color: #2563eb; }
        
        .description {
            color: #4a5568;
            margin-bottom: 20px;
            font-size: 1.05em;
        }
        
        .insight-details {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .detail-row {
            margin-bottom: 12px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        
        .detail-row:last-child {
            margin-bottom: 0;
        }
        
        .detail-row strong {
            min-width: 120px;
            color: #2d3748;
            font-weight: 600;
        }
        
        .savings {
            background: #f0fdf4;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #bbf7d0;
        }
        
        .savings strong {
            color: #01a982;
        }
        
        .no-issues {
            background: #f0fdf4;
            color: #01a982;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #bbf7d0;
        }
        
        .checkmark {
            font-size: 1.2em;
            margin-right: 8px;
        }
        
        .report-footer {
            background: #2d3748;
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .report-footer p {
            opacity: 0.8;
            margin-bottom: 10px;
        }
        
        @media print {
            body { background: white; padding: 0; }
            .report-container { box-shadow: none; border-radius: 0; }
            .insight-item:hover { transform: none; }
        }
        
        @media (max-width: 768px) {
            .report-meta { flex-direction: column; gap: 15px; }
            .summary-grid { grid-template-columns: 1fr; }
            .insight-header { flex-direction: column; align-items: flex-start; }
            .detail-row { flex-direction: column; gap: 5px; }
            .detail-row strong { min-width: auto; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>GreenMatrix System Analysis Report</h1>
            <div class="subtitle">Host Infrastructure Performance & Optimization Analysis</div>
            <div class="report-meta">
                <div class="meta-item">
                    <div class="meta-label">Analysis Date</div>
                    <div class="meta-value">${summary.analysisDate}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Analysis Time</div>
                    <div class="meta-value">${summary.analysisTime}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Analysis Type</div>
                    <div class="meta-value">${summary.analysisDescription}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Total Recommendations</div>
                    <div class="meta-value">${totalRecommendations}</div>
                </div>
                ${totalPotentialSavings > 0 ? `
                <div class="meta-item">
                    <div class="meta-label">Potential Annual Savings</div>
                    <div class="meta-value">$${totalPotentialSavings.toLocaleString()}+</div>
                </div>
                ` : ''}
            </div>
        </header>

        <section class="report-summary">
            <h2 style="margin-bottom: 20px; color: #374151;">Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Host CPU Utilization</h4>
                    <div class="value">${summary.hostCpuUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host Memory Utilization</h4>
                    <div class="value">${summary.hostRamUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host GPU Utilization</h4>
                    <div class="value">${summary.hostGpuUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host GPU Memory</h4>
                    <div class="value">${summary.hostGpuMemoryUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>GPU Temperature</h4>
                    <div class="value">${summary.hostGpuTemperature}°C</div>
                </div>
                <div class="summary-card">
                    <h4>GPU Power Draw</h4>
                    <div class="value">${summary.hostGpuPowerDraw}W</div>
                </div>
                <div class="summary-card">
                    <h4>Running Virtual Machines</h4>
                    <div class="value">${summary.runningVMs}</div>
                </div>
                <div class="summary-card">
                    <h4>Total Virtual Machines</h4>
                    <div class="value">${summary.runningVMs + summary.stoppedVMs}</div>
                </div>
            </div>
        </section>

        <main class="report-content">
            ${validProcessData.length > 0 ? `
                <div class="section">
                    <h2>Top Resource Consuming Processes</h2>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Process Name</th>
                                <th>CPU Usage (%)</th>
                                <th>Memory Usage (MB)</th>
                                <th>GPU Utilization (%)</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${validProcessData.map(process => `
                                <tr>
                                    <td>${process['Process Name'] || 'N/A'}</td>
                                    <td>${(process['CPU Usage (%)'] || 0).toFixed(1)}</td>
                                    <td>${(process['Memory Usage (MB)'] || 0).toFixed(0)}</td>
                                    <td>${(process['GPU Util %'] || 0).toFixed(1)}</td>
                                    <td>${process['Status'] || 'Unknown'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            ${generateSectionHTML('Cost Optimization', cost, 'dollar-icon', '#10b981')}
            ${generateSectionHTML('Scaling Recommendations', scaling, 'scale-icon', '#2563eb')}
            ${generateSectionHTML('Performance Insights', performance, 'performance-icon', '#7c3aed')}
            ${generateSectionHTML('Security & Maintenance', security, 'security-icon', '#dc2626')}

            <div class="section">
                <h2>Methodology</h2>
                <div class="card">
                    <h3>Analysis Details</h3>
                    <div class="metric"><strong>Data Collection Period:</strong> ${summary.analysisDescription}</div>
                    <div class="metric"><strong>Processes Analyzed:</strong> ${summary.totalProcesses}</div>
                    <div class="metric"><strong>Virtual Machines Monitored:</strong> ${summary.runningVMs + summary.stoppedVMs}</div>
                    <div class="metric"><strong>Sampling Method:</strong> Real-time monitoring with comprehensive resource tracking</div>
                    <div class="metric"><strong>Recommendation Engine:</strong> AI-powered analysis based on current patterns and industry best practices</div>
                    <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                        This report is generated using GreenMatrix's advanced analytics engine, which analyzes real-time performance data
                        from host infrastructure to identify optimization opportunities and cost-saving potential. Recommendations are based on actual resource
                        consumption patterns, process efficiency metrics, and infrastructure utilization benchmarks.
                    </p>
                </div>
            </div>
        </main>

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Hewlett Packard Enterprise Development LP</p>
            <p>Generated by GreenMatrix System Intelligence Engine</p>
            <p>Report ID: SYS-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}</p>
        </div>
    </div>
</body>
</html>
    `;
  };

  const handleDownloadReport = () => {
    const insightsData = generateInsightsData();
    const htmlContent = generateHTMLReport(insightsData);

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const dateLabel = viewMode === 'week' ? `Week_Analysis` :
      selectedDate === 'today' ? 'Latest' : selectedDate.replace(/-/g, '');

    a.href = url;
    a.download = `HPE_GreenMatrix_Insights_${dateLabel}_${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewData = generateInsightsData();
  const totalRecommendations = previewData.cost.length + previewData.scaling.length +
    previewData.performance.length + previewData.security.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl flex flex-col h-full">
      {/* Header (Top Left) */}
      <h3 className="text-[24px] font-normal text-gray-900 dark:text-white break-words mb-6">
        System Insights & Recommendations
      </h3>

      {/* Middle Content (Metrics Grid) */}
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full text-left justify-between">
          <div className="space-y-2">
            <div className="text-[21px] font-medium text-gray-900 dark:text-gray-400">Cost Savings</div>
            <div className="text-lg font-medium text-emerald-900 dark:text-white">
              $ {previewData.cost.reduce((sum, item) => sum + (parseInt(item.savings?.replace(/[$,]/g, '') || 0)), 0)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[21px] font-medium text-gray-900 dark:text-gray-400">Scaling</div>
            <div className="text-lg font-medium text-emerald-900 dark:text-white">
              {previewData.scaling.length} recommendations
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[21px] font-medium text-gray-900 dark:text-gray-400">Performance</div>
            <div className="text-lg font-medium text-emerald-900 dark:text-white">
              {previewData.performance.length} insights
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[21px] font-medium text-gray-900 dark:text-gray-400">Security</div>
            <div className="text-lg font-medium text-emerald-900 dark:text-white">
              {previewData.security.length} alerts
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-5 py-2 border-2 border-[#01a982] text-black font-medium rounded-full hover:bg-[#01a982] hover:text-white transition-colors"
        >
          <span className="hidden sm:inline">Recommendations</span>
          <Download className="w-4 h-4" />
          <span className="sm:hidden">Report</span>
        </button>
      </div>
    </div>

  );
};

export default SystemInsightsGenerator;