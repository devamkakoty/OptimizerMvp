import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  DollarSign, Zap, TrendingUp, MapPin, AlertTriangle, 
  Lightbulb, Clock, Target, Globe, Calculator 
} from 'lucide-react';

const FinOpsTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for cost analysis
  const [costData, setCostData] = useState(null);
  const [processName, setProcessName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  
  // State for recommendations
  const [recommendations, setRecommendations] = useState(null);
  const [topProcesses, setTopProcesses] = useState([]);
  const [regionalPricing, setRegionalPricing] = useState([]);
  const [trends, setTrends] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Fetch process cost summary
  const fetchCostSummary = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        limit: '20'
      });
      
      if (selectedRegion) params.append('region', selectedRegion);
      
      // Add time range
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString();
      params.append('start_time', startTime);
      params.append('end_time', endTime);
      
      const response = await fetch(`/api/costs/process-summary?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCostData(data);
      } else {
        setError(data.error || 'Failed to fetch cost data');
      }
    } catch (err) {
      setError('Error fetching cost data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        time_range_days: timeRange.toString(),
        projection_days: '30'
      });
      
      if (processName) params.append('process_name', processName);
      
      const response = await fetch(`/api/recommendations/cross-region?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data);
      } else {
        setError(data.error || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setError('Error fetching recommendations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch top energy processes
  const fetchTopProcesses = async () => {
    try {
      const response = await fetch(`/api/recommendations/top-energy-processes?time_range_days=${timeRange}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setTopProcesses(data.top_processes);
      }
    } catch (err) {
      console.error('Error fetching top processes:', err);
    }
  };

  // Fetch regional pricing
  const fetchRegionalPricing = async () => {
    try {
      const response = await fetch('/api/recommendations/regional-pricing');
      const data = await response.json();
      
      if (data.success) {
        setRegionalPricing(data.regions);
      }
    } catch (err) {
      console.error('Error fetching regional pricing:', err);
    }
  };

  // Fetch cost trends
  const fetchCostTrends = async () => {
    try {
      const params = new URLSearchParams({
        interval: 'hour',
        region: selectedRegion || ''
      });
      
      // Last 24 hours for hourly trend
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      params.append('start_time', startTime);
      params.append('end_time', endTime);
      
      const response = await fetch(`/api/costs/trends?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTrends(data);
      }
    } catch (err) {
      console.error('Error fetching cost trends:', err);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchCostSummary();
    fetchTopProcesses();
    fetchRegionalPricing();
    fetchCostTrends();
  }, [selectedRegion, timeRange]);

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(4)}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOptimizationColor = (potential) => {
    switch (potential) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-green-600" />
          FinOps & GreenOps Dashboard
        </h1>
        <div className="flex gap-2">
          <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Day</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Regions</SelectItem>
              {regionalPricing.map((region) => (
                <SelectItem key={region.region} value={region.region}>
                  {region.region} (${region.cost_per_kwh}/kWh)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Process Analysis
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Cost Summary Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Total Energy Cost</h3>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costData ? formatCurrency(costData.total_cost) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {costData ? `${costData.total_energy_kwh} kWh consumed` : 'Loading...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Active Processes</h3>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costData ? costData.process_count : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monitored in last {timeRange} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Current Region</h3>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {costData ? costData.region : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${costData ? costData.electricity_cost_per_kwh : '-'}/kWh
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">Available Regions</h3>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {regionalPricing.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cost optimization options
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Regional Pricing Comparison */}
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">Regional Electricity Pricing</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionalPricing}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}/kWh`, 'Cost']} />
                  <Legend />
                  <Bar dataKey="cost_per_kwh" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Energy Consuming Processes */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Top Energy Consumers</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProcesses.map((process, index) => (
                    <div key={process.process_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{process.process_name}</p>
                          <p className="text-sm text-gray-600">
                            {process.total_energy_kwh} kWh • {process.avg_power_watts}W avg
                          </p>
                        </div>
                      </div>
                      <Badge className={getOptimizationColor(process.optimization_potential)}>
                        {process.optimization_potential}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Process Cost Breakdown */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Process Cost Distribution</h3>
              </CardHeader>
              <CardContent>
                {costData && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costData.process_costs.slice(0, 5)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ process_name, cost }) => `${process_name}: $${cost}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cost"
                      >
                        {costData.process_costs.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Process Table */}
          <Card className="mt-6">
            <CardHeader>
              <h3 className="text-lg font-semibold">Detailed Process Costs</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Process Name</th>
                      <th className="text-right p-2">Energy (kWh)</th>
                      <th className="text-right p-2">Cost</th>
                      <th className="text-right p-2">Avg Power (W)</th>
                      <th className="text-right p-2">Data Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costData?.process_costs.map((process, index) => (
                      <tr key={process.process_name} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{process.process_name}</td>
                        <td className="text-right p-2">{process.total_energy_kwh}</td>
                        <td className="text-right p-2 font-semibold text-green-600">
                          {formatCurrency(process.cost)}
                        </td>
                        <td className="text-right p-2">{process.avg_power_watts}</td>
                        <td className="text-right p-2 text-gray-600">{process.data_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-6">
            <div className="flex gap-4">
              <Input
                placeholder="Filter by process name..."
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={fetchRecommendations} disabled={loading}>
                {loading ? 'Analyzing...' : 'Get Recommendations'}
              </Button>
            </div>

            {recommendations && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Primary Recommendations */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Cost Optimization Recommendations
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {recommendations.recommendations.length > 0 ? (
                      <div className="space-y-4">
                        {recommendations.recommendations.map((rec, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {rec.savings_percentage}% savings
                              </span>
                            </div>
                            <p className="font-medium mb-2">{rec.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Cost:</span>
                                <span className="ml-2 font-semibold">
                                  {formatCurrency(rec.current_cost)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Target Cost:</span>
                                <span className="ml-2 font-semibold text-green-600">
                                  {formatCurrency(rec.target_cost)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">Considerations:</p>
                              <ul className="text-sm text-gray-600 mt-1">
                                {rec.considerations.map((item, i) => (
                                  <li key={i} className="ml-4">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No significant cost optimization opportunities found.</p>
                        <p className="text-sm">Your current configuration appears cost-effective.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Alternative Regions */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Alternative Regions</h3>
                  </CardHeader>
                  <CardContent>
                    {recommendations.alternative_regions.length > 0 ? (
                      <div className="space-y-3">
                        {recommendations.alternative_regions.map((alt, index) => (
                          <div key={alt.region} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">#{alt.rank}</Badge>
                                <span className="font-medium">{alt.region}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatCurrency(alt.cost)}</p>
                                <p className="text-sm text-green-600">
                                  -{alt.savings_percentage}%
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No alternative regions available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Energy Cost Trends (24h)</h3>
            </CardHeader>
            <CardContent>
              {trends && (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trends.trend_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time_period" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value, name) => [
                        name === 'energy_kwh' ? `${value} kWh` : formatCurrency(value),
                        name === 'energy_kwh' ? 'Energy' : 'Cost'
                      ]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="energy_kwh" 
                      stackId="1" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Energy (kWh)"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stackId="2" 
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Cost ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinOpsTab;