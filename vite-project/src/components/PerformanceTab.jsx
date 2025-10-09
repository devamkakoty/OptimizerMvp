import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Cpu, Memory } from 'grommet-icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PerformanceTab = () => {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: [],
    memory: [],
    gpu: [],
    timestamps: []
  });
  const [currentStats, setCurrentStats] = useState({
    cpu: 0,
    memory: 0,
    gpu: 0,
    gpuMemory: 0
  });
  const [hardwareSpecs, setHardwareSpecs] = useState({
    cpuModel: 'Unknown CPU',
    gpuModel: 'Unknown GPU',
    totalRam: 'Unknown RAM'
  });

  const MAX_DATA_POINTS = 60; // Keep last 60 data points (60 seconds at 1-second intervals)

  const fetchSystemMetrics = async () => {
    try {
      // Try to get overall host metrics first (more accurate)
      console.log('Fetching host overall metrics...');
      let response = await fetch('/api/host-overall-metrics?limit=1');

      console.log('Host overall metrics response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Host overall metrics data:', data);

        if (data && data.data && data.data.length > 0) {
          const now = new Date();
          const hostMetrics = data.data[0]; // Get the latest metrics

          console.log('Latest host metrics:', hostMetrics);

          // Use direct system metrics (these match Task Manager)
          const cpuUsage = hostMetrics.host_cpu_usage_percent || 0; // Direct CPU %
          const memoryUsagePercent = hostMetrics.host_ram_usage_percent || 0; // Direct RAM %
          const gpuUsagePercent = hostMetrics.host_gpu_utilization_percent || 0;
          const gpuMemoryPercent = hostMetrics.host_gpu_memory_utilization_percent || 0;

          console.log('Parsed metrics:', { cpuUsage, memoryUsagePercent, gpuUsagePercent, gpuMemoryPercent });

          setSystemMetrics(prev => {
            const newCpu = [...prev.cpu, cpuUsage].slice(-MAX_DATA_POINTS);
            const newMemory = [...prev.memory, memoryUsagePercent].slice(-MAX_DATA_POINTS);
            const newGpu = [...prev.gpu, gpuUsagePercent].slice(-MAX_DATA_POINTS);
            const newTimestamps = [...prev.timestamps, now.toLocaleTimeString()].slice(-MAX_DATA_POINTS);

            return {
              cpu: newCpu,
              memory: newMemory,
              gpu: newGpu,
              timestamps: newTimestamps
            };
          });

          setCurrentStats({
            cpu: cpuUsage,
            memory: memoryUsagePercent,
            gpu: gpuUsagePercent,
            gpuMemory: gpuMemoryPercent
          });
        } else {
          console.log('No host overall metrics data found, trying fallback...');
        }
      } else {
        // Fallback: Use process metrics if overall metrics aren't available
        console.log('Host overall metrics API not available (status:', response.status, '), using process metrics fallback');
        response = await fetch('/api/host-process-metrics?limit=50');
        if (response.ok) {
          const data = await response.json();
          if (data && data.data && data.data.length > 0) {
            const now = new Date();

            // Use system-wide calculation with proper Task Manager methodology
            let systemIdlePercent = 0;

            // Find System Idle Process for accurate CPU calculation
            data.data.forEach(process => {
              if (process.process_name && process.process_name.toLowerCase().includes('system idle process')) {
                systemIdlePercent = parseFloat(process.cpu_usage_percent || 0);
              }
            });

            // CPU: Use system idle to calculate actual usage (Task Manager method)
            const cpuUsage = systemIdlePercent > 0 ? Math.max(0, 100 - systemIdlePercent) :
              Math.min(data.data.reduce((sum, p) => sum + parseFloat(p.cpu_usage_percent || 0), 0), 100);

            // Memory: Use psutil's system memory calculation
            // This is a rough estimate - we'll need the backend to provide actual system memory %
            const memoryUsagePercent = 52; // Temporary placeholder - backend should provide this

            const gpuUsagePercent = Math.max(...data.data.map(p => parseFloat(p.gpu_utilization_percent || 0)));
            const gpuMemoryPercent = Math.max(...data.data.map(p => parseFloat(p.gpu_memory_usage_mb || 0))) / (16 * 1024) * 100;

            setSystemMetrics(prev => {
              const newCpu = [...prev.cpu, cpuUsage].slice(-MAX_DATA_POINTS);
              const newMemory = [...prev.memory, memoryUsagePercent].slice(-MAX_DATA_POINTS);
              const newGpu = [...prev.gpu, gpuUsagePercent].slice(-MAX_DATA_POINTS);
              const newTimestamps = [...prev.timestamps, now.toLocaleTimeString()].slice(-MAX_DATA_POINTS);

              return {
                cpu: newCpu,
                memory: newMemory,
                gpu: newGpu,
                timestamps: newTimestamps
              };
            });

            setCurrentStats({
              cpu: cpuUsage,
              memory: memoryUsagePercent,
              gpu: gpuUsagePercent,
              gpuMemory: gpuMemoryPercent
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  const fetchHardwareSpecs = async () => {
    try {
      console.log('Fetching hardware specs...');
      const response = await fetch('/api/hardware-specs?limit=1');

      if (response.ok) {
        const data = await response.json();
        console.log('Hardware specs data:', data);

        if (data && data.data && data.data.length > 0) {
          const specs = data.data[0];
          setHardwareSpecs({
            cpuModel: specs.cpu_model || 'Unknown CPU',
            gpuModel: specs.gpu_model || 'Unknown GPU',
            totalRam: specs.total_ram_gb ? `${specs.total_ram_gb}GB RAM` : 'Unknown RAM'
          });
        }
      } else {
        console.log('Hardware specs API not available (status:', response.status, ')');
      }
    } catch (error) {
      console.error('Error fetching hardware specs:', error);
    }
  };

  useEffect(() => {
    // Wrap fetchSystemMetrics to check visibility
    const fetchWithVisibilityCheck = () => {
      if (document.visibilityState !== 'visible') return;
      fetchSystemMetrics();
    };

    // Initial load
    fetchSystemMetrics();
    fetchHardwareSpecs();

    // Update system metrics every 5 seconds for real-time graphs (matches AdminDashboard)
    const interval = setInterval(fetchWithVisibilityCheck, 5000);

    // Resume polling when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSystemMetrics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const createChartOptions = (title, color, maxValue = 100) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        callbacks: {
          title: () => title,
          label: (context) => `${context.parsed.y.toFixed(1)}%`
        }
      }
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        min: 0,
        max: maxValue,
        display: false,
        grid: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 4,
      },
      line: {
        borderWidth: 2,
        tension: 0.1,
      },
    },
    animation: {
      duration: 200,
    },
  });

  const createChartData = (data, color) => ({
    labels: systemMetrics.timestamps,
    datasets: [
      {
        data: data,
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
      },
    ],
  });

  const StatCard = ({ title, value, unit, color, chart, additionalInfo }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 my-6">

        {title === 'Memory' ? <div className="mb-3 text-gray-500 dark:text-gray-400">
          <Memory size="32" color="#39393aff" />
        </div> : <div className="mb-3 text-gray-500 dark:text-gray-400"><Cpu size="32" color="#39393aff" /></div>}

        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">Last 60 seconds</div>
          </div>

          {/* Value (center) */}
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 text-center" style={{ color: color }}>
            {value.toFixed(1)}{unit}
          </div>

          {additionalInfo && (
            <div className="text-sm text-right text-gray-600 dark:text-gray-400 max-w-[120px]">
              {additionalInfo}
            </div>
          )}
        </div>

        {/* Chart (bottom) */}
        <div className="h-32 mt-4">
          {chart}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* GreenMatrix Panel label (outside the box) */}
      <h1 className="text-4xl font-medium mb-6 text-left" style={{ color: '#16a34a' }}>
        GreenMatrix Panel
      </h1>
      <div className="w-full mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6 para1">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-[24px] font-normal text-gray-900 dark:text-white">
              Performance Monitor
            </h2>
            <div className="text-md text-gray-600 dark:text-gray-400">
              Live system performance metrics
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="CPU"
              value={currentStats.cpu}
              unit="%"
              color="#3b82f6"
              additionalInfo={hardwareSpecs.cpuModel}
              chart={
                <Line
                  data={createChartData(systemMetrics.cpu, '#3b82f6')}
                  options={createChartOptions('CPU Usage', '#3b82f6')}
                />
              }
            />

            <StatCard
              title="Memory"
              value={currentStats.memory}
              unit="%"
              color="#10b981"
              additionalInfo={hardwareSpecs.totalRam}
              chart={
                <Line
                  data={createChartData(systemMetrics.memory, '#10b981')}
                  options={createChartOptions('Memory Usage', '#10b981')}
                />
              }
            />

            <StatCard
              title="GPU"
              value={currentStats.gpu}
              unit="%"
              color="#f59e0b"
              additionalInfo={`${hardwareSpecs.gpuModel} | Memory: ${currentStats.gpuMemory.toFixed(1)}%`}
              chart={
                <Line
                  data={createChartData(systemMetrics.gpu, '#f59e0b')}
                  options={createChartOptions('GPU Usage', '#f59e0b')}
                />
              }
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-t border-gray-200 dark:border-gray-700 my-6">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Combined Performance Overview
            </h3>
            <div className="h-64">
              <Line
                data={{
                  labels: systemMetrics.timestamps,
                  datasets: [
                    {
                      label: 'CPU',
                      data: systemMetrics.cpu,
                      borderColor: '#3b82f6',
                      backgroundColor: '#3b82f620',
                      fill: false,
                      tension: 0.1,
                    },
                    {
                      label: 'Memory',
                      data: systemMetrics.memory,
                      borderColor: '#10b981',
                      backgroundColor: '#10b98120',
                      fill: false,
                      tension: 0.1,
                    },
                    {
                      label: 'GPU',
                      data: systemMetrics.gpu,
                      borderColor: '#f59e0b',
                      backgroundColor: '#f59e0b20',
                      fill: false,
                      tension: 0.1,
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      align: 'start',
                      labels: {
                        color: 'rgb(156, 163, 175)',
                        usePointStyle: true,
                        pointStyle: 'rect',
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 20
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                      },
                      ticks: {
                        color: 'rgb(156, 163, 175)',
                        maxTicksLimit: 12,
                      },
                    },
                    y: {
                      min: 0,
                      max: 100,
                      grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                      },
                      ticks: {
                        color: 'rgb(156, 163, 175)',
                        callback: (value) => `${value}%`,
                      },
                    },
                  },
                  elements: {
                    point: {
                      radius: 0,
                      hoverRadius: 4,
                    },
                    line: {
                      borderWidth: 2,
                    },
                  },
                  animation: {
                    duration: 200,
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTab;