import React from 'react';
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
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = ({ processData, chartOptions, viewMode, selectedDate, selectedWeek, availableDates }) => {
  // Generate dummy VM data based on selected date
  const generateVMData = () => {
    // If no specific date selected, return empty array for demo
    if (!selectedDate || selectedDate === 'today') {
      const targetDate = availableDates ? availableDates[availableDates.length - 1] : new Date().toISOString().split('T')[0];
      return generateVMDataForDate(targetDate);
    }
    return generateVMDataForDate(selectedDate);
  };

  const generateVMDataForDate = (dateString) => {
    const vmTemplates = [
      { name: 'VM-WebServer-01', type: 'Web Server', cores: 4, ram: 8192 },
      { name: 'VM-Database-01', type: 'Database', cores: 8, ram: 16384 },
      { name: 'VM-AppServer-01', type: 'Application', cores: 6, ram: 12288 },
      { name: 'VM-DevTest-01', type: 'Development', cores: 2, ram: 4096 },
      { name: 'VM-Monitoring-01', type: 'Monitoring', cores: 2, ram: 8192 }
    ];

    // Simulate some dates with no VM instances (for demo purposes)
    const date = new Date(dateString);
    const dayOfMonth = date.getDate();
    
    // Show empty state on specific dates (e.g., 17th, 20th, 25th of the month)
    if ([17, 20, 25].includes(dayOfMonth)) {
      return [];
    }

    // Simulate some VMs being offline on certain dates
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return vmTemplates.map((template, index) => {
      // Simulate some randomness - weekend might have fewer running VMs
      const isRunning = isWeekend ? Math.random() > 0.3 : Math.random() > 0.1;
      const baseVariation = 0.7 + Math.random() * 0.6;
      
      return {
        id: index + 1,
        name: template.name,
        type: template.type,
        status: isRunning ? 'Running' : 'Stopped',
        cores: template.cores,
        allocatedRAM: template.ram,
        cpuUsage: isRunning ? Math.max(5, Math.min(95, 20 + (Math.random() * 60 * baseVariation))) : 0,
        ramUsage: isRunning ? Math.max(10, Math.min(90, template.ram * 0.3 + (Math.random() * template.ram * 0.4))) : 0,
        ramUsagePercent: isRunning ? Math.max(10, Math.min(90, 30 + (Math.random() * 40 * baseVariation))) : 0,
        networkIn: isRunning ? Math.random() * 100 : 0,
        networkOut: isRunning ? Math.random() * 80 : 0,
        diskRead: isRunning ? Math.random() * 50 : 0,
        diskWrite: isRunning ? Math.random() * 30 : 0,
        uptime: isRunning ? `${Math.floor(Math.random() * 30) + 1} days` : '0 days',
        lastSeen: isRunning ? 'Now' : `${Math.floor(Math.random() * 5) + 1}h ago`
      };
    });
  };

  const vmData = generateVMData();
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
        totalIOPS: processData.reduce((sum, p) => sum + p['IOPS'], 0)
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
              <div class="metric"><strong>VRAM:</strong> ${reportData.hardwareInfo.gpu.vram}</div>
              <div class="metric"><strong>Used:</strong> ${reportData.hardwareInfo.gpu.used}</div>
              <div class="metric"><strong>Temperature:</strong> ${reportData.hardwareInfo.gpu.temperature}</div>
              <div class="metric"><strong>Power:</strong> ${reportData.hardwareInfo.gpu.power}</div>
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
                <th>Open Files</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${processData.map(process => `
                <tr>
                  <td>${process['Process Name']}</td>
                  <td>${process['Process ID']}</td>
                  <td>${process['CPU Usage (%)']}%</td>
                  <td>${process['Memory Usage (MB)'].toFixed(2)}</td>
                  <td>${process['Memory Usage (%)'].toFixed(2)}%</td>
                  <td>${process['IOPS']}</td>
                  <td>${process['Open Files']}</td>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      
      {/* Hardware Summary Cards */}
      <div className="col-span-full">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Hardware Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          
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

          {/* RAM Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RAM</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Process Data Visualizations */}
      <div className="col-span-full mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Process Performance Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Memory Usage Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Memory Usage by Process (Top 15)</h3>
            <div className="h-80">
              <Bar
                data={{
                  labels: processData.map(p => p['Process Name']),
                  datasets: [{
                    label: 'Memory Usage (MB)',
                    data: processData.map(p => p['Memory Usage (MB)']),
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
                        maxRotation: 45,
                        minRotation: 45
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Memory (MB)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* CPU Usage Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">CPU Usage by Process</h3>
            <div className="h-80">
              <Bar
                data={{
                  labels: processData.map(p => p['Process Name']),
                  datasets: [{
                    label: 'CPU Usage (%)',
                    data: processData.map(p => p['CPU Usage (%)']),
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">I/O Operations Per Second (IOPS)</h3>
            <div className="h-80">
              <Line
                data={{
                  labels: processData.map(p => p['Process Name']),
                  datasets: [{
                    label: 'IOPS',
                    data: processData.map(p => p['IOPS']),
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

          {/* Open Files Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Open Files Distribution</h3>
            <div className="h-80">
              <Doughnut
                data={{
                  labels: processData.map(p => p['Process Name']),
                  datasets: [{
                    data: processData.map(p => p['Open Files']),
                    backgroundColor: [
                      '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
                      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
                      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                          size: 10
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return context.label + ': ' + context.parsed + ' files';
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Process Data Table */}
      <div className="col-span-full mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Process Details (Top 15 by Memory Usage)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Process</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CPU %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory (MB)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">IOPS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Open Files</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {processData.map((process, index) => (
                  <tr key={process['Process ID']} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {process['Process Name']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {process['Process ID']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        process['CPU Usage (%)'] > 5 ? 'bg-red-100 text-red-800' :
                        process['CPU Usage (%)'] > 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {process['CPU Usage (%)']}%
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process['Memory Usage (MB)'].toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process['Memory Usage (%)'].toFixed(2)}%
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process['IOPS']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {process['Open Files']}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {process['Status']}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VM Instances Section */}
      <div className="col-span-full mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">HyperV VM Instances</h2>
        
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
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stopped</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
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
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RAM</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
                      <tr key={vm.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{vm.name}</div>
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
                                style={{width: `${vm.cpuUsage}%`}}
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
                                style={{width: `${vm.ramUsagePercent}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{vm.ramUsagePercent.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="col-span-full mt-8 text-center">
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
          
          <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Get Recommendations
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
          Download comprehensive reports or get AI-powered system optimization recommendations
        </p>
      </div>

    </div>
  );
};

export default AdminDashboard;