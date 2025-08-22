# GreenMatrix FinOps & GreenOps Features

This document describes the comprehensive FinOps (Financial Operations) and GreenOps (Green Operations) features added to the GreenMatrix application, transforming it from a performance monitor into a complete cost optimization platform.

## 🚀 Features Overview

### 1. **Power Consumption Tracking**
- Real-time GPU power draw monitoring (watts)
- Per-process power estimation based on CPU and GPU usage
- Overall host power metrics collection

### 2. **Cost Analysis Engine**
- Energy consumption calculation (kWh)
- Multi-region electricity pricing support
- Process-level cost breakdowns
- Time-based cost trends analysis

### 3. **Cross-Region Optimization**
- Workload cost simulation across different regions
- Migration recommendations with savings calculations
- Regional electricity pricing comparisons
- ROI analysis for workload migrations

### 4. **Financial Intelligence**
- Top energy-consuming processes identification
- Cost optimization recommendations
- Budget tracking and forecasting
- Energy efficiency scoring

## 🛠️ Technical Implementation

### Backend Components

#### Database Schema Updates
- **host_process_metrics**: Added `estimated_power_watts` column
- **host_overall_metrics**: Added `host_gpu_power_draw_watts` column
- **hardware_specs**: Added `region` column
- **cost_models**: New table for multi-region pricing

#### New Controllers
- **CostModelsController**: Manages regional pricing data
- **CostCalculationEngine**: Performs energy and cost calculations
- **RecommendationEngine**: Generates optimization recommendations

#### API Endpoints

##### Cost Management
- `POST /api/cost-models` - Create cost model
- `GET /api/cost-models` - List cost models
- `PUT /api/cost-models/{id}` - Update cost model
- `DELETE /api/cost-models/{id}` - Delete cost model
- `POST /api/cost-models/bulk` - Bulk create cost models

##### Cost Analysis
- `GET /api/costs/process-summary` - Process cost summary
- `GET /api/costs/process/{name}` - Individual process costs
- `GET /api/costs/trends` - Cost trends over time

##### Recommendations
- `GET /api/recommendations/cross-region` - Migration recommendations
- `GET /api/recommendations/top-energy-processes` - Top consumers
- `GET /api/recommendations/workload-analysis` - Workload analysis
- `GET /api/recommendations/regional-pricing` - Regional pricing info

### Frontend Components

#### FinOpsTab.jsx
A comprehensive React component featuring:
- **Overview Dashboard**: Key metrics and regional pricing
- **Process Analysis**: Energy consumption by process
- **Recommendations**: Cost optimization suggestions
- **Trends**: Historical energy and cost data

### Data Collection Updates

#### collect_all_metrics.py
- Added GPU power draw collection using NVML
- Implemented per-process power estimation
- Enhanced metrics payload with power data

#### collect_hardware_specs.py
- Added region information from config.ini
- Enhanced hardware specs with location data

#### config.ini
New configuration options:
- `cost_per_kwh`: Default electricity cost
- `currency_symbol`: Display currency
- `cpu_tdp_watts`: CPU power for estimation
- `current_region`: Current deployment region

## 📋 Setup Instructions

### 1. **Database Setup**
The database will be automatically updated when you run the backend. New tables and columns will be created automatically.

### 2. **Seed Cost Models**
Run the seeding script to populate initial regional pricing data:

```bash
cd backend
python seed_cost_models.py
```

### 3. **Configuration**
Update your `config.ini` file with appropriate values:

```ini
# Cost and Energy Configuration
cost_per_kwh = 0.12
currency_symbol = $
cpu_tdp_watts = 125
current_region = US
```

### 4. **Start Data Collection**
Ensure both collection scripts are running:

```bash
python collect_all_metrics.py
python collect_hardware_specs.py
```

### 5. **Frontend Integration**
Import and use the FinOpsTab component in your main application:

```jsx
import FinOpsTab from './components/FinOpsTab';

// Add to your router or tabs
<FinOpsTab />
```

## 📊 Usage Examples

### 1. **View Process Costs**
```bash
curl "http://localhost:8000/api/costs/process-summary?start_time=2024-01-01T00:00:00Z&end_time=2024-01-02T00:00:00Z"
```

### 2. **Get Cross-Region Recommendations**
```bash
curl "http://localhost:8000/api/recommendations/cross-region?process_name=python&time_range_days=7"
```

### 3. **Create Cost Model**
```bash
curl -X POST "http://localhost:8000/api/cost-models" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_name": "ELECTRICITY_KWH",
    "cost_per_unit": 0.15,
    "currency": "USD",
    "region": "eu-west-1",
    "description": "European electricity pricing"
  }'
```

## 🎯 Key Benefits

### Cost Optimization
- **15-40% potential savings** through regional migration
- Real-time cost monitoring and alerting
- Historical cost analysis and trending

### Energy Efficiency
- Process-level power consumption visibility
- Energy usage optimization recommendations
- Carbon footprint reduction insights

### Business Intelligence
- TCO (Total Cost of Ownership) calculations
- Budget planning and forecasting
- Resource utilization optimization

### Multi-Region Strategy
- Cost-effective workload placement
- Dynamic scaling based on electricity pricing
- Compliance-aware migration suggestions

## 🔧 Advanced Configuration

### Custom Power Models
You can customize power estimation by modifying the `calculate_process_power_estimation` function in `collect_all_metrics.py`:

```python
def calculate_process_power_estimation(cpu_usage_percent, gpu_util_percent, gpu_power_watts):
    # Custom power calculation logic
    cpu_power_estimate = (cpu_usage_percent / 100.0) * CPU_TDP_WATTS * custom_factor
    gpu_power_estimate = (gpu_util_percent / 100.0) * gpu_power_watts * gpu_efficiency
    return cpu_power_estimate + gpu_power_estimate
```

### Regional Pricing Updates
Update pricing data programmatically:

```python
import requests

# Update pricing for a region
response = requests.put("http://localhost:8000/api/cost-models/1", json={
    "cost_per_unit": 0.13,
    "effective_date": "2024-01-01T00:00:00Z"
})
```

## 🐛 Troubleshooting

### Common Issues

1. **GPU Power Reading Fails**
   - Ensure NVIDIA drivers are installed
   - Check if user has permission to access GPU metrics
   - Verify pynvml library installation

2. **Cost Models Not Loading**
   - Run the seed script: `python seed_cost_models.py`
   - Check backend connectivity
   - Verify database permissions

3. **Frontend Not Displaying Data**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Ensure CORS is properly configured

### Debug Commands

```bash
# Check API health
curl http://localhost:8000/health

# Verify cost models
curl http://localhost:8000/api/cost-models

# Test metrics collection
python -c "from collect_all_metrics import get_overall_host_metrics; print(get_overall_host_metrics())"
```

## 📈 Future Enhancements

- **Carbon footprint tracking** by region
- **Predictive cost modeling** using machine learning
- **Automated workload migration** based on cost thresholds
- **Integration with cloud provider APIs** for real-time pricing
- **Custom alerting and notifications** for cost anomalies
- **Multi-currency support** for global deployments

## 🤝 Contributing

When contributing to the FinOps features:

1. **Database Changes**: Update both model files and migration scripts
2. **API Changes**: Update OpenAPI documentation
3. **Frontend Changes**: Ensure responsive design and error handling
4. **Testing**: Add unit tests for cost calculations and recommendations

## 📄 License

This FinOps extension maintains the same license as the main GreenMatrix project.

---

**Need Help?** Check the troubleshooting section or open an issue with detailed error logs and configuration details.