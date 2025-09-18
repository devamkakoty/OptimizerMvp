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

    // Store summary metrics including GPU and host overall metrics
    analysis.summary = {
      totalProcesses: validProcessData.length,
      avgCpuUsage: avgCpuUsage.toFixed(1),
      avgMemoryUsage: avgMemoryUsagePercent.toFixed(1),
      totalMemoryMB: totalMemoryUsage.toFixed(0),
      avgGpuMemoryUsage: avgGpuMemoryUsage.toFixed(1),
      avgGpuUtilization: avgGpuUtilization.toFixed(1),
      runningVMs: runningVMs.length,
      stoppedVMs: validVmData.length - runningVMs.length,
      vmCpuAvg: vmCpuAvg.toFixed(1),
      vmRamAvg: vmRamAvg.toFixed(1),

      // Host Overall Metrics - Current System State
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
    const topMemoryProcess = processData.reduce((max, p) => 
      (p['Memory Usage (MB)'] || 0) > (max['Memory Usage (MB)'] || 0) ? p : max, processData[0] || {});
    
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
    const topGpuProcess = processData.reduce((max, p) => 
      (p['GPU Memory (MB)'] || 0) > (max['GPU Memory (MB)'] || 0) ? p : max, processData[0] || {});
    
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
            <h3><span class="${icon}"></span> ${title}</h3>
            <div class="no-issues">
              <span class="checkmark">✓</span> All good! No issues detected in this category.
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
          <h3><span class="${icon}"></span> ${title} <span class="count">(${items.length})</span></h3>
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .report-header {
            background: linear-gradient(135deg, #01a982 0%, #00d4aa 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .report-header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .report-header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .report-meta {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .meta-item {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 15px 25px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        
        .meta-label {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        
        .meta-value {
            font-size: 1.4em;
            font-weight: 600;
        }
        
        .report-summary {
            padding: 40px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #01a982;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .summary-card h4 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-card .value {
            font-size: 1.8em;
            font-weight: 700;
            color: #01a982;
        }
        
        .report-content {
            padding: 40px;
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
            <h1>HPE GreenMatrix</h1>
            <div class="subtitle">System Insights & Optimization Report</div>
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
            <h2 style="margin-bottom: 20px; color: #2d3748;">System Overview</h2>
            ${summary.viewMode === 'week' ? `
            <div style="background: #e0f7fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #01a982;">
                <h4 style="color: #00695c; margin-bottom: 10px;">📊 Weekly Analysis Methodology</h4>
                <p style="color: #004d40; font-size: 14px; margin: 0;">
                    This report analyzes aggregated data over a 7-day period. Process metrics represent averages across all days, 
                    providing insights into consistent patterns and persistent issues. Weekly analysis offers more reliable 
                    recommendations for infrastructure changes as it smooths out daily variations.
                </p>
            </div>
            ` : `
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
                <h4 style="color: #e65100; margin-bottom: 10px;">📊 Daily Analysis Methodology</h4>
                <p style="color: #bf360c; font-size: 14px; margin: 0;">
                    This report analyzes system data from a single day snapshot. Insights reflect current system state 
                    and immediate optimization opportunities. For infrastructure decisions, consider weekly analysis 
                    for more stable patterns.
                </p>
            </div>
            `}
            <h3 style="margin-bottom: 15px; color: #2d3748;">Current Host System Metrics</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Host CPU Utilization</h4>
                    <div class="value">${summary.hostCpuUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host RAM Utilization</h4>
                    <div class="value">${summary.hostRamUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host GPU Utilization</h4>
                    <div class="value">${summary.hostGpuUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Host GPU Memory Utilization</h4>
                    <div class="value">${summary.hostGpuMemoryUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>GPU Temperature</h4>
                    <div class="value">${summary.hostGpuTemperature}°C</div>
                </div>
                <div class="summary-card">
                    <h4>GPU Power Consumption</h4>
                    <div class="value">${summary.hostGpuPowerDraw}W</div>
                </div>
                <div class="summary-card">
                    <h4>Network I/O Total</h4>
                    <div class="value">${summary.hostNetworkTotal}GB</div>
                </div>
                <div class="summary-card">
                    <h4>Disk I/O Total</h4>
                    <div class="value">${summary.hostDiskTotal}GB</div>
                </div>
            </div>

            <h3 style="margin: 30px 0 15px 0; color: #2d3748;">Process and Virtual Machine Analysis</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Total Active Processes</h4>
                    <div class="value">${summary.totalProcesses}</div>
                </div>
                <div class="summary-card">
                    <h4>Average Process CPU Usage</h4>
                    <div class="value">${summary.avgCpuUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Average Process Memory Usage</h4>
                    <div class="value">${summary.avgMemoryUsage}%</div>
                </div>
                <div class="summary-card">
                    <h4>Running Virtual Machines</h4>
                    <div class="value">${summary.runningVMs}</div>
                </div>
                <div class="summary-card">
                    <h4>VM CPU Average</h4>
                    <div class="value">${summary.vmCpuAvg}%</div>
                </div>
                <div class="summary-card">
                    <h4>VM RAM Average</h4>
                    <div class="value">${summary.vmRamAvg}%</div>
                </div>
                <div class="summary-card">
                    <h4>Average Process GPU Memory</h4>
                    <div class="value">${summary.avgGpuMemoryUsage}MB</div>
                </div>
                <div class="summary-card">
                    <h4>Average Process GPU Utilization</h4>
                    <div class="value">${summary.avgGpuUtilization}%</div>
                </div>
            </div>
        </section>

        <main class="report-content">
            ${generateSectionHTML('💰 Cost Optimization', cost, 'dollar-icon', '#01a982')}
            ${generateSectionHTML('📈 Scaling Recommendations', scaling, 'scale-icon', '#2563eb')}
            ${generateSectionHTML('⚡ Performance Insights', performance, 'performance-icon', '#7c3aed')}
            ${generateSectionHTML('🔒 Security & Maintenance', security, 'security-icon', '#dc2626')}
        </main>

        <footer class="report-footer">
            <p>Generated by HPE GreenMatrix System Intelligence</p>
            <p>© ${new Date().getFullYear()} Hewlett Packard Enterprise Development LP</p>
        </footer>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 break-words">
            System Insights & Recommendations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            AI-powered analysis with {totalRecommendations} actionable recommendations
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-[#01a982] hover:bg-[#019670] text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Recommendations</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Cost Savings</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            $ {previewData.cost.reduce((sum, item) => sum + (parseInt(item.savings?.replace(/[$,]/g, '') || 0)), 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {previewData.cost.length} opportunities
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Scaling</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {previewData.scaling.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            recommendations
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {previewData.performance.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            insights
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Security</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {previewData.security.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            alerts
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemInsightsGenerator;