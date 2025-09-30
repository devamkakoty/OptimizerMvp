import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { useNavigate } from 'react-router-dom';
import apiClient from '../config/axios';
import { ChevronLeft, ChevronRight, BarChart3, Calendar, DollarSign, Zap, Cpu, HardDrive, Monitor, MemoryStick, Server, Download, Search, Funnel, BatteryCharging, Factory, Lightbulb } from 'lucide-react';
import SystemInsightsGenerator from './SystemInsightsGenerator';
import "../styles/AdminDashboardNew.css"
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
import VMRecommendationsModal from './VMRecommendationsModal';
import ProcessInsightsModal from './ProcessInsightsModal';
import CardModal from './CardModal';

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

const AdminDashboardNew = ({
  processData,
  chartOptions,
  viewMode,
  selectedDate,
  selectedWeek,
  availableDates,
  setViewMode,
  setSelectedDate,
  setSelectedWeek,
  selectedCalendarDate,
  setSelectedCalendarDate,
  handleCalendarDateChange,
  minDate,
  maxDate,
  availableDateObjects,
  noDataError
}) => {
  const navigate = useNavigate();

  // State for date range selection
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // State for cost calculation
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [costData, setCostData] = useState(null);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [costModels, setCostModels] = useState([]);

  // Cache flags for static data to avoid unnecessary refetches
  const [costModelsCached, setCostModelsCached] = useState(false);
  const [hardwareSpecsCached, setHardwareSpecsCached] = useState(false);

  // State for hardware specs and host metrics
  const [hardwareSpecs, setHardwareSpecs] = useState(null);
  const [hostMetrics, setHostMetrics] = useState(null);
  const [hardwareLoading, setHardwareLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // State for scrollable sections
  const [costCardIndex, setCostCardIndex] = useState(0);
  const [hardwareCardIndex, setHardwareCardIndex] = useState(0);

  // Hardware details popup state
  const [showHardwarePopup, setShowHardwarePopup] = useState(false);
  const [selectedHardwareDetail, setSelectedHardwareDetail] = useState(null);

  // State for performance analytics dropdown
  const [selectedGraph, setSelectedGraph] = useState('memory');

  // State for VM monitoring
  const [vmData, setVmData] = useState([]);
  const [vmDataLoading, setVmDataLoading] = useState(true);
  const [expandedVM, setExpandedVM] = useState(null);
  const [vmProcessData, setVmProcessData] = useState({});
  const [recommendationsModalOpen, setRecommendationsModalOpen] = useState(false);
  const [selectedVMForRecommendations, setSelectedVMForRecommendations] = useState(null);

  // Process-specific insights state
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [processRecommendations, setProcessRecommendations] = useState({});
  const [processRealTimeData, setProcessRealTimeData] = useState({});
  const [processModalOpen, setProcessModalOpen] = useState(false);

  // State for top processes data
  const [topProcesses, setTopProcesses] = useState([]);

  // State for showing and hiding the Walkthrough Modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log('showModal:', showModal);
  }, [showModal]);

  // Generate AI-powered process-specific recommendations
  const generateProcessRecommendations = (processName, power, cost, process) => {
    const recommendations = [];
    const powerValue = parseFloat(power) || 0;
    const costValue = parseFloat(cost) || 0;
    const cpuUsage = parseFloat(process['CPU Usage (%)']) || 0;
    const memoryUsage = parseFloat(process['Memory Usage (MB)']) || 0;
    const gpuUsage = parseFloat(process['GPU Utilization (%)']) || 0;

    // High Power Consumption Analysis
    if (powerValue > 25) {
      const category = powerValue > 50 ? 'critical' : 'high';
      recommendations.push({
        type: 'power-optimization',
        title: `${category === 'critical' ? 'Critical' : 'High'} Power Consumption Alert`,
        description: `${processName} is consuming ${powerValue.toFixed(1)}W. ${category === 'critical' ? 'Immediate optimization required.' : 'Consider power throttling or task rescheduling.'
          } AI suggests ${cpuUsage > 80 ? 'CPU frequency scaling' : 'workload distribution'}.`,
        priority: category === 'critical' ? 'high' : 'medium',
        savings: category === 'critical' ? '25-40%' : '15-25%'
      });
    }

    // CPU Utilization Analysis
    if (cpuUsage > 85) {
      recommendations.push({
        type: 'cpu-optimization',
        title: 'CPU Bottleneck Detected',
        description: `${processName} is using ${cpuUsage.toFixed(1)}% CPU. AI recommends ${processName.toLowerCase().includes('chrome') || processName.toLowerCase().includes('browser')
          ? 'tab management and extension optimization'
          : processName.toLowerCase().includes('python') || processName.toLowerCase().includes('node')
            ? 'code profiling and algorithm optimization'
            : 'process priority adjustment and multi-threading'
          }.`,
        priority: 'high',
        savings: '20-35%'
      });
    }

    // Memory Usage Analysis
    if (memoryUsage > 1000) {
      recommendations.push({
        type: 'memory-optimization',
        title: 'High Memory Usage',
        description: `Memory usage at ${(memoryUsage / 1024).toFixed(1)}GB. ${processName.toLowerCase().includes('chrome') ? 'Consider closing unused tabs or using lightweight alternatives.'
          : processName.toLowerCase().includes('python') ? 'Implement memory profiling and garbage collection optimization.'
            : processName.toLowerCase().includes('video') || processName.toLowerCase().includes('media') ? 'Reduce video quality or buffer size.'
              : 'Consider memory cleanup routines or increasing virtual memory.'
          }`,
        priority: memoryUsage > 2000 ? 'high' : 'medium',
        savings: '10-20%'
      });
    }

    // GPU Usage Analysis
    if (gpuUsage > 70) {
      recommendations.push({
        type: 'gpu-optimization',
        title: 'GPU Intensive Process',
        description: `GPU utilization at ${gpuUsage.toFixed(1)}%. ${processName.toLowerCase().includes('game') ? 'Optimize graphics settings for better efficiency.'
          : processName.toLowerCase().includes('python') || processName.toLowerCase().includes('ml') ? 'Consider batch processing or model quantization.'
            : processName.toLowerCase().includes('video') ? 'Use hardware-accelerated encoding with lower bitrates.'
              : 'Implement GPU workload scheduling or distributed processing.'
          }`,
        priority: 'medium',
        savings: '15-30%'
      });
    }

    // Cost Optimization Analysis
    if (costValue > 0.008) {
      const regionSavings = Math.round((costValue - costValue * 0.65) / costValue * 100);
      recommendations.push({
        type: 'cost-optimization',
        title: 'Regional Cost Optimization',
        description: `Current cost: $${costValue.toFixed(4)}/hour. AI analysis shows ${regionSavings}% savings by migrating to lower-cost regions during non-peak hours. Estimated annual savings: $${(costValue * 24 * 365 * regionSavings / 100).toFixed(2)}.`,
        priority: costValue > 0.02 ? 'high' : 'medium',
        savings: `${regionSavings}%`
      });
    }

    // Intelligent Scheduling Recommendations
    const currentHour = new Date().getHours();
    if (powerValue > 15 || cpuUsage > 60) {
      const isPeakHour = currentHour >= 9 && currentHour <= 17;
      recommendations.push({
        type: 'smart-scheduling',
        title: 'AI-Powered Workload Scheduling',
        description: `${isPeakHour ? 'Peak hours detected.' : 'Off-peak optimization available.'} AI suggests ${isPeakHour ? 'deferring non-critical tasks to 10 PM - 6 AM for 40% cost reduction'
          : 'current timing is optimal, but consider load balancing during 2-4 AM window'
          }. Predictive analysis shows 23% efficiency gain.`,
        priority: isPeakHour ? 'medium' : 'low',
        savings: isPeakHour ? '25-40%' : '10-15%'
      });
    }

    // Process-Specific Recommendations
    if (processName.toLowerCase().includes('chrome') || processName.toLowerCase().includes('browser')) {
      recommendations.push({
        type: 'browser-optimization',
        title: 'Browser Performance Optimization',
        description: 'AI detects browser inefficiencies. Enable hardware acceleration, limit background tabs, use ad-blockers, and consider switching to efficiency mode for 30% power reduction.',
        priority: 'low',
        savings: '20-30%'
      });
    }

    // Ensure we always have at least one recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'baseline-optimization',
        title: 'Baseline Performance Optimization',
        description: `${processName} is running efficiently. AI suggests periodic monitoring and considers implementing automated scaling for future optimization opportunities.`,
        priority: 'low',
        savings: '5-10%'
      });
    }

    return recommendations.slice(0, 6); // Limit to 6 recommendations for better UX
  };

  // Generate real-time data for process display (no dummy data)
  const generateProcessRealTimeData = (process) => {
    // Use only current real values - no historical dummy data
    const currentTime = new Date().toLocaleTimeString();

    return {
      current: {
        cpu: parseFloat(process['CPU Usage (%)']) || 0,
        memory: parseFloat(process['Memory Usage (MB)']) || 0,
        memoryPercent: parseFloat(process['Memory Usage (%)']) || 0,
        power: parseFloat(process['Power Consumption (W)']) || 0,
        gpu: parseFloat(process['GPU Utilization (%)']) || 0,
        gpuMemory: parseFloat(process['GPU Memory Usage (MB)']) || 0,
        iops: parseFloat(process['IOPS']) || 0,
        openFiles: parseInt(process['Open Files']) || 0,
        timestamp: currentTime
      }
    };
  };

  // Handle process selection - Open modal instead of expansion
  const handleProcessClick = (process) => {
    setSelectedProcess(process);

    // Generate recommendations
    const recs = generateProcessRecommendations(
      process['Process Name'],
      process['Power Consumption (W)'],
      process['Energy Cost ($)'],
      process
    );
    setProcessRecommendations({
      ...processRecommendations,
      [process['Process ID']]: recs
    });

    // Generate real-time data (no dummy historical data)
    const realTimeData = generateProcessRealTimeData(process);
    setProcessRealTimeData({
      ...processRealTimeData,
      [process['Process ID']]: realTimeData
    });

    // Open modal
    setProcessModalOpen(true);
  };

  // Fetch cost models from database (cached to avoid unnecessary calls)
  const fetchCostModels = async () => {
    // Skip if already cached in this session
    if (costModelsCached) {
      console.log('Cost models already cached, skipping fetch');
      return;
    }

    try {
      console.log('Fetching cost models...');
      const response = await fetch('/api/cost-models?resource_name=ELECTRICITY_KWH');
      const data = await response.json();

      if (data.success) {
        setCostModels(data.cost_models || []);

        // Convert cost models to regions format for compatibility
        const regions = data.cost_models.map(model => ({
          code: model.region,
          name: model.region,
          currency: model.currency,
          rate: model.cost_per_unit,
          description: model.description
        }));

        setAvailableRegions(regions);

        // Set default region if not already set
        if (regions.length > 0 && !regions.find(r => r.code === selectedRegion)) {
          setSelectedRegion(regions[0].code);
        }

        // Mark as cached
        setCostModelsCached(true);
        console.log('Cost models cached successfully');
      }
    } catch (error) {
      console.error('Error fetching cost models:', error);
      // Fallback to minimal default if database is not available
      setAvailableRegions([
        { code: 'US', name: 'United States', currency: 'USD', rate: 0.12, description: 'Default US rate' }
      ]);
      setCostModelsCached(true); // Cache even fallback to avoid retries
    }
  };

  // Get current region for cost calculations
  const currentRegion = availableRegions.find(r => r.code === selectedRegion) || availableRegions[0] || {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    rate: 0.12,
    description: 'Default fallback rate'
  };

  // Calculate total system cost from current processes
  const totalSystemCost = topProcesses.reduce((total, process) => {
    return total + (parseFloat(process['Energy Cost ($)']) || 0);
  }, 0);

  // Performance metrics cards data
  const performanceMetrics = [
    { label: 'CPU Usage', value: hostMetrics?.host_cpu_usage_percent || 0, unit: '%', color: 'blue' },
    { label: 'Memory Usage', value: hostMetrics?.host_ram_usage_percent || 0, unit: '%', color: 'green' },
    { label: 'GPU Usage', value: hostMetrics?.host_gpu_utilization_percent || 0, unit: '%', color: 'orange' },
    {
      label: 'Network Total',
      value: hostMetrics?.host_network_bytes_sent && hostMetrics?.host_network_bytes_received
        ? Math.round((hostMetrics.host_network_bytes_sent + hostMetrics.host_network_bytes_received) / 1024 / 1024 / 1024)
        : 0,
      unit: 'GB',
      color: 'yellow'
    },
    {
      label: 'Disk Total',
      value: hostMetrics?.host_disk_read_bytes && hostMetrics?.host_disk_write_bytes
        ? Math.round((hostMetrics.host_disk_read_bytes + hostMetrics.host_disk_write_bytes) / 1024 / 1024 / 1024)
        : 0,
      unit: 'GB',
      color: 'red'
    },
    {
      label: 'System Cost',
      value: totalSystemCost,
      unit: `${currentRegion.currency}/hr`,
      color: 'purple'
    },
  ];

  // Combined hardware details with both specs and real-time metrics
  const hardwareDetails = [
    {
      label: 'CPU',
      value: hardwareSpecs?.CPU || 'Hardware specs not available',
      currentUsage: `${hostMetrics?.host_cpu_usage_percent?.toFixed(1) || '0'}% usage`,
      icon: Cpu,
      details: {
        'Current Usage': `${hostMetrics?.host_cpu_usage_percent?.toFixed(1) || '0'}%`,
        'Model': hardwareSpecs?.CPU || 'N/A',
        'Brand': hardwareSpecs?.cpu_brand || 'N/A',
        'Physical Cores': hardwareSpecs?.cpu_physical_cores || 'N/A',
        'Total Cores': hardwareSpecs?.['CPU Total cores (Including Logical cores)'] || 'N/A',
        'Base Clock': hardwareSpecs?.['CPU Base clock(GHz)'] ? `${hardwareSpecs['CPU Base clock(GHz)']} GHz` : 'N/A',
        'Max Frequency': hardwareSpecs?.['CPU Max Frequency(GHz)'] ? `${hardwareSpecs['CPU Max Frequency(GHz)']} GHz` : 'N/A',
        'Threads per Core': hardwareSpecs?.['CPU Threads per Core'] || 'N/A',
        'L1 Cache': hardwareSpecs?.['L1 Cache'] ? `${(hardwareSpecs['L1 Cache'] / 1024).toFixed(0)} KB` : 'N/A',
        'Power Consumption': hardwareSpecs?.['CPU Power Consumption'] ? `${hardwareSpecs['CPU Power Consumption']}W` : 'N/A',
        'CPU Sockets': hardwareSpecs?.cpu_sockets || 'N/A',
        'Cores per Socket': hardwareSpecs?.cpu_cores_per_socket || 'N/A'
      }
    },
    {
      label: 'GPU',
      value: hardwareSpecs?.GPU || 'Hardware specs not available',
      currentUsage: `${hostMetrics?.host_gpu_utilization_percent?.toFixed(1) || '0'}% usage`,
      icon: Monitor,
      details: {
        'Current Usage': `${hostMetrics?.host_gpu_utilization_percent?.toFixed(1) || '0'}%`,
        'GPU Memory Usage': `${hostMetrics?.host_gpu_memory_utilization_percent?.toFixed(1) || '0'}%`,
        'Temperature': `${hostMetrics?.host_gpu_temperature_celsius?.toFixed(1) || '0'}°C`,
        'Power Draw': `${hostMetrics?.host_gpu_power_draw_watts?.toFixed(1) || '0'}W`,
        'Model': hardwareSpecs?.GPU || 'N/A',
        'Brand': hardwareSpecs?.gpu_brand || 'N/A',
        'Number of GPUs': hardwareSpecs?.['# of GPU'] || 'N/A',
        'VRAM': hardwareSpecs?.['GPU Memory Total - VRAM (MB)'] ? `${(hardwareSpecs['GPU Memory Total - VRAM (MB)'] / 1024).toFixed(1)} GB` : 'N/A',
        'Graphics Clock': hardwareSpecs?.['GPU Graphics clock'] ? `${hardwareSpecs['GPU Graphics clock']} MHz` : 'N/A',
        'Memory Clock': hardwareSpecs?.['GPU Memory clock'] ? `${hardwareSpecs['GPU Memory clock']} MHz` : 'N/A',
        'CUDA Cores': hardwareSpecs?.['GPU CUDA Cores'] || 'N/A',
        'SM Cores': hardwareSpecs?.['GPU SM Cores'] || 'N/A',
        'Driver Version': hardwareSpecs?.gpu_driver_version || 'N/A'
      }
    },
    {
      label: 'Memory',
      value: hardwareSpecs?.total_ram_gb ? `${hardwareSpecs.total_ram_gb.toFixed(1)} GB` : 'Hardware specs not available',
      currentUsage: `${hostMetrics?.host_ram_usage_percent?.toFixed(1) || '0'}% usage`,
      icon: MemoryStick,
      details: {
        'Current Usage': `${hostMetrics?.host_ram_usage_percent?.toFixed(1) || '0'}%`,
        'Total RAM': hardwareSpecs?.total_ram_gb ? `${hardwareSpecs.total_ram_gb.toFixed(1)} GB` : 'N/A'
      }
    },
    {
      label: 'Storage',
      value: hardwareSpecs?.total_storage_gb ? `${hardwareSpecs.total_storage_gb.toFixed(0)} GB` : 'Hardware specs not available',
      currentUsage: hostMetrics ? `${Math.round(((hostMetrics.host_disk_read_count || 0) + (hostMetrics.host_disk_write_count || 0)) / 1000)} IOPS` : '0 IOPS',
      icon: HardDrive,
      details: {
        'Current IOPS': hostMetrics ? `${Math.round(((hostMetrics.host_disk_read_count || 0) + (hostMetrics.host_disk_write_count || 0)) / 1000)}` : '0',
        'Read Bytes': hostMetrics?.host_disk_read_bytes ? `${(hostMetrics.host_disk_read_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A',
        'Write Bytes': hostMetrics?.host_disk_write_bytes ? `${(hostMetrics.host_disk_write_bytes / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A',
        'Total Storage': hardwareSpecs?.total_storage_gb ? `${hardwareSpecs.total_storage_gb.toFixed(0)} GB` : 'N/A'
      }
    },
    {
      label: 'Network',
      value: hardwareSpecs?.os_name || 'Hardware specs not available',
      currentUsage: hostMetrics ? `${Math.round((hostMetrics.host_network_bytes_sent + hostMetrics.host_network_bytes_received) / 1024 / 1024 / 1024)} GB total` : '0 GB',
      icon: Server,
      details: {
        'Bytes Sent': hostMetrics?.host_network_bytes_sent ? `${(hostMetrics.host_network_bytes_sent / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A',
        'Bytes Received': hostMetrics?.host_network_bytes_received ? `${(hostMetrics.host_network_bytes_received / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A',
        'Packets Sent': hostMetrics?.host_network_packets_sent ? hostMetrics.host_network_packets_sent.toLocaleString() : 'N/A',
        'Packets Received': hostMetrics?.host_network_packets_received ? hostMetrics.host_network_packets_received.toLocaleString() : 'N/A',
        'OS Name': hardwareSpecs?.os_name || 'N/A',
        'OS Version': hardwareSpecs?.os_version || 'N/A',
        'Architecture': hardwareSpecs?.os_architecture || 'N/A',
        'Region': hardwareSpecs?.region || 'N/A',
        'Last Updated': hardwareSpecs?.timestamp ? new Date(hardwareSpecs.timestamp).toLocaleString() : 'N/A'
      }
    }
  ];

  // Calculate total power consumption from all processes
  const totalPowerConsumption = topProcesses.reduce((total, process) => {
    return total + (parseFloat(process['Power Consumption (W)']) || 0);
  }, 0);

  // Find top energy consuming process
  const topEnergyConsumer = topProcesses.reduce((max, process) => {
    const currentPower = parseFloat(process['Power Consumption (W)']) || 0;
    const maxPower = parseFloat(max?.['Power Consumption (W)']) || 0;
    return currentPower > maxPower ? process : max;
  }, topProcesses[0]);

  // Calculate potential cost savings based on region optimization
  const currentRate = currentRegion.rate;
  const cheapestRegion = availableRegions.reduce((min, region) =>
    region.rate < min.rate ? region : min, currentRegion);
  const potentialSavings = currentRate > cheapestRegion.rate
    ? Math.round(((currentRate - cheapestRegion.rate) / currentRate) * 100)
    : 0;

  // Power and Cost details cards data with real calculations
  const powerCostDetails = [
    {
      label: 'Total Energy Cost',
      value: `$${totalSystemCost.toFixed(4)}`,
      icon: DollarSign,
      details: [`${topProcesses.length} processes analyzed`, 'Real-time calculation']
    },
    {
      label: 'Power Consumption',
      value: `${totalPowerConsumption.toFixed(1)} W`,
      icon: BatteryCharging,
      details: [`${topProcesses.length} processes analyzed`, 'Real-time calculation']
    },
    {
      label: 'Top Energy Consumer',
      value: topEnergyConsumer?.['Process Name'] || 'No data',
      icon: Factory,
      details: [
        `${(parseFloat(topEnergyConsumer?.['Power Consumption (W)']) || 0).toFixed(2)}W`,
        'Current power usage'
      ]
    },
    {
      label: 'Cost Saving',
      value: `${potentialSavings}%`,
      icon: Lightbulb,
      details: [
        potentialSavings > 0
          ? `Switch to ${cheapestRegion.code} region`
          : 'Already in cheapest region'
      ]
    },
  ];

  // Graph options for performance analytics
  const graphOptions = [
    { value: 'memory', label: 'Memory Usage by Process (Top 5)' },
    { value: 'cpu', label: 'CPU Usage by Process (Top 5)' },
    { value: 'gpu', label: 'GPU Usage by Process (Top 5)' },
    { value: 'power', label: 'Power Consumption (Top 5)' },
  ];

  // Fetch hardware specifications (cached to avoid unnecessary calls)
  const fetchHardwareSpecs = async () => {
    // Skip if already cached in this session
    if (hardwareSpecsCached) {
      console.log('Hardware specs already cached, skipping fetch');
      return;
    }

    console.log('fetchHardwareSpecs called'); // Debug log
    try {
      setHardwareLoading(true);
      console.log('Making hardware specs API call...'); // Debug log
      const response = await fetch('/api/hardware-specs/latest');
      console.log('Hardware specs response:', response.status); // Debug log
      const data = await response.json();
      console.log('Hardware specs data:', data); // Debug log

      if (data && data.success && data.data) {
        console.log('Setting hardware specs data:', data.data); // Debug log
        setHardwareSpecs(data.data);
        // Mark as cached
        setHardwareSpecsCached(true);
        console.log('Hardware specs cached successfully');
      } else {
        console.log('No hardware specs data received, setting empty state'); // Debug log
        setHardwareSpecs(null);
        setHardwareSpecsCached(true); // Cache even null state to avoid retries
      }
    } catch (error) {
      console.error('Error fetching hardware specs:', error);
      setHardwareSpecsCached(true); // Cache error state to avoid retries
    } finally {
      console.log('Setting hardwareLoading to false'); // Debug log
      setHardwareLoading(false);
    }
  };

  // Manual refresh function for static data (when needed)
  const refreshStaticData = async () => {
    console.log('Manually refreshing static data...');
    setCostModelsCached(false);
    setHardwareSpecsCached(false);

    await Promise.allSettled([
      fetchCostModels(),
      fetchHardwareSpecs()
    ]);

    console.log('Static data refresh completed');
  };

  // Handle hardware card click for detailed popup
  const handleHardwareCardClick = (hardwareDetail) => {
    setSelectedHardwareDetail(hardwareDetail);
    setShowHardwarePopup(true);
  };

  // Fetch host metrics
  const fetchHostMetrics = async () => {
    try {
      setMetricsLoading(true);
      let url = '/api/host-overall-metrics?limit=1';

      // Add date range parameters if available
      if (dateRange.start || dateRange.end) {
        const params = new URLSearchParams([['limit', '1']]);
        if (dateRange.start) {
          params.append('start_date', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
          params.append('end_date', dateRange.end.toISOString().split('T')[0]);
        }
        url = `/api/host-overall-metrics?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        setHostMetrics(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching host metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch VM data with optimized parallel processing
  const fetchVMData = async () => {
    try {
      setVmDataLoading(true);
      console.log('Fetching VM data...');
      const startTime = Date.now();

      const response = await fetch('/api/v1/metrics/vms/active');
      const data = await response.json();

      if (data.success && data.active_vms) {
        // Use Promise.allSettled for better error handling and parallel execution
        const vmPromises = data.active_vms.map(async (vm) => {
          try {
            let summaryUrl = `/api/v1/metrics/vm/${encodeURIComponent(vm.vm_name)}/summary?hours=1`;

            // Add date range parameters if available
            if (dateRange.start || dateRange.end) {
              const params = new URLSearchParams([['hours', '1']]);
              if (dateRange.start) {
                params.append('start_date', dateRange.start.toISOString().split('T')[0]);
              }
              if (dateRange.end) {
                params.append('end_date', dateRange.end.toISOString().split('T')[0]);
              }
              summaryUrl = `/api/v1/metrics/vm/${encodeURIComponent(vm.vm_name)}/summary?${params.toString()}`;
            }

            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();

            return {
              success: true,
              data: {
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
              }
            };
          } catch (error) {
            console.error(`Error fetching details for VM ${vm.vm_name}:`, error);
            return {
              success: false,
              data: {
                id: vm.vm_name,
                name: vm.vm_name,
                type: 'Virtual Machine',
                status: 'Error',
                cpuUsage: 0,
                ramUsagePercent: 0,
                lastSeen: vm.last_seen ? new Date(vm.last_seen).toLocaleString() : 'Unknown',
                processCount: vm.process_count || 0,
              }
            };
          }
        });

        const results = await Promise.allSettled(vmPromises);
        const transformedVMs = results.map(result => {
          if (result.status === 'fulfilled') {
            return result.value.data;
          } else {
            console.error('VM processing failed:', result.reason);
            return null;
          }
        }).filter(vm => vm !== null);

        const endTime = Date.now();
        console.log(`VM data fetched for ${transformedVMs.length} VMs in ${endTime - startTime}ms`);

        setVmData(transformedVMs);
      }
    } catch (error) {
      console.error('Error fetching VM data:', error);
    } finally {
      setVmDataLoading(false);
    }
  };

  // Initial data fetching with parallelization and smart caching
  useEffect(() => {
    console.log('Dashboard useEffect running - initial data fetch with parallelization'); // Debug log

    // Parallelize all initial API calls for faster loading
    const initializeDashboard = async () => {
      try {
        console.log('Starting parallel API calls...');
        const startTime = Date.now();

        // Execute all API calls in parallel instead of sequentially
        await Promise.allSettled([
          // Static data (cached after first load)
          fetchCostModels(),
          fetchHardwareSpecs(),

          // Real-time data (always fresh)
          fetchHostMetrics(),
          fetchVMData(),

          // Date-range dependent data
          fetchChartData(),
          fetchTopProcesses()
        ]);

        const endTime = Date.now();
        console.log(`All API calls completed in ${endTime - startTime}ms`);
      } catch (error) {
        console.error('Error during dashboard initialization:', error);
      }
    };

    // Start the parallel loading
    initializeDashboard();

    // Set up intervals for real-time updates (always latest, ignore date range)
    const realtimeInterval = setInterval(() => {
      fetchHostMetrics(); // Real-time host metrics every 2 seconds
    }, 2000);

    const vmInterval = setInterval(fetchVMData, 10000);

    // Remove hardware specs from regular intervals since it's static and cached
    // Only refresh hardware specs manually or on explicit user action

    // Periodic update for date-range dependent data (less frequent)
    const aggregatedInterval = setInterval(() => {
      fetchChartData();
      fetchTopProcesses();
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(realtimeInterval);
      clearInterval(vmInterval);
      clearInterval(aggregatedInterval);
    };
  }, []);

  // Optional: freeze background scroll
  useEffect(() => {
    if (showModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    }
  }, [showModal]);

  // Refetch ONLY date-range dependent data when date range changes
  useEffect(() => {
    fetchChartData(); // Charts should reflect date range
    fetchTopProcesses(); // Process statistics should reflect date range
    // Note: Hardware specs and real-time metrics are NOT refetched here
  }, [dateRange]);

  // Refetch chart data when selected graph changes
  useEffect(() => {
    fetchChartData();
  }, [selectedGraph]);

  // Refetch cost-dependent data when region changes
  useEffect(() => {
    if (selectedRegion && selectedRegion !== '') {
      fetchTopProcesses(); // Process costs will change based on region
      fetchChartData(); // Chart data includes costs
    }
  }, [selectedRegion]);

  // Generate chart data based on selected graph
  const generateChartData = () => {
    if (!processData || processData.length === 0) return null;

    const sortedData = [...processData]
      .sort((a, b) => {
        switch (selectedGraph) {
          case 'memory':
            return (b['Memory Usage (MB)'] || 0) - (a['Memory Usage (MB)'] || 0);
          case 'cpu':
            return (b['CPU Usage (%)'] || 0) - (a['CPU Usage (%)'] || 0);
          case 'gpu':
            return (b['GPU Utilization (%)'] || 0) - (a['GPU Utilization (%)'] || 0);
          case 'power':
            return (b['Power Consumption (W)'] || 0) - (a['Power Consumption (W)'] || 0);
          default:
            return 0;
        }
      })
      .slice(0, 5);

    const labels = sortedData.map(p => p['Process Name'] || 'Unknown');
    const dataValues = sortedData.map(p => {
      switch (selectedGraph) {
        case 'memory':
          return p['Memory Usage (MB)'] || 0;
        case 'cpu':
          return p['CPU Usage (%)'] || 0;
        case 'gpu':
          return p['GPU Utilization (%)'] || 0;
        case 'power':
          return p['Power Consumption (W)'] || 0;
        default:
          return 0;
      }
    });

    return {
      labels,
      datasets: [{
        label: graphOptions.find(g => g.value === selectedGraph)?.label || 'Data',
        data: dataValues,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 4,
      }]
    };
  };


  // State for optimized data from backend
  const [systemOverview, setSystemOverview] = useState(null);
  const [chartData, setChartData] = useState(null);

  // Fetch optimized system overview from backend
  const fetchSystemOverview = async () => {
    try {
      let url = '/api/dashboard/system-overview';

      if (dateRange.start || dateRange.end) {
        const params = new URLSearchParams();
        if (dateRange.start) {
          params.append('start_date', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
          params.append('end_date', dateRange.end.toISOString().split('T')[0]);
        }
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setSystemOverview(data.data);
        // Update legacy state for compatibility
        if (data.data.hardware_specs) {
          setHardwareSpecs(data.data.hardware_specs);
        }
        if (data.data.host_metrics) {
          setHostMetrics(data.data.host_metrics);
        }
      }
    } catch (error) {
      console.error('Error fetching system overview:', error);
    }
  };

  // Fetch optimized chart data from backend
  const fetchChartData = async () => {
    try {
      const params = new URLSearchParams([['metric', selectedGraph], ['limit', '5']]);

      // Add region parameter if selected
      if (selectedRegion && selectedRegion !== '') {
        params.append('region', selectedRegion);
      }

      // Add date range if specified
      if (dateRange.start || dateRange.end) {
        if (dateRange.start) {
          params.append('start_date', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
          params.append('end_date', dateRange.end.toISOString().split('T')[0]);
        }
      }

      const url = `/api/dashboard/chart-data?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setChartData(data.chart_data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  // Fetch optimized top processes from backend
  const fetchTopProcesses = async () => {
    try {
      const params = new URLSearchParams([['metric', 'cpu'], ['limit', '5']]);

      // Add region parameter if selected
      if (selectedRegion && selectedRegion !== '') {
        params.append('region', selectedRegion);
      }

      // Add date range if specified
      if (dateRange.start || dateRange.end) {
        if (dateRange.start) {
          params.append('start_date', dateRange.start.toISOString().split('T')[0]);
        }
        if (dateRange.end) {
          params.append('end_date', dateRange.end.toISOString().split('T')[0]);
        }
      }

      const url = `/api/dashboard/top-processes?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setTopProcesses(data.data);
      }
    } catch (error) {
      console.error('Error fetching top processes:', error);
    }
  };

  // Download report functionality
  const handleDownloadReport = async () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const startDateStr = dateRange.start ? dateRange.start.toISOString().split('T')[0] : 'latest';
    const endDateStr = dateRange.end ? dateRange.end.toISOString().split('T')[0] : 'latest';
    const filename = `GreenMatrix_Dashboard_Report_${startDateStr}_to_${endDateStr}_${timestamp}.html`;

    // Create comprehensive report data
    const reportData = {
      generatedAt: new Date().toLocaleString(),
      dateRange: {
        start: dateRange.start ? dateRange.start.toLocaleDateString() : 'Not set',
        end: dateRange.end ? dateRange.end.toLocaleDateString() : 'Not set'
      },
      viewMode,
      selectedRegion: currentRegion.name,
      costRate: `${currentRegion.currency} ${currentRegion.rate}/kWh`,
      hardwareSpecs: hardwareSpecs || {},
      hostMetrics: hostMetrics || {},
      vmData: vmData || [],
      processData: processData || [],
      performanceMetrics: performanceMetrics || []
    };

    // Create HTML content for report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GreenMatrix Dashboard Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; color: #1f2937; line-height: 1.5; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
          .header h1 { color: #111827; margin: 0; font-size: 32px; font-weight: 700; }
          .header p { color: #6b7280; margin: 8px 0; font-size: 14px; }
          .section { margin: 30px 0; }
          .section h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0; }
          .card { border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
          .card h3 { margin: 0 0 15px 0; color: #111827; font-size: 16px; font-weight: 600; }
          .metric { margin: 8px 0; color: #374151; }
          .metric strong { color: #10b981; font-weight: 600; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #e5e7eb; padding: 12px 8px; text-align: left; }
          .table th { background-color: #f9fafb; color: #374151; font-weight: 600; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GreenMatrix Dashboard Report</h1>
          <p>Generated on: ${reportData.generatedAt}</p>
          <p>Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}</p>
          <p>View Mode: ${reportData.viewMode}</p>
          <p>Cost Region: ${reportData.selectedRegion} (${reportData.costRate})</p>
        </div>

        <div class="section">
          <h2>System Overview</h2>
          <div class="grid">
            ${performanceMetrics.map(metric => `
              <div class="card">
                <h3>${metric.label}</h3>
                <div class="metric"><strong>Value:</strong> ${metric.value.toFixed(1)}${metric.unit}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <h2>Hardware Specifications</h2>
          <div class="grid">
            <div class="card">
              <h3>CPU</h3>
              <div class="metric"><strong>Model:</strong> ${hardwareSpecs?.cpu_model || 'N/A'}</div>
              <div class="metric"><strong>Cores:</strong> ${hardwareSpecs?.cpu_cores || 'N/A'}</div>
              <div class="metric"><strong>Frequency:</strong> ${hardwareSpecs?.cpu_frequency || 'N/A'}</div>
            </div>
            <div class="card">
              <h3>Memory</h3>
              <div class="metric"><strong>Total RAM:</strong> ${hardwareSpecs?.total_ram_gb ? `${hardwareSpecs.total_ram_gb}GB` : 'N/A'}</div>
              <div class="metric"><strong>Usage:</strong> ${hostMetrics?.host_ram_usage_percent ? `${hostMetrics.host_ram_usage_percent.toFixed(1)}%` : 'N/A'}</div>
            </div>
            <div class="card">
              <h3>Storage</h3>
              <div class="metric"><strong>Total:</strong> ${hardwareSpecs?.total_storage_gb ? `${hardwareSpecs.total_storage_gb}GB` : 'N/A'}</div>
              <div class="metric"><strong>I/O:</strong> ${hostMetrics?.host_disk_read_bytes && hostMetrics?.host_disk_write_bytes
        ? `${Math.round((hostMetrics.host_disk_read_bytes + hostMetrics.host_disk_write_bytes) / 1024 / 1024)} MB`
        : 'N/A'
      }</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Virtual Machines</h2>
          ${vmData.length > 0 ? `
            <div class="grid">
              <div class="card">
                <h3>VM Summary</h3>
                <div class="metric"><strong>Total VMs:</strong> ${vmData.length}</div>
                <div class="metric"><strong>Running:</strong> ${vmData.filter(vm => vm.status === 'Running').length}</div>
                <div class="metric"><strong>Average CPU:</strong> ${vmData.length > 0 ? (vmData.reduce((sum, vm) => sum + (vm.cpuUsage || 0), 0) / vmData.length).toFixed(1) : 0}%</div>
              </div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>VM Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>CPU Usage</th>
                  <th>RAM Usage</th>
                  <th>Process Count</th>
                  <th>Total Power</th>
                </tr>
              </thead>
              <tbody>
                ${vmData.map(vm => `
                  <tr>
                    <td>${vm.name}</td>
                    <td>${vm.type || 'Virtual Machine'}</td>
                    <td><span style="color: ${vm.status === 'Running' ? '#10b981' : '#ef4444'}">${vm.status}</span></td>
                    <td>${vm.cpuUsage ? `${vm.cpuUsage.toFixed(1)}%` : 'N/A'}</td>
                    <td>${vm.ramUsagePercent ? `${vm.ramUsagePercent.toFixed(1)}%` : 'N/A'}</td>
                    <td>${vm.processCount || 0}</td>
                    <td>${vm.totalPower || 0}W</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No VM data available</p>'}
        </div>

        <div class="section">
          <h2>Top Processes</h2>
          ${processData && processData.length > 0 ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Process Name</th>
                  <th>User</th>
                  <th>CPU %</th>
                  <th>Memory MB</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${processData.slice(0, 10).map(process => `
                  <tr>
                    <td>${process['Process Name'] || 'Unknown'}</td>
                    <td>${process['Username'] || 'System'}</td>
                    <td>${process['CPU Usage (%)'] ? process['CPU Usage (%)'].toFixed(1) : 0}%</td>
                    <td>${process['Memory Usage (MB)'] ? process['Memory Usage (MB)'].toFixed(1) : 0}</td>
                    <td>${process['Status'] || 'Running'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No process data available</p>'}
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Hewlett Packard Enterprise Development LP</p>
          <p>Generated by GreenMatrix Dashboard</p>
        </div>
      </body>
      </html>
    `;

    // Create and trigger download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {showModal && <CardModal showModal={showModal} onClose={() => setShowModal(false)} />}
      <div className={`space-y-6 max-w-full overflow-hidden transition-opacity duration-300 ${showModal ? 'pointer-events-none opacity-50' : 'opacity-100'}`}></div>
      <div className="space-y-4 max-w-full overflow-hidden">
        {/* Top Right-Aligned Toolbar */}
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2">
          <div className="flex justify-between items-center gap-2">
            <div>
              <h1 className="text-4xl font-medium items-center text-left" style={{ color: '#16a34a' }}>
                GreenMatrix Panel
              </h1>
            </div>
            <div className="flex flex-nowrap items-center space-x-4">

              {/* Cost Calculation Region */}
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-6 py-2.5 bg-gray-50 dark:bg-gray-700 text-[16px] font-lite text-gray-600 dark:text-white rounded-lg border-[1.5px] border-gray-400 dark:border-gray-600 w-90 h-10 focus:ring-2 focus:ring-[#01a982]"
              >
                <option default value="">Cost Calculation Region</option>
                {availableRegions.map(region => (
                  <option key={region.code} value={region.code}>
                    {region.code} - {region.currency}
                  </option>
                ))}
              </select>

              {/* View Mode Dropdown */}
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-[16px] font-lite text-gray-600 dark:text-white rounded-lg border-[1.5px] border-gray-400 dark:border-gray-600  w-85 h-10 focus:ring-2 focus:ring-[#01a982]"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>

              {/* Start Date Picker */}
              <DatePicker
                selected={dateRange.start}
                onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                minDate={minDate}
                maxDate={maxDate}
                className="max-w-32 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-[16px] font-lite text-gray-600 dark:text-white rounded-lg border-[1.5px] border-gray-400 dark:border-gray-600 h-10 focus:ring-2 focus:ring-[#01a982]"
                placeholderText="mm/dd/yyyy"
                dateFormat="MM/dd/yyyy"
              />

              {/* End Date Picker */}
              <DatePicker
                selected={dateRange.end}
                onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                selectsEnd
                startDate={dateRange.start}
                endDate={dateRange.end}
                minDate={dateRange.start || minDate}
                maxDate={maxDate}
                className="max-w-32 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 text-[16px] font-lite text-gray-600 dark:text-white rounded-lg border-[1.5px] border-gray-400 dark:border-gray-600 h-10 focus:ring-2 focus:ring-[#01a982]"
                placeholderText="mm/dd/yyyy"
                dateFormat="MM/dd/yyyy"
              />
              {/* Report Button */}
              <button
                onClick={handleDownloadReport}
                className="px-6 ml-[20px] py-2.5 bg-[#008060] hover:bg-[#00694d] text-white rounded-full text-base font-medium flex items-center gap-2 h-11 transition-colors"
              >
                Report
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>


        {/* System Overview Section */}
        {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">System Overview</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> */}

        {/* Live Performance Metrics (Left) */}
        {/* <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Performance Metrics</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPerformanceCardIndex(Math.max(0, performanceCardIndex - 1))}
                    disabled={performanceCardIndex === 0}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPerformanceCardIndex(Math.min(performanceMetrics.length - 2, performanceCardIndex + 1))}
                    disabled={performanceCardIndex >= performanceMetrics.length - 2}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {performanceMetrics.slice(performanceCardIndex, performanceCardIndex + 2).map((metric, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold text-${metric.color}-600 dark:text-${metric.color}-400`}>
                      {metricsLoading ? '...' : `${metric.value.toFixed(1)}${metric.unit}`}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{metric.label}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                      <div
                        className={`bg-${metric.color}-500 h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${Math.min(100, metric.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
          </div> */}

        {/* Hardware Details (Right) */}
        {/* <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hardware Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHardwareCardIndex(Math.max(0, hardwareCardIndex - 1))}
                    disabled={hardwareCardIndex === 0}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHardwareCardIndex(Math.min(hardwareDetails.length - 2, hardwareCardIndex + 1))}
                    disabled={hardwareCardIndex >= hardwareDetails.length - 2}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {hardwareDetails.slice(hardwareCardIndex, hardwareCardIndex + 2).map((detail, index) => {
                  const IconComponent = detail.icon;
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleHardwareCardClick(detail)}
                      title={`Click for detailed ${detail.label} information`}
                    >
                      <div className="flex justify-center mb-2">
                        <IconComponent className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{detail.label}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1 truncate">
                        {hardwareLoading ? 'Loading...' : detail.value}
                      </div>
                    </div>
                  );
                })}
            </div> */}
        {/* </div>
              </div>
      </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Hardware Overview (Left, wider card) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 pt-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[24px] font-normal text-gray-900 dark:text-white">Hardware Overview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHardwareCardIndex(Math.max(0, hardwareCardIndex - 1))}
                  disabled={hardwareCardIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setHardwareCardIndex(Math.min(hardwareDetails.length - 2, hardwareCardIndex + 1))}
                  disabled={hardwareCardIndex >= hardwareDetails.length - 2}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 flex-grow">
              {hardwareDetails
                .slice(hardwareCardIndex, hardwareCardIndex + 3)
                .map((detail, index) => {
                  const IconComponent = detail.icon;

                  // Optional: Assign colors dynamically by type or index
                  const bgColor =
                    detail.label === 'CPU Model'
                      ? 'bg-pink-100 dark:bg-pink-900'
                      : detail.type === 'GPU Model'
                        ? 'bg-orange-100 dark:bg-orange-900'
                        : detail.type === 'Memory'
                          ? 'bg-teal-100 dark:bg-teal-900'
                          : detail.type === 'Storage'
                            ? 'bg-indigo-100 dark:bg-indigo-900'
                            : detail.label === 'Operating System'
                              ? 'bg-yellow-100 dark:bg-yellow-900'
                              : ['bg-gray-100 dark:bg-gray-700', 'bg-purple-100 dark:bg-purple-900', 'bg-green-100 dark:bg-green-900'][index % 3]; // fallback colors

                  return (
                    <div
                      key={index}
                      className={`${bgColor} rounded-lg p-4 text-center cursor-pointer hover:brightness-95 transition-colors`}
                      onClick={() => handleHardwareCardClick(detail)}
                      title={`Click for detailed ${detail.label} information`}
                    >
                      <div className="flex justify-left mb-2">
                        <IconComponent className="w-8 h-8 text-gray-600 dark:text-gray-600" />
                      </div>
                      <div className="flex flex-col items-start w-full">
                        <div className="text-lg text-gray-900 font-medium dark:text-gray-400 py-2 w-full">
                          {detail.label}
                        </div>
                        <div className="text-sm font-semibold text-gray-500 dark:text-white w-full break-words leading-tight">
                          {hardwareLoading ? 'Loading...' : detail.value}
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-white mt-1 w-full">
                          {hardwareLoading ? '' : detail.currentUsage}
                        </div>
                      </div>

                    </div>
                  );
                })}
            </div>
          </div>

          {/* Power & Cost Overview (Right, narrower card) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[24px] font-normal text-gray-900 dark:text-white">
                Power & Cost Overview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCostCardIndex(Math.max(0, costCardIndex - 2))}
                  disabled={costCardIndex === 0}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setCostCardIndex(
                      Math.min(powerCostDetails.length - 2, costCardIndex + 2)
                    )
                  }
                  disabled={costCardIndex >= powerCostDetails.length - 2}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 gap-4 flex-grow">
              {powerCostDetails
                .slice(costCardIndex, costCardIndex + 2)
                .map((detail, index) => {
                  const IconComponent = detail.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 text-left shadow-sm border dark:bg-gray-800 border-gray-200 dark:border-gray-700 bocursor-pointer hover:brightness-95 transition-colors"
                      title={`Click for detailed ${detail.label} information`}
                    >
                      <div className="flex justify-left mb-2">
                        <IconComponent className="w-8 h-8" />
                      </div>
                      <div className="flex flex-col items-start">
                        <h4 className="text-[18px] font-semibold text-gray-900 dark:text-white py-2">
                          {detail.label}
                        </h4>
                        <p className="text-green-600 dark:text-green-400 font-bold text-md py-1">
                          {detail.value}
                        </p>
                        {/* Extra details */}
                        {detail.details?.map((d, i) => (
                          <p
                            key={i}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            {d}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

        </div>

        {/* Middle Section: Performance Analytics (Left) + VM Monitoring & Insights (Right) */}
        <div className="grid grid-cols-5 gap-6" style={{ marginTop: '24px'}}>

          {/* Performance Analytics (Revised Layout) */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 pt-4 w-full max-w-xl">
            {/* Title at top-left */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[24px] font-normal text-gray-900 dark:text-white">
                Performance Analytics
              </h3>
            </div>

            {/* Dropdown centered below title */}
            <div className="flex justify-center mb-6">
              <select
                value={selectedGraph}
                onChange={(e) => setSelectedGraph(e.target.value)}
                className="px-6 py-2 my-3 text-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-white rounded-md border border-gray-400 dark:border-gray-600 w-120 h-10 focus:ring-2 focus:ring-[#01a982] focus:border-[#01a982]"
              >
                {graphOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bar chart centered below dropdown */}
            <div className="h-80 flex justify-center items-center">
              {chartData ? (
                <div className="w-full">
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                        }
                      },
                      scales: {
                        x: {
                          ticks: { maxRotation: 45, minRotation: 45, font: { size: 10 } },
                          grid: { display: false }
                        },
                        y: {
                          beginAtZero: true,
                          grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        }
                      },
                      elements: {
                        bar: { borderRadius: 4 }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Right Column: VM Monitoring + System Insights */}
          <div className="col-span-3 grid grid-rows-2 gap-6 h-full">

            {/* VM Monitoring Section (Top Right) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 pt-4 h-full">
              <div className="flex items-center justify-between mb-4">
                {/* Header left */}
                <h3 className="text-[24px] font-normal text-gray-900 dark:text-white">
                  Current VM Instances
                </h3>

                {/* Button right */}
                <button
                  onClick={fetchVMData}
                  className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={vmDataLoading}
                >
                  <div className={`text-sm ${vmDataLoading ? 'animate-spin' : ''}`}>⟳</div>
                </button>
              </div>


              <div className="space-y-2 max-h-40 overflow-y-auto">
                {vmDataLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading VM instances...</p>
                  </div>
                ) : vmData.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">ℹ️</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No VM Instances Found</p>
                    <button
                      onClick={fetchVMData}
                      className="px-4 py-2 bg-green-30 text-white rounded-lg hover:bg-green-30 transition-colors btn3"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  vmData.map((vm) => (
                    <div key={vm.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedVM(expandedVM === vm.id ? null : vm.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-[#01a982] rounded-full"></div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{vm.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{vm.type}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          CPU: {vm.cpuUsage.toFixed(1)}%
                        </div>
                      </div>

                      {expandedVM === vm.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>RAM: {vm.ramUsagePercent.toFixed(1)}%</div>
                            <div>Processes: {vm.processCount}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVMForRecommendations(vm);
                              setRecommendationsModalOpen(true);
                            }}
                            className="mt-2 w-full px-3 py-1 bg-[#01a982] text-white text-xs rounded hover:bg-[#019670] transition-colors"
                          >
                            View Recommendations
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Insights & Recommendations (Bottom Right) */}
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 pt-4 h-full">
              <SystemInsightsGenerator
                processData={topProcesses}
                vmData={vmData || []}
                selectedDate={selectedDate || 'today'}
                viewMode={viewMode || 'daily'}
                hostMetrics={hostMetrics}
              />
            </div>
          </div>
        </div>

        {/* Process Monitoring Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl  shadow-sm border border-gray-200 dark:border-gray-700" style={{ marginTop: '24px'}}>
          <div className="px-6 py-4 border-b border-gray-200 dark:text-white dark:border-gray-700">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[24px] dark:text-white font-normal text-gray-900">
                Process Performance & Cost Analysis
              </h3>
            </div>


            {/* Search and Filter Bar */}
            <div className="mt-2 flex items-center gap-3">
              {/* Search Input with Icon */}
              <div className="relative w-[400px]"> {/* wider input */}
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-400 dark:bg-gray-800 dark:border-gray-700 rounded-lg text-gray-700 placeholder-gray-500 text-base focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5  font-bolder text-gray-900"
                />
              </div>

              {/* Filter Button */}
              <button className="p-2 border border-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
                <Funnel className="w-5 h-5 text-gray-600" />
              </button>
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse justify-center">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300">
                  <th className="px-4 py-3 text-left text-[18px] font-medium dark:text-gray-300 text-gray-900">
                    Process
                  </th>
                  <th className="px-4 py-3 text-left text-[18px] font-medium dark:text-gray-300 text-gray-900">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[18px] font-medium dark:text-gray-300 text-gray-900">
                    CPU %
                  </th>
                  <th className="px-4 py-3 text-left text-[18px] font-medium  dark:text-gray-300 text-gray-900">
                    Memory
                  </th>
                  <th className="px-4 py-3 text-left text-[18px] font-medium dark:text-gray-300 text-gray-900">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProcesses.slice(0, 5).map((process, index) => (
                  <tr
                    key={process['Process ID'] || index}
                    onClick={() => handleProcessClick(process)}
                    className={
                      index % 2 === 1
                        ? "bg-gray-50 cursor-pointer"
                        : "bg-white cursor-pointer"
                    }
                  >
                    <td className="px-4 py-3 text-md text-gray-600">
                      {process['Process Name'] || 'Unknown'} PID: {process['Process ID']}
                    </td>
                    <td className="px-4 py-3 text-md text-gray-600">
                      {process['Username'] || 'System'}
                    </td>
                    <td className="px-4 py-3 text-md text-gray-600">
                      {(process['CPU Usage (%)'] || 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-md text-gray-600">
                      {(process['Memory Usage (MB)'] || 0).toFixed(1)}MB,{" "}
                      {(process['Memory Usage (%)'] || 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-md font-medium">
                      <span
                        className={
                          process.Status === "Running"
                            ? "text-green-600"
                            : process.Status === "Idle"
                              ? "text-yellow-500"
                              : "text-red-600"
                        }
                      >
                        {process.Status || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {/* View All Button at Bottom */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={() => navigate('/processes')}
                className="px-6 py-2.5 bg-[#008060] hover:bg-[#00694d] text-white font-bold rounded-full text-md flex items-center gap-2 h-11 transition-colors"
              >
                View All
              </button>
            </div>
          </div>
        </div>

        {/* Process Insights Modal */}
        <ProcessInsightsModal
          isOpen={processModalOpen}
          onClose={() => {
            setProcessModalOpen(false);
            setSelectedProcess(null);
          }}
          selectedProcess={selectedProcess}
          processRecommendations={processRecommendations}
          processRealTimeData={processRealTimeData}
        />

        {/* Hardware Details Popup Modal */}
        {showHardwarePopup && selectedHardwareDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {selectedHardwareDetail.icon && (
                      <selectedHardwareDetail.icon className="w-8 h-8 text-[#01a982]" />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedHardwareDetail.label} Details
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowHardwarePopup(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(selectedHardwareDetail.details || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                      <span className="text-sm text-gray-900 dark:text-white font-semibold">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowHardwarePopup(false)}
                    className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#018f73] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VM Recommendations Modal */}
        {recommendationsModalOpen && selectedVMForRecommendations && (
          <VMRecommendationsModal
            isOpen={recommendationsModalOpen}
            onClose={() => {
              setRecommendationsModalOpen(false);
              setSelectedVMForRecommendations(null);
            }}
            vmName={selectedVMForRecommendations.name}
            timeRangeDays={7}
            selectedDate={dateRange.start ? dateRange.start.toISOString().split('T')[0] : 'today'}
            endDate={dateRange.end ? dateRange.end.toISOString().split('T')[0] : null}
          />
        )}
      </div>
    </>
  );
};

export default AdminDashboardNew;