import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import SystemInsightsGenerator from './SystemInsightsGenerator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const AdminDashboard = ({ processData, chartOptions, viewMode, selectedDate, selectedWeek, availableDates }) => {
  // State for cost and power data
  const [costData, setCostData] = useState(null);
  const [powerMetrics, setPowerMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  
  // New state for UI enhancements
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [showHardwareOverview, setShowHardwareOverview] = useState(true);
  const [showProcessDetails, setShowProcessDetails] = useState(true);
  const [showPowerOverview, setShowPowerOverview] = useState(true);
  const [showCharts, setShowCharts] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showVMs, setShowVMs] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processRecommendations, setProcessRecommendations] = useState({});

  // Helper function to create clean chart options
  const createCleanChartOptions = (yAxisLabel, chartType = 'bar') => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        titleFont: { size: 12 },
        bodyFont: { size: 11 }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          font: { size: 10 },
          maxTicksLimit: 5
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel,
          font: { size: 11 }
        },
        ticks: {
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4
      },
      point: {
        radius: 0,
        hoverRadius: 4
      },
      line: {
        borderWidth: 2,
        tension: chartType === 'line' ? 0.4 : 0
      }
    }
  });

  // Fetch cost data from API
  const fetchCostData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/costs/process-summary?limit=50');
      const data = await response.json();
      if (data.success) {
        setCostData(data);
      }
    } catch (err) {
      console.error('Error fetching cost data:', err);
      setError('Failed to fetch cost data');
    }
  };

  // Fetch power metrics and recommendations
  const fetchPowerMetrics = async () => {
    try {
      setLoading(true);
      // Fetch top energy processes
      const energyResponse = await fetch('http://localhost:8000/api/recommendations/top-energy-processes?time_range_days=7&limit=10');
      const energyData = await energyResponse.json();
      
      if (energyData.success) {
        setPowerMetrics(energyData);
      }

      // Fetch recommendations
      const recResponse = await fetch('http://localhost:8000/api/recommendations/cross-region?time_range_days=7');
      const recData = await recResponse.json();
      
      if (recData.success) {
        setRecommendations(recData);
      }
    } catch (err) {
      console.error('Error fetching power metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCostData();
    fetchPowerMetrics();
    fetchRealProcessData();
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchRealProcessData();
      fetchCostData();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(4) || '0.0000'}`;
  };

  // Fetch real process metrics with power data
  const [realProcessData, setRealProcessData] = useState([]);

  const fetchRealProcessData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/host-process-metrics?limit=50');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform API data to match the expected format
        const transformedData = data.data.map(metric => ({
          'Process Name': metric.process_name || 'Unknown',
          'Process ID': metric.process_id,
          'CPU Usage (%)': metric.cpu_usage_percent || 0,
          'Memory Usage (MB)': metric.memory_usage_mb || 0,
          'Memory Usage (%)': metric.memory_usage_percent || 0,
          'IOPS': metric.iops || 0,
          'GPU Memory Usage (MB)': metric.gpu_memory_usage_mb || 0,
          'GPU Utilization (%)': metric.gpu_utilization_percent || 0,
          'Open Files': metric.open_files || 0,
          'Status': metric.status || 'Running',
          'Power Consumption (W)': metric.estimated_power_watts ? metric.estimated_power_watts.toFixed(2) : '0.00',
          'Energy Cost ($)': metric.estimated_power_watts ? (metric.estimated_power_watts * 0.00012).toFixed(4) : '0.0000' // Simple cost calculation
        }));
        setRealProcessData(transformedData);
      }
    } catch (err) {
      console.error('Error fetching real process data:', err);
    }
  };

  // Available regions for cost calculation
  const availableRegions = [
    { code: 'US', name: 'United States', currency: 'USD', rate: 0.12 },
    { code: 'EU', name: 'Europe', currency: 'EUR', rate: 0.20 },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP', rate: 0.18 },
    { code: 'CA', name: 'Canada', currency: 'CAD', rate: 0.08 },
    { code: 'AP', name: 'Asia Pacific', currency: 'USD', rate: 0.15 },
    { code: 'JP', name: 'Japan', currency: 'JPY', rate: 0.25 },
  ];
  
  // Get current region info
  const currentRegion = availableRegions.find(r => r.code === selectedRegion) || availableRegions[0];
  
  // Use real data if available, otherwise fall back to simulated data
  const enhancedProcessData = realProcessData.length > 0 ? realProcessData.map(process => ({
    ...process,
    'Energy Cost ($)': (parseFloat(process['Power Consumption (W)']) * currentRegion.rate * 0.001).toFixed(4)
  })) : 
    processData.map(process => ({
      ...process,
      'Power Consumption (W)': (Math.random() * 50 + 5).toFixed(2), // Simulated fallback
      'Energy Cost ($)': (Math.random() * 0.5 + 0.01).toFixed(4) // Simulated fallback
    }));

  // Calculate real-time overview metrics from current process data
  const calculateOverviewMetrics = () => {
    if (realProcessData.length === 0) return { totalPower: 0, totalCost: 0, topProcess: null };
    
    const totalPower = realProcessData.reduce((sum, proc) => {
      return sum + (parseFloat(proc['Power Consumption (W)']) || 0);
    }, 0);
    
    const totalCost = realProcessData.reduce((sum, proc) => {
      return sum + (parseFloat(proc['Energy Cost ($)']) || 0);
    }, 0);
    
    // Find top power consuming process
    const topProcess = realProcessData.reduce((max, proc) => {
      const power = parseFloat(proc['Power Consumption (W)']) || 0;
      const maxPower = parseFloat(max['Power Consumption (W)']) || 0;
      return power > maxPower ? proc : max;
    }, realProcessData[0]);
    
    return { 
      totalPower: totalPower.toFixed(2), 
      totalCost: totalCost.toFixed(4), 
      topProcess,
      processCount: realProcessData.length
    };
  };

  const overviewMetrics = calculateOverviewMetrics();
  
  // Reusable toggle button component
  const ToggleButton = ({ isVisible, onToggle }) => (
    <button
      onClick={onToggle}
      className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
    >
      {isVisible ? (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          Hide
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Show
        </>
      )}
    </button>
  );
  
  // Generate process-specific recommendations
  const generateProcessRecommendations = (processName, power, cost) => {
    const recommendations = [];
    
    if (parseFloat(power) > 30) {
      recommendations.push({
        type: 'optimization',
        title: 'High Power Consumption',
        description: 'This process is consuming significant power. Consider optimizing or scheduling during off-peak hours.',
        priority: 'high',
        savings: '15-25%'
      });
    }
    
    if (parseFloat(cost) > 0.01) {
      recommendations.push({
        type: 'cost',
        title: 'Cost Optimization',
        description: `Moving to region CA could reduce costs by ${((parseFloat(cost) - parseFloat(cost) * 0.67) * 100).toFixed(0)}%.`,
        priority: 'medium',
        savings: '33%'
      });
    }
    
    recommendations.push({
      type: 'scheduling',
      title: 'Workload Scheduling',
      description: 'Consider scheduling non-critical tasks during low-cost hours (12 AM - 6 AM).',
      priority: 'low',
      savings: '10-15%'
    });
    
    return recommendations;
  };
  
  // Handle process selection
  const handleProcessClick = (process) => {
    if (selectedProcess && selectedProcess['Process ID'] === process['Process ID']) {
      setSelectedProcess(null);
    } else {
      setSelectedProcess(process);
      const recs = generateProcessRecommendations(
        process['Process Name'], 
        process['Power Consumption (W)'], 
        process['Energy Cost ($)']
      );
      setProcessRecommendations({
        ...processRecommendations,
        [process['Process ID']]: recs
      });
    }
  };
  // State for real VM data
  const [vmData, setVmData] = useState([]);
  const [vmDataLoading, setVmDataLoading] = useState(true);
  const [expandedVM, setExpandedVM] = useState(null);
  const [vmProcessData, setVmProcessData] = useState({});

  // Fetch real VM data from API
  const fetchVMData = async () => {
    try {
      setVmDataLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/metrics/vms/active');
      const data = await response.json();
      
      if (data.success && data.active_vms) {
        // Transform API data to match UI expectations
        const transformedVMs = await Promise.all(
          data.active_vms.map(async (vm) => {
            try {
              // Get detailed metrics for each VM
              const summaryResponse = await fetch(`http://localhost:8000/api/v1/metrics/vm/${encodeURIComponent(vm.vm_name)}/summary?hours=1`);
              const summaryData = await summaryResponse.json();
              
              return {
                id: vm.vm_name,
                name: vm.vm_name,
                type: vm.vm_name.includes('Web') ? 'Web Server' : 
                      vm.vm_name.includes('DB') ? 'Database' : 
                      vm.vm_name.includes('App') ? 'Application' : 'Virtual Machine',
                status: 'Running',
                cpuUsage: summaryData.success ? summaryData.metrics?.avg_cpu_usage || 0 : 0,
                ramUsagePercent: summaryData.success ? summaryData.metrics?.avg_memory_usage || 0 : 0,
                lastSeen: vm.last_seen ? new Date(vm.last_seen).toLocaleString() : 'Unknown',
                processCount: vm.process_count || 0,
                totalPower: summaryData.success ? summaryData.metrics?.total_power_consumption?.toFixed(2) || '0.00' : '0.00'
              };
            } catch (error) {
              console.error(`Error fetching details for VM ${vm.vm_name}:`, error);
              return {
                id: vm.vm_name,
                name: vm.vm_name,
                type: 'Virtual Machine',
                status: 'Running',
                cpuUsage: 0,
                ramUsagePercent: 0, 
                lastSeen: vm.last_seen ? new Date(vm.last_seen).toLocaleString() : 'Unknown',
                processCount: vm.process_count || 0,
                totalPower: '0.00'
              };
            }
          })
        );
        
        setVmData(transformedVMs);
      } else {
        setVmData([]);
      }
    } catch (error) {
      console.error('Error fetching VM data:', error);
      setVmData([]);
    } finally {
      setVmDataLoading(false);
    }
  };

  // Fetch individual VM process data
  const fetchVMProcessData = async (vmName) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/metrics/vm/${encodeURIComponent(vmName)}/processes?limit=50`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setVmProcessData(prev => ({
          ...prev,
          [vmName]: data.data
        }));
      }
    } catch (error) {
      console.error(`Error fetching process data for VM ${vmName}:`, error);
    }
  };

  // Fetch VM data on component mount and when dates change
  useEffect(() => {
    fetchVMData();
    const interval = setInterval(fetchVMData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedDate]);
  const handleDownloadReport = () => {
    // Generate current timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const viewLabel = viewMode === 'week' ? `Week${(selectedWeek || 0) + 1}` : 
                     selectedDate === 'today' ? 'Latest' : selectedDate.replace(/-/g, '');
    const filename = `HPE_Admin_Report_${viewLabel}_${timestamp}.html`;
    
    // Create a comprehensive report data object
    const reportData = {
      generatedAt: new Date().toLocaleString(),
      viewMode,
      selectedPeriod: viewMode === 'week' ? 
        `Week ${(selectedWeek || 0) + 1} (Average of 7 days)` :
        selectedDate === 'today' ? 
          `Latest Data (${availableDates ? new Date(availableDates[availableDates.length - 1]).toLocaleDateString() : ''})` :
          new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
      hardwareInfo: {
        cpu: {
          model: 'Intel i7-9750H',
          cores: '6 (12 logical)',
          baseFreq: '2.60GHz',
          maxFreq: '2.6GHz',
          family: '6'
        },
        gpu: {
          model: 'GTX 1660 Ti',
          vendor: 'NVIDIA',
          version: 'v576.57',
          vram: '6GB',
          used: '247MB',
          temperature: '51°C',
          power: '24.5W',
          cores: '1536',
          load: '0%'
        },
        ram: {
          total: '15.8GB',
          used: '13.6GB',
          available: '2.2GB',
          usage: '86.0%'
        },
        storage: {
          total: '466GB',
          used: '421GB',
          free: '45GB',
          usage: '90.4%'
        },
        os: {
          name: 'Windows',
          version: '10.0.22631',
          architecture: '64-bit',
          build: '22631',
          platform: 'x64'
        }
      },
      processData: processData,
      summary: {
        totalProcesses: processData.length,
        highCpuProcesses: processData.filter(p => p['CPU Usage (%)'] > 5).length,
        totalMemoryUsage: processData.reduce((sum, p) => sum + p['Memory Usage (MB)'], 0).toFixed(2),
        averageCpuUsage: (processData.reduce((sum, p) => sum + p['CPU Usage (%)'], 0) / processData.length).toFixed(2),
        totalIOPS: processData.reduce((sum, p) => sum + p['IOPS'], 0),
        totalGpuMemory: processData.reduce((sum, p) => sum + (p['GPU Memory Usage (MB)'] || 0), 0).toFixed(2),
        averageGpuUtilization: processData.filter(p => p['GPU Utilization (%)'] > 0).length > 0 ? 
          (processData.reduce((sum, p) => sum + (p['GPU Utilization (%)'] || 0), 0) / processData.filter(p => p['GPU Utilization (%)'] > 0).length).toFixed(2) : 
          '0.00',
        totalPowerConsumption: enhancedProcessData.reduce((sum, p) => sum + parseFloat(p['Power Consumption (W)']), 0).toFixed(2),
        totalEnergyCost: enhancedProcessData.reduce((sum, p) => sum + parseFloat(p['Energy Cost ($)']), 0).toFixed(4)
      }
    };

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HPE Admin Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #01a982; padding-bottom: 20px; }
          .header h1 { color: #01a982; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .section { margin: 20px 0; }
          .section h2 { color: #01a982; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .hardware-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
          .hardware-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9; }
          .hardware-card h3 { margin: 0 0 10px 0; color: #333; }
          .hardware-card .metric { margin: 5px 0; }
          .hardware-card .metric strong { color: #01a982; }
          .process-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .process-table th, .process-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .process-table th { background-color: #01a982; color: white; }
          .process-table tr:nth-child(even) { background-color: #f2f2f2; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
          .summary-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f0fdf4; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #01a982; }
          .summary-card .label { color: #666; font-size: 14px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HPE Admin Dashboard Report</h1>
          <p>Generated on: ${reportData.generatedAt}</p>
          <p>Data Period: ${reportData.selectedPeriod}</p>
          <p>View Mode: ${reportData.viewMode === 'week' ? 'Weekly Average' : 'Daily Snapshot'}</p>
          <p>System Performance & Hardware Analytics</p>
        </div>

        <div class="section">
          <h2>Executive Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${reportData.summary.totalProcesses}</div>
              <div class="label">Active Processes</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.highCpuProcesses}</div>
              <div class="label">High CPU Processes</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.totalMemoryUsage} MB</div>
              <div class="label">Total Memory Usage</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.averageCpuUsage}%</div>
              <div class="label">Average CPU Usage</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.totalIOPS}</div>
              <div class="label">Total IOPS</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.totalGpuMemory} MB</div>
              <div class="label">Total GPU Memory</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.averageGpuUtilization}%</div>
              <div class="label">Avg GPU Utilization</div>
            </div>
            <div class="summary-card">
              <div class="value">${reportData.summary.totalPowerConsumption}W</div>
              <div class="label">Total Power Consumption</div>
            </div>
            <div class="summary-card">
              <div class="value">$${reportData.summary.totalEnergyCost}</div>
              <div class="label">Total Energy Cost</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Hardware Overview</h2>
          <div class="hardware-grid">
            <div class="hardware-card">
              <h3>CPU</h3>
              <div class="metric"><strong>Model:</strong> ${reportData.hardwareInfo.cpu.model}</div>
              <div class="metric"><strong>Cores:</strong> ${reportData.hardwareInfo.cpu.cores}</div>
              <div class="metric"><strong>Base Freq:</strong> ${reportData.hardwareInfo.cpu.baseFreq}</div>
              <div class="metric"><strong>Max Freq:</strong> ${reportData.hardwareInfo.cpu.maxFreq}</div>
            </div>
            <div class="hardware-card">
              <h3>GPU</h3>
              <div class="metric"><strong>Model:</strong> ${reportData.hardwareInfo.gpu.model}</div>
              <div class="metric"><strong>Cores:</strong> ${reportData.hardwareInfo.gpu.cores}</div>
              <div class="metric"><strong>Load:</strong> ${reportData.hardwareInfo.gpu.load}</div>
              <div class="metric"><strong>Temperature:</strong> ${reportData.hardwareInfo.gpu.temperature}</div>
              <div class="metric"><strong>Power:</strong> ${reportData.hardwareInfo.gpu.power}</div>
            </div>
            <div class="hardware-card">
              <h3>VRAM</h3>
              <div class="metric"><strong>Total:</strong> ${reportData.hardwareInfo.gpu.vram}</div>
              <div class="metric"><strong>Used:</strong> ${reportData.hardwareInfo.gpu.used}</div>
              <div class="metric"><strong>Available:</strong> 5.75GB</div>
              <div class="metric"><strong>Usage:</strong> 4.1%</div>
            </div>
            <div class="hardware-card">
              <h3>Memory</h3>
              <div class="metric"><strong>Total:</strong> ${reportData.hardwareInfo.ram.total}</div>
              <div class="metric"><strong>Used:</strong> ${reportData.hardwareInfo.ram.used}</div>
              <div class="metric"><strong>Available:</strong> ${reportData.hardwareInfo.ram.available}</div>
              <div class="metric"><strong>Usage:</strong> ${reportData.hardwareInfo.ram.usage}</div>
            </div>
            <div class="hardware-card">
              <h3>Storage</h3>
              <div class="metric"><strong>Total:</strong> ${reportData.hardwareInfo.storage.total}</div>
              <div class="metric"><strong>Used:</strong> ${reportData.hardwareInfo.storage.used}</div>
              <div class="metric"><strong>Free:</strong> ${reportData.hardwareInfo.storage.free}</div>
              <div class="metric"><strong>Usage:</strong> ${reportData.hardwareInfo.storage.usage}</div>
            </div>
            <div class="hardware-card">
              <h3>Operating System</h3>
              <div class="metric"><strong>OS:</strong> ${reportData.hardwareInfo.os.name}</div>
              <div class="metric"><strong>Version:</strong> ${reportData.hardwareInfo.os.version}</div>
              <div class="metric"><strong>Architecture:</strong> ${reportData.hardwareInfo.os.architecture}</div>
              <div class="metric"><strong>Build:</strong> ${reportData.hardwareInfo.os.build}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Top Processes by Memory Usage</h2>
          <table class="process-table">
            <thead>
              <tr>
                <th>Process Name</th>
                <th>PID</th>
                <th>CPU %</th>
                <th>Memory (MB)</th>
                <th>Memory %</th>
                <th>IOPS</th>
                <th>GPU Memory (MB)</th>
                <th>GPU Util %</th>
                <th>Power (W)</th>
                <th>Cost ($)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${enhancedProcessData.map(process => `
                <tr>
                  <td>${process['Process Name']}</td>
                  <td>${process['Process ID']}</td>
                  <td>${process['CPU Usage (%)']}%</td>
                  <td>${process['Memory Usage (MB)'].toFixed(2)}</td>
                  <td>${process['Memory Usage (%)'].toFixed(2)}%</td>
                  <td>${process['IOPS']}</td>
                  <td>${process['GPU Memory Usage (MB)'] || 0}</td>
                  <td>${process['GPU Utilization (%)'] || 0}%</td>
                  <td>${process['Power Consumption (W)']}W</td>
                  <td>$${process['Energy Cost ($)']}</td>
                  <td>${process['Status']}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Hewlett Packard Enterprise Development LP - Admin Portal</p>
          <p>This report was generated automatically by the HPE Green Matrix Admin Dashboard</p>
        </div>
      </body>
      </html>
    `;

    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-8">
      
      {/* Region Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost Calculation Region:</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-600 focus:border-green-600 min-w-64"
          >
            {availableRegions.map(region => (
              <option key={region.code} value={region.code}>
                {region.name} ({region.currency} ${region.rate}/kWh)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Process Details Section - Moved to Top - 60% Visual Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Process Performance & Cost Analysis</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Click on any process to see optimization recommendations</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">Region: <span className="font-semibold text-blue-600">{currentRegion.name}</span></div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Rate: <span className="font-semibold">{currentRegion.currency} ${currentRegion.rate}/kWh</span></div>
              </div>
              <ToggleButton 
                isVisible={showProcessDetails} 
                onToggle={() => setShowProcessDetails(!showProcessDetails)} 
              />
            </div>
          </div>
        </div>
        
        {showProcessDetails && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Process</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU %</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory (MB)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Power (W)</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cost ({currentRegion.currency})</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {enhancedProcessData.map((process, index) => (
                <React.Fragment key={process['Process ID']}>
                  <tr 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${selectedProcess && selectedProcess['Process ID'] === process['Process ID'] ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    onClick={() => handleProcessClick(process)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {process['Process Name']}
                        </div>
                        {selectedProcess && selectedProcess['Process ID'] === process['Process ID'] && (
                          <svg className="w-4 h-4 ml-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {process['Process ID']}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                        {process['CPU Usage (%)']}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process['Memory Usage (MB)'].toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                        {process['Power Consumption (W)']}W
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                        {process['Energy Cost ($)']}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                        {process['Status']}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Process Recommendations Accordion */}
                  {selectedProcess && selectedProcess['Process ID'] === process['Process ID'] && processRecommendations[process['Process ID']] && (
                    <tr>
                      <td colSpan="7" className="px-6 py-0">
                        <div className="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-blue-900/10 dark:to-gray-900/10 rounded-lg p-6 mb-2 border-l-4 border-green-500">
                          <div className="flex items-center mb-4">
                            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <h4 className="text-lg font-bold text-green-900 dark:text-green-100">Optimization Recommendations for {process['Process Name']}</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {processRecommendations[process['Process ID']].map((rec, idx) => (
                              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    rec.priority === 'high' ? 'bg-gray-200 text-gray-800' : 
                                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {rec.priority.toUpperCase()}
                                  </span>
                                  <span className="text-sm font-bold text-green-600">{rec.savings}</span>
                                </div>
                                <h5 className="font-medium text-gray-900 dark:text-white mb-2">{rec.title}</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Hardware Overview Section with Toggle - 30% Visual Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Hardware Overview</h2>
            <ToggleButton 
              isVisible={showHardwareOverview} 
              onToggle={() => setShowHardwareOverview(!showHardwareOverview)} 
            />
          </div>
        </div>
        
        {showHardwareOverview && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          
          {/* CPU Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CPU</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Model</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">Intel i7-9750H</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Base: 2.60GHz | Max: 2.6GHz</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Cores:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">6 (12 logical)</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Threads:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">2/core</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Sockets:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">1</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Family:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">6</span>
                </div>
              </div>
            </div>
          </div>

          {/* GPU Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GPU</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm-4 3v14h14V6H5z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Model</div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">GTX 1660 Ti</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">NVIDIA | v576.57</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-300">VRAM:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">6GB</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Used:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">247MB</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Temp:</span>
                  <span className="font-medium ml-1 text-green-600">51°C</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Power:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">24.5W</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Cores:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">1536</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-300">Load:</span>
                  <span className="font-medium ml-1 text-gray-900 dark:text-white">0%</span>
                </div>
              </div>
            </div>
          </div>

          {/* VRAM Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">VRAM</h3>
              <div className="p-2 bg-teal-100 rounded-lg">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Video Memory</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">6GB</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">GPU Memory</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Used:</span>
                  <span className="font-medium text-blue-600">247MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Available:</span>
                  <span className="font-medium text-green-600">5.75GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                  <span className="font-medium text-green-600">4.1%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '4.1%'}}></div>
              </div>
            </div>
          </div>

          {/* RAM Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RAM</h3>
              <div className="p-2 bg-gray-100 rounded-lg">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Memory</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">15.8GB</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">System RAM</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Used:</span>
                  <span className="font-medium text-red-600">13.6GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Available:</span>
                  <span className="font-medium text-green-600">2.2GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                  <span className="font-medium text-red-600">86.0%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{width: '86%'}}></div>
              </div>
            </div>
          </div>

          {/* Storage Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Storage</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Capacity</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">466GB</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Primary Storage</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Used:</span>
                  <span className="font-medium text-red-600">421GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Free:</span>
                  <span className="font-medium text-green-600">45GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Usage:</span>
                  <span className="font-medium text-red-600">90.4%</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{width: '90.4%'}}></div>
              </div>
            </div>
          </div>

          {/* OS Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">OS</h3>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-300">Operating System</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">Windows</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Version 10.0.22631</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Architecture:</span>
                  <span className="font-medium text-gray-900 dark:text-white">64-bit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Build:</span>
                  <span className="font-medium text-gray-900 dark:text-white">22631</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Platform:</span>
                  <span className="font-medium text-gray-900 dark:text-white">x64</span>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
        )}
      </div>

      {/* Power Consumption and Cost Overview - 30% Visual Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Power & Cost Overview</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Calculated for region: {currentRegion.name}</p>
            </div>
            <ToggleButton 
              isVisible={showPowerOverview} 
              onToggle={() => setShowPowerOverview(!showPowerOverview)} 
            />
          </div>
        </div>
        
        {showPowerOverview && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Total Energy Cost Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Total Energy Cost</h3>
              <div className="p-2 bg-green-200 dark:bg-green-700 rounded-lg">
                <svg className="w-6 h-6 text-green-700 dark:text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                ${overviewMetrics.totalCost}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                {overviewMetrics.processCount} processes analyzed
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Real-time calculation
              </div>
            </div>
          </div>

          {/* Total Power Consumption Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Power Consumption</h3>
              <div className="p-2 bg-blue-200 dark:bg-blue-700 rounded-lg">
                <svg className="w-6 h-6 text-blue-700 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {overviewMetrics.totalPower}W
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Current power consumption
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Across all processes
              </div>
            </div>
          </div>

          {/* Top Energy Process Card */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Top Energy Consumer</h3>
              <div className="p-2 bg-yellow-200 dark:bg-yellow-700 rounded-lg">
                <svg className="w-6 h-6 text-yellow-700 dark:text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100 truncate">
                {overviewMetrics.topProcess?.['Process Name'] || 'Loading...'}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                {overviewMetrics.topProcess?.['Power Consumption (W)'] || '0.0'}W
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                Current power usage
              </div>
            </div>
          </div>

          {/* Optimization Potential Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cost Savings</h3>
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {recommendations?.recommendations?.[0]?.savings_percentage 
                  ? `${recommendations.recommendations[0].savings_percentage}%`
                  : '0%'}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Potential savings
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Via region optimization
              </div>
            </div>
          </div>

          </div>
        </div>
        )}
      </div>

      {/* Process Data Visualizations - 10% Visual Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Visualizations and trends</p>
            </div>
            <ToggleButton 
              isVisible={showCharts} 
              onToggle={() => setShowCharts(!showCharts)} 
            />
          </div>
        </div>
        
        {showCharts && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Memory Usage Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Usage by Process (Top 5)</h3>
            <div className="h-96">
              <Bar
                data={{
                  labels: processData
                    .sort((a, b) => b['Memory Usage (MB)'] - a['Memory Usage (MB)'])
                    .slice(0, 5)
                    .map(p => p['Process Name']),
                  datasets: [{
                    label: 'Memory Usage (MB)',
                    data: processData
                      .sort((a, b) => b['Memory Usage (MB)'] - a['Memory Usage (MB)'])
                      .slice(0, 5)
                      .map(p => p['Memory Usage (MB)']),
                    backgroundColor: 'rgba(1, 169, 130, 0.8)',
                    borderColor: 'rgba(1, 169, 130, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 0,
                        minRotation: 0,
                        font: {
                          size: 11
                        },
                        maxTicksLimit: 5
                      },
                      grid: {
                        display: false
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Memory (MB)',
                        font: {
                          size: 12
                        }
                      },
                      ticks: {
                        font: {
                          size: 11
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* CPU Usage Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CPU Usage by Process (Top 5)</h3>
            <div className="h-96">
              <Bar
                data={{
                  labels: processData
                    .sort((a, b) => b['CPU Usage (%)'] - a['CPU Usage (%)'])
                    .slice(0, 5)
                    .map(p => p['Process Name']),
                  datasets: [{
                    label: 'CPU Usage (%)',
                    data: processData
                      .sort((a, b) => b['CPU Usage (%)'] - a['CPU Usage (%)'])
                      .slice(0, 5)
                      .map(p => p['CPU Usage (%)']),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'CPU Usage (%)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* IOPS Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">I/O Operations Per Second (IOPS) - Top 5</h3>
            <div className="h-96">
              <Line
                data={{
                  labels: processData
                    .sort((a, b) => b['IOPS'] - a['IOPS'])
                    .slice(0, 5)
                    .map(p => p['Process Name']),
                  datasets: [{
                    label: 'IOPS',
                    data: processData
                      .sort((a, b) => b['IOPS'] - a['IOPS'])
                      .slice(0, 5)
                      .map(p => p['IOPS']),
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'IOPS'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* GPU Memory Usage Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">GPU Memory Usage by Process (Top 5)</h3>
            <div className="h-96">
              <Bar
                data={{
                  labels: processData
                    .filter(p => p['GPU Memory Usage (MB)'] > 0)
                    .sort((a, b) => b['GPU Memory Usage (MB)'] - a['GPU Memory Usage (MB)'])
                    .slice(0, 5)
                    .map(p => p['Process Name']),
                  datasets: [{
                    label: 'GPU Memory Usage (MB)',
                    data: processData
                      .filter(p => p['GPU Memory Usage (MB)'] > 0)
                      .sort((a, b) => b['GPU Memory Usage (MB)'] - a['GPU Memory Usage (MB)'])
                      .slice(0, 5)
                      .map(p => p['GPU Memory Usage (MB)']),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'GPU Memory (MB)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* GPU Utilization Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">GPU Utilization by Process (Top 5)</h3>
            <div className="h-96">
              <Bar
                data={{
                  labels: processData
                    .filter(p => p['GPU Utilization (%)'] > 0)
                    .sort((a, b) => b['GPU Utilization (%)'] - a['GPU Utilization (%)'])
                    .slice(0, 5)
                    .map(p => p['Process Name']),
                  datasets: [{
                    label: 'GPU Utilization (%)',
                    data: processData
                      .filter(p => p['GPU Utilization (%)'] > 0)
                      .sort((a, b) => b['GPU Utilization (%)'] - a['GPU Utilization (%)'])
                      .slice(0, 5)
                      .map(p => p['GPU Utilization (%)']),
                    backgroundColor: 'rgba(236, 72, 153, 0.8)',
                    borderColor: 'rgba(236, 72, 153, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'GPU Utilization (%)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Power Consumption Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Power Consumption by Process (Top 5)</h3>
            <div className="h-96">
              <Bar
                data={{
                  labels: enhancedProcessData.slice(0, 5).map(p => p['Process Name']),
                  datasets: [{
                    label: 'Power Consumption (W)',
                    data: enhancedProcessData.slice(0, 5).map(p => p['Power Consumption (W)']),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Power (Watts)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Energy Cost Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Energy Cost by Process (Top 5)</h3>
            <div className="h-96">
              <Line
                data={{
                  labels: enhancedProcessData.slice(0, 5).map(p => p['Process Name']),
                  datasets: [{
                    label: 'Energy Cost ($)',
                    data: enhancedProcessData.slice(0, 5).map(p => p['Energy Cost ($)']),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                  }]
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Cost ($)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Top Energy Processes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Energy Consumers (Top 5)</h3>
            <div className="h-96">
              {powerMetrics?.top_processes ? (
                <Bar
                  data={{
                    labels: powerMetrics.top_processes.slice(0, 5).map(p => p.process_name),
                    datasets: [{
                      label: 'Energy Consumption (kWh)',
                      data: powerMetrics.top_processes.slice(0, 5).map(p => p.total_energy_kwh),
                      backgroundColor: 'rgba(255, 193, 7, 0.8)',
                      borderColor: 'rgba(255, 193, 7, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { display: false }
                    },
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      },
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Energy (kWh)'
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Loading energy data...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>
        </div>
        )}
      </div>

      {/* Cost Optimization Recommendations - 10% Visual Weight */}
      {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cost Optimization Recommendations</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Potential cost savings through regional migration</p>
              </div>
              <ToggleButton 
                isVisible={showRecommendations} 
                onToggle={() => setShowRecommendations(!showRecommendations)} 
              />
            </div>
          </div>
          
          {showRecommendations && (
          <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/20 dark:to-blue-900/20">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg mr-3">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">💡 Regional Migration Analysis</h4>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recommendations.recommendations.map((rec, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      rec.priority === 'high' ? 'bg-gray-200 text-gray-800' : 
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority?.toUpperCase()} PRIORITY
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {rec.savings_percentage}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">savings</div>
                    </div>
                  </div>
                  
                  <p className="font-medium text-gray-900 dark:text-white mb-3">{rec.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Current:</span>
                      <span className="ml-2 font-semibold text-gray-600">
                        {formatCurrency(rec.current_cost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Target:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {formatCurrency(rec.target_cost)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Target Region:</strong> {rec.target_region}
                  </div>
                </div>
              ))}
            </div>
            
            {recommendations.alternative_regions && recommendations.alternative_regions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Alternative Regions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendations.alternative_regions.slice(0, 3).map((alt, index) => (
                    <div key={alt.region} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            #{alt.rank}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{alt.region}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(alt.cost)}</div>
                          <div className="text-xs text-green-600">-{alt.savings_percentage}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* VM Instances Section - 10% Visual Weight */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">HyperV VM Instances</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Virtual machine performance overview</p>
            </div>
            <ToggleButton 
              isVisible={showVMs} 
              onToggle={() => setShowVMs(!showVMs)} 
            />
          </div>
        </div>
        
        {showVMs && (
        <div className="p-6">
        
        {vmData.length === 0 ? (
          /* No VM Instances Found */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="flex flex-col items-center">
              <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No HyperV VM Instances Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No virtual machine instances were found for the selected date.</p>
            </div>
          </div>
        ) : (
          /* VM Instances Grid/Table */
          <>
            {/* VM Summary Cards */}
            {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Running</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {vmData.filter(vm => vm.status === 'Running').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stopped</p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {vmData.filter(vm => vm.status === 'Stopped').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total VMs</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{vmData.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RAM</p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {(vmData.reduce((sum, vm) => sum + vm.allocatedRAM, 0) / 1024).toFixed(1)}GB
                    </p>
                  </div>
                </div>
              </div>
            </div> */}

            {/* VM Instances Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">VM Instance Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">VM Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU Usage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Average Memory Usage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {vmData.map((vm) => (
                      <React.Fragment key={vm.id}>
                        <tr 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => {
                            if (expandedVM === vm.id) {
                              setExpandedVM(null);
                            } else {
                              setExpandedVM(vm.id);
                              fetchVMProcessData(vm.name);
                            }
                          }}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  {expandedVM === vm.id ? (
                                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                  {vm.name}
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    ({vm.processCount} processes)
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{vm.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-3">
                                <div 
                                  className={`h-2 rounded-full ${
                                    vm.cpuUsage > 80 ? 'bg-red-500' : 
                                    vm.cpuUsage > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`} 
                                  style={{width: `${Math.min(100, vm.cpuUsage)}%`}}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{vm.cpuUsage.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-3">
                                <div 
                                  className={`h-2 rounded-full ${
                                    vm.ramUsagePercent > 80 ? 'bg-red-500' : 
                                    vm.ramUsagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{width: `${Math.min(100, vm.ramUsagePercent)}%`}}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{vm.ramUsagePercent.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expandable content */}
                        {expandedVM === vm.id && (
                          <tr>
                            <td colSpan="3" className="px-4 py-6 bg-gray-50 dark:bg-gray-900">
                              <div className="space-y-6">
                                {/* VM Summary Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Power Usage</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{vm.totalPower}W</div>
                                  </div>
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Seen</div>
                                    <div className="text-sm text-gray-900 dark:text-white">{vm.lastSeen}</div>
                                  </div>
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</div>
                                    <div className="flex items-center">
                                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                      <span className="text-sm text-gray-900 dark:text-white">{vm.status}</span>
                                    </div>
                                  </div>
                                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <button 
                                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Implement VM recommendations
                                        alert(`Generating recommendations for ${vm.name}...`);
                                      }}
                                    >
                                      Get Recommendations
                                    </button>
                                  </div>
                                </div>
                                
                                {/* VM Process Table */}
                                {vmProcessData[vm.name] && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                                        Processes Running in {vm.name}
                                      </h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                          <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Process</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU %</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory %</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                          {vmProcessData[vm.name].slice(0, 10).map((process, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {process.process_name || 'Unknown'}
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {(process.cpu_usage_percent || 0).toFixed(1)}%
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {(process.memory_usage_percent || 0).toFixed(1)}%
                                              </td>
                                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                  process.status === 'running' ? 'bg-green-100 text-green-800' :
                                                  process.status === 'sleeping' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {process.status || 'Unknown'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </div>
        )}
      </div>

      {/* System Insights Generator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Insights</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">AI-powered recommendations and analysis</p>
        </div>
        <div className="p-6">
          <SystemInsightsGenerator 
            processData={processData}
            vmData={vmData}
            selectedDate={selectedDate}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="text-center">
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleDownloadReport}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#01a982] to-[#00d4aa] text-white font-semibold rounded-lg hover:from-[#019670] hover:to-[#00b894] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Admin Report
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          Download comprehensive system reports for detailed analysis
        </p>
      </div>

    </div>
  );
};

export default AdminDashboard;