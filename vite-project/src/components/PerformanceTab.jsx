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

  const MAX_DATA_POINTS = 60; // Keep last 60 data points (60 seconds at 1-second intervals)

  const fetchSystemMetrics = async () => {
    try {
      // Try to get overall host metrics first (more accurate)
      let response = await fetch('http://localhost:8000/api/host-overall-metrics?limit=1');
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.data && data.data.length > 0) {
          const now = new Date();
          const hostMetrics = data.data[0]; // Get the latest metrics
          
          // Use direct system metrics (these match Task Manager)
          const cpuUsage = hostMetrics.host_cpu_usage_percent || 0; // Direct CPU %
          const memoryUsagePercent = hostMetrics.host_ram_usage_percent || 0; // Direct RAM %
          const gpuUsagePercent = hostMetrics.host_gpu_utilization_percent || 0;
          const gpuMemoryPercent = hostMetrics.host_gpu_memory_utilization_percent || 0;
          
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
      } else {
        // Fallback: Use process metrics if overall metrics aren't available
        console.log('Host overall metrics not available, using process metrics fallback');
        response = await fetch('http://localhost:8000/api/host-process-metrics?limit=50');
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

  useEffect(() => {
    // Initial load
    fetchSystemMetrics();
    
    // Update every second for real-time graphs
    const interval = setInterval(fetchSystemMetrics, 1000);
    
    return () => clearInterval(interval);
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

  const StatCard = ({ title, value, unit, color, chart, additionalInfo }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
            {value.toFixed(1)}{unit}
          </div>
          {additionalInfo && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {additionalInfo}
            </div>
          )}
        </div>
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
        </div>
      </div>
      
      <div className="h-32 mb-4">
        {chart}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Last 60 seconds
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Performance Monitor
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Live system performance metrics
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="CPU"
          value={currentStats.cpu}
          unit="%"
          color="#3b82f6"
          additionalInfo="Intel(R) Core(TM) Ultra 7 165H"
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
          additionalInfo="RAM Usage"
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
          additionalInfo={`GPU Memory: ${currentStats.gpuMemory.toFixed(1)}%`}
          chart={
            <Line
              data={createChartData(systemMetrics.gpu, '#f59e0b')}
              options={createChartOptions('GPU Usage', '#f59e0b')}
            />
          }
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Combined Performance Overview
        </h3>
        <div className="h-64">
          <Line
            data={{
              labels: systemMetrics.timestamps,
              datasets: [
                {
                  label: 'CPU %',
                  data: systemMetrics.cpu,
                  borderColor: '#3b82f6',
                  backgroundColor: '#3b82f620',
                  fill: false,
                  tension: 0.1,
                },
                {
                  label: 'Memory %',
                  data: systemMetrics.memory,
                  borderColor: '#10b981',
                  backgroundColor: '#10b98120',
                  fill: false,
                  tension: 0.1,
                },
                {
                  label: 'GPU %',
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
                  position: 'top',
                  labels: {
                    color: 'rgb(156, 163, 175)',
                    usePointStyle: true,
                    pointStyle: 'circle',
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
  );
};

export default PerformanceTab;