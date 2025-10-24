# GreenMatrix Rule-Based Recommendations Guide



## Overview

GreenMatrix implements a rule-based recommendation system that analyzes system performance, resource utilization, and cost patterns to provide actionable optimization insights. The system operates on both host-level processes and virtual machine instances, delivering recommendations for performance optimization, cost reduction, and energy efficiency.

---

## Core Rules and Logic

### 1. Host Process Analysis Rules

**Data Collection:**
- Metrics collected every 2 seconds from monitoring agents
- Default analysis period: 7 days
- Focus on processes with power consumption data

**Resource Threshold Rules:**
- **High CPU Usage**: >80% sustained CPU utilization triggers performance recommendations
- **Low CPU Usage**: <20% sustained CPU utilization triggers cost optimization recommendations
- **Memory Analysis**: Processes using >8GB memory flagged for optimization review
- **Power Consumption**: High power consumption (>100W) triggers energy efficiency recommendations

**Recommendation Categories:**
- Performance optimization for overloaded processes
- Cost optimization for underutilized resources
- Energy efficiency improvements
- Process consolidation opportunities

### 2. VM Instance Analysis Rules

**VM-Specific Thresholds:**
- **CPU Utilization**: 
  - <20%: Recommend downsizing CPU allocation (30-50% cost reduction potential)
  - >80%: Recommend scaling up CPU resources
- **Memory Usage**:
  - >8GB: Monitor for memory leaks, consider optimization
  - <1GB: Memory allocation may be oversized
- **GPU Utilization**:
  - >80%: Scale GPU resources or optimize workload distribution
  - <20% with GPU allocated: Remove or share GPU resources for significant cost savings

**Analysis Period:**
- Default: 7 days
- Customizable start/end dates
- Real-time data processing

### 3. Cost Optimization Rules

**Regional Migration Threshold:**
- **Minimum Savings**: 15% cost reduction required to trigger migration recommendations
- **Priority Levels:**
  - High: >30% savings
  - Medium: 15-30% savings
  - Low: <15% savings

**Cost Calculation:**
- Daily energy consumption: (avg_power_watts × 24) / 1000
- Monthly projection: daily_energy_kwh × 30
- Regional cost comparison using electricity pricing database

**Migration Considerations:**
- Network latency impact assessment
- Data transfer costs evaluation
- Compliance requirements review
- Service availability verification

### 4. Energy Efficiency Rules

**Power Consumption Analysis:**
- **High Power**: >100W sustained triggers power management recommendations
- **Energy Calculation:** kWh = (power_watts × time_hours) / 1000
- **CO2 Impact:** Estimated using industry standard conversion factors

**Optimization Triggers:**
- High power consumption per unit of work
- Inefficient resource utilization patterns
- Off-peak workload scheduling opportunities

---

## Implementation Details

### Configuration Parameters

**Default Values (config.ini):**
```ini
cost_per_kwh = 0.12
currency_symbol = $
current_region = US
```

**Engine Thresholds:**
- `min_savings_threshold`: 0.15 (15% minimum savings)
- `default_time_range_days`: 7 days
- `default_projection_days`: 30 days
- `energy_calculation_interval`: 1/60 (1-minute intervals)

### Data Sources

**Host Metrics (PostgreSQL):**
- `host_process_metrics` table
- CPU, memory, GPU utilization
- Estimated power consumption
- I/O operations and file handles

**VM Metrics (TimescaleDB):**
- `vm_process_metrics` table
- Per-VM process analysis
- Resource utilization trends
- Power consumption patterns

**Cost Models (PostgreSQL):**
- `cost_models` table
- Regional electricity pricing
- Resource cost per unit
- Currency and effective dates

---

## API Endpoints

### 1. Host Process Recommendations
```http
GET /api/recommendations/host-processes
```
- Analyzes host-level process metrics
- Generates performance and cost optimization recommendations
- Supports time range filtering (default: 7 days)

### 2. VM Instance Recommendations
```http
GET /api/recommendations/vm/{vm_name}
```
- Per-VM resource analysis
- Resource right-sizing recommendations
- Cross-region migration opportunities

### 3. Cost Optimization Analysis
```http
GET /api/recommendations/cost-optimization
```
- Regional cost comparison
- Migration recommendations
- Savings calculations and projections

### 4. Top Energy Processes
```http
GET /api/recommendations/top-energy-processes
```
- Identifies highest energy-consuming processes
- Optimization potential assessment
- Priority ranking for recommendations

---

## Rule Summary

| Rule Category | Trigger Condition | Action | Priority |
|---------------|------------------|---------|----------|
| **High CPU Usage** | CPU > 80% sustained | Scale up CPU resources | High |
| **Low CPU Usage** | CPU < 20% sustained | Downsize CPU allocation | Medium |
| **High Memory Usage** | Memory > 8GB sustained | Monitor for memory leaks | Medium |
| **Low Memory Usage** | Memory < 1GB sustained | Reduce memory allocation | Low |
| **High GPU Usage** | GPU > 80% sustained | Scale GPU resources | High |
| **Low GPU Usage** | GPU < 20% with GPU allocated | Remove/share GPU resources | Medium |
| **High Power Consumption** | Power > 100W sustained | Implement power management | Medium |
| **Regional Migration** | Savings > 15% | Recommend migration to cheaper region | High/Medium |

---

## Configuration Reference

| Setting | Default Value | Description |
|---------|---------------|-------------|
| `cost_per_kwh` | 0.12 | Default electricity cost ($/kWh) |
| `min_savings_threshold` | 0.15 | Minimum savings for recommendations |
| `default_time_range_days` | 7 | Default analysis period |
| `default_projection_days` | 30 | Default cost projection period |

---

**Document Information**

**Title:** GreenMatrix Rule-Based Recommendations Guide  
**Version:** 1.0  
**Last Updated:** December 2024  
**Classification:** Public Documentation
