# GreenMatrix User Guide

**Document Version:** 2.1
**Publication Date:** January 2025
**Document Classification:** Public

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [System Architecture Overview](#system-architecture-overview)
4. [Getting Started](#getting-started)
5. [User Goals Configuration](#user-goals-configuration)
6. [Dashboard Monitoring Features](#dashboard-monitoring-features)
   - [Dashboard Overview](#dashboard-overview)
   - [Performance Monitor](#performance-monitor)
   - [Process Metrics](#process-metrics)
   - [Hardware Management](#hardware-management)
   - [Cost Management](#cost-management)
   - [AI Model Management](#ai-model-management)
7. [GreenMatrix AI Optimization Features](#greenmatrix-ai-optimization-features)
   - [Hardware Recommendations](#hardware-recommendations)
   - [Model Optimizer](#model-optimizer)
8. [System Insights and Recommendations](#system-insights-and-recommendations)
9. [Export and Reporting](#export-and-reporting)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Executive Summary

GreenMatrix is a comprehensive AI workload optimization and system monitoring platform designed to provide enterprise-grade insights into AI model performance, infrastructure optimization, and resource utilization. The platform combines advanced machine learning algorithms with real-time monitoring capabilities to deliver actionable recommendations for performance optimization, cost reduction, and system efficiency improvement.

### Key Benefits

- Advanced AI model performance simulation across diverse hardware configurations
- Intelligent hardware recommendation engine for optimal resource allocation
- Real-time system monitoring for both bare-metal and virtualized environments
- Comprehensive cost analysis with multi-regional optimization capabilities
- Professional-grade reporting and data export functionality
- Enterprise integration capabilities through RESTful APIs
- User goals-driven optimization for personalized AI workload planning

---

## Product Overview

### Platform Capabilities

GreenMatrix serves as an integrated platform combining AI workload optimization with comprehensive system monitoring. The platform addresses critical enterprise needs including:

**AI Workload Optimization:** Advanced simulation and recommendation capabilities for AI model deployment, performance optimization, and resource allocation planning.

**System Monitoring:** Real-time monitoring of system resources, processes, and performance metrics across host systems and virtual machine environments.

**Cost Management:** Comprehensive financial analysis tools including regional cost comparison, resource optimization recommendations, and total cost of ownership calculations.

**Performance Analytics:** Advanced analytics engine that processes historical data to identify trends, bottlenecks, and optimization opportunities.

**User Goals Management:** Centralized configuration system for defining AI model deployment goals and automatically populating optimization workflows.

### Target Use Cases

- **AI/ML Development Teams**: Performance simulation and hardware selection for model deployment
- **DevOps Engineers**: Real-time system monitoring and optimization recommendations
- **IT Infrastructure Teams**: Hardware planning, capacity management, and cost optimization
- **Financial Operations (FinOps)**: Cost analysis, budget planning, and resource optimization
- **Cloud Architects**: Multi-regional deployment planning and migration analysis

### Supported Environments

- **Operating Systems**: Ubuntu Linux 18.04+, CentOS/RHEL 7.x/8.x, Windows Server 2019+
- **Virtualization Platforms**: VMware vSphere, Docker containers, LXD containers, KVM
- **Cloud Platforms**: AWS, Azure, Google Cloud Platform, hybrid cloud deployments
- **Hardware Architectures**: x86_64, ARM64, CUDA-enabled GPUs

---

## System Architecture Overview

### Component Architecture

GreenMatrix employs a modular architecture designed for scalability, reliability, and performance:

#### Frontend Layer
- **React-based Dashboard**: Modern web interface with real-time data visualization
- **Responsive Design**: Cross-platform compatibility for desktop and mobile access
- **Dark Mode Support**: User preference-based theming
- **Context-based State Management**: Efficient state management using React Context API

#### Backend Services Layer
- **FastAPI Framework**: High-performance REST API services
- **Real-time Processing Engine**: Stream processing for live metrics
- **Machine Learning Pipeline**: AI models for recommendation generation
- **Data Aggregation Service**: Metric collection and processing

#### Data Storage Layer
- **PostgreSQL**: Metadata, configuration, and relational data storage
- **TimescaleDB**: Time-series metrics and performance data
- **Redis Cache**: Session management and temporary data storage
- **File Storage**: Report generation and export functionality

#### Monitoring and Collection Layer
- **Host Agents**: Bare-metal system monitoring components
- **VM Agents**: Virtual machine and container monitoring
- **API Collectors**: Cloud platform metric integration
- **Custom Integrations**: Third-party system connectors

---

## Getting Started

### Initial Access and Navigation

GreenMatrix features an intuitive navigation structure designed for efficient access to all platform capabilities. The interface is organized into logical sections that support different user workflows and responsibilities.

#### Application Routes

GreenMatrix consists of three main pages:

1. **Admin/Dashboard Page** (`/`): Main dashboard with monitoring and management tabs
2. **AI Workload Optimizer Page** (`/workload`): AI optimization features
3. **Process Metrics Page** (`/processes`): Dedicated process monitoring interface

*[Screenshot placeholder: Application structure showing three main routes]*

#### Navigation Structure

**Left Sidebar Navigation:**

The left sidebar provides access to all features organized by category:

1. **User Goals** (Top of sidebar)
   - Configure AI model deployment parameters
   - Set optimization preferences
   - Save configurations for reuse across features

2. **Dashboard Section** (Monitoring Features)
   - **Dashboard Overview**: System health and performance at a glance
   - **Performance Monitor**: Real-time performance charts and metrics
   - **Process Metrics**: Detailed process-level monitoring and analytics
   - **Hardware Management**: Hardware database configuration
   - **Cost Management**: Regional pricing and cost models
   - **AI Model Management**: AI model database administration

3. **AI Optimization Section**
   - **Hardware Recommendations**: Get optimal hardware suggestions
   - **Model Optimizer**: Optimize AI models for efficiency

*[Screenshot placeholder: Sidebar navigation with all sections expanded]*

#### User Interface Components

**Navigation Elements:**
- **Collapsible Sidebar**: Click the menu icon to expand/collapse navigation
- **Active Highlighting**: Currently selected page/tab is highlighted
- **Tab Interface**: Sub-features within each main section
- **Dark/Light Mode Toggle**: Theme switch in the top navigation bar
- **Help Icon**: Access walkthrough tutorials (shown once on first visit)

**Display Features:**
- **Dark/Light Mode**: Automatic theme switching with user preference storage
- **Responsive Layout**: Adapts to different screen sizes
- **Real-time Updates**: Live data refresh without page reload
- **Loading Indicators**: Progress spinners during data fetching

### User Workflow Patterns

**Initial Setup Workflow:**
1. Configure User Goals → Set model parameters and deployment preferences
2. Add Hardware Configurations → Populate hardware database
3. Set Up Cost Models → Define regional pricing for cost analysis
4. Monitor System → Review dashboard and performance metrics

**AI Optimization Workflow:**
1. Access User Goals → Define model and task parameters
2. Navigate to Hardware Recommendations or Model Optimizer
3. Configuration auto-populates from User Goals
4. Execute analysis → Review recommendations → Export results

**System Monitoring Workflow:**
1. Access Dashboard → Review system health
2. Navigate to Process Metrics → Analyze specific processes
3. Generate System Insights → Get AI-powered recommendations
4. Export Reports → Download analysis for stakeholders

*[Screenshot placeholder: Workflow diagram showing typical usage patterns]*

---

## User Goals Configuration

The User Goals feature provides a centralized configuration system for defining AI model deployment parameters that automatically populate across all optimization features. This eliminates repetitive data entry and ensures consistency across simulations and recommendations.

### How to Access User Goals

1. **Navigate to User Goals**:
   - Look at the left sidebar navigation
   - **User Goals** appears at the very top of the sidebar
   - Click on "User Goals" to access the configuration page
   - The configuration interface loads in the main content area

*[Screenshot placeholder: User Goals option highlighted in sidebar]*

### Understanding the User Goals Interface

The User Goals page is organized into several configuration sections:

#### Step 1: Configure Basic Model Information

**Model Selection Section** (at the top):

1. **Select Model Name**:
   - Click the "Select a model" dropdown
   - Choose your AI model from the available options (BERT, GPT-3, LLaMA, etc.)
   - This is the primary field that triggers auto-population

2. **Choose Task Type**:
   - Click the "Task Type" dropdown
   - Select either "Training" or "Inference"
   - **Important**: This selection determines which additional fields appear below

*[Screenshot placeholder: Model Name and Task Type dropdowns at top of page]*

3. **Auto-Populated Fields**:
   After selecting a model, these fields automatically fill:
   - **Framework**: The AI framework (PyTorch, TensorFlow, JAX)
   - **Total Parameters**: Number of model parameters in millions
   - **Model Size**: Storage size in megabytes
   - **Architecture Type**: Model architecture (Transformer, CNN, etc.)
   - **Model Type**: Specific model variant
   - **Precision**: Data precision format (FP32, FP16, INT8)
   - **Vocabulary Size**: Size of the model's vocabulary
   - **Activation Function**: Activation function used (ReLU, GELU, etc.)

*[Screenshot placeholder: Auto-populated model specification fields]*

#### Step 2: Configure Task-Specific Parameters

**For Inference Tasks:**

If you selected "Inference" as the task type, fill these fields:

1. **Deployment Scenario**:
   - Click dropdown to select "Single Stream" or "Server"
   - Single Stream: Processing one request at a time
   - Server: Concurrent request handling

2. **Batch Size**:
   - Enter the number of samples to process simultaneously
   - Typical values: 1, 8, 16, 32, 64

3. **Input Size**:
   - Enter the input dimension size
   - For text models: sequence length (e.g., 512, 1024)
   - For image models: image dimensions (e.g., 224, 384)

4. **Output Size**:
   - Enter the expected output dimension
   - Usually matches vocabulary size for language models

*[Screenshot placeholder: Inference-specific configuration fields]*

**For Training Tasks:**

If you selected "Training" as the task type, fill these fields:

1. **Batch Size**:
   - Enter training batch size
   - Larger batches need more memory but train faster

2. **Input Size**:
   - Enter input dimension size for training data

3. **Is Full Training**:
   - Select "Yes" for training from scratch
   - Select "No" for transfer learning or fine-tuning

4. **Fine-Tuning Method** (if not full training):
   - Options: LoRA, Adapter-based, Full Fine-tuning, Prompt-tuning
   - Choose based on your training approach

5. **Optimizer**:
   - Select optimization algorithm
   - Options: Adam, AdamW, SGD, RMSProp

6. **Learning Rate**:
   - Enter learning rate value (e.g., 0.001, 1e-4)
   - Smaller values = slower but more stable training

7. **Number of Epochs**:
   - Enter how many complete passes through training data
   - Typical range: 3-100 depending on task

8. **Training Dataset Size**:
   - Enter number of training examples
   - Used for compute and time estimates

*[Screenshot placeholder: Training-specific configuration fields]*

#### Step 3: Configure Computational Requirements

This section appears for both Training and Inference:

1. **Computational Requirements (GFLOPs)**:
   - Enter model computational requirements in billions of FLOPs
   - **Important Note**: This field must be manually entered
   - For inference: computation per forward pass
   - For training: computation per training step
   - Check model documentation for GFLOP values

*[Screenshot placeholder: Computational requirements input field]*

#### Step 4: Configure Advanced Parameters (Optional)

Click "Load More Parameters" to reveal additional configuration options:

1. **Number of Hidden Layers**:
   - Enter the count of hidden layers in the model

2. **Number of Attention Layers**:
   - For transformer models: number of attention layers
   - Usually same as hidden layers for standard transformers

3. **Embedding Vector Dimension**:
   - Dimension of embedding vectors
   - Common values: 512, 768, 1024, 4096

4. **FFN (Feed-Forward Network) Dimension**:
   - Dimension of feed-forward layers
   - Often 4x the embedding dimension

*[Screenshot placeholder: Advanced parameters section expanded]*

### Step 5: Save Your Configuration

1. **Review All Settings**:
   - Scroll through all configured fields
   - Ensure all required fields are filled
   - Verify computational requirements (GFLOPs) is set

2. **Click Save Button**:
   - Find the "Save Configuration" button at the bottom
   - Click to save your User Goals
   - You'll see a confirmation message upon successful save

3. **Confirmation**:
   - A success message appears confirming save
   - Configuration is now stored and ready to use

*[Screenshot placeholder: Save Configuration button and success message]*

### How User Goals Integrate with Other Features

Once you save your User Goals configuration:

**Automatic Population:**
- Navigate to **Hardware Recommendations** → All model fields auto-fill from User Goals
- Navigate to **Model Optimizer** → Configuration automatically loads
- No need to re-enter information for each feature

**Consistency:**
- Same configuration used across all analyses
- Ensures apples-to-apples comparisons
- Reduces data entry errors

**Override Capability:**
- Auto-populated values can be manually changed if needed
- Useful for testing variations without updating User Goals

*[Screenshot placeholder: Side-by-side showing User Goals and auto-populated Hardware Recommendations]*

### Best Practices for User Goals

1. **Set Up First**:
   - Configure User Goals before using optimization features
   - Saves significant time in subsequent workflows

2. **Keep Updated**:
   - Update when model requirements change
   - Modify when switching to different AI models

3. **Multiple Configurations**:
   - For different models: Save one configuration, use it, then update for next model
   - Document configurations externally if managing multiple models

4. **Required Fields**:
   - Always fill Model Name and Task Type at minimum
   - Include GFLOPs for accurate compute estimates
   - Complete task-specific fields for better recommendations

---

## Dashboard Monitoring Features

The Dashboard section provides comprehensive system monitoring, performance analytics, and management capabilities for real-time visibility into system health and performance.

### Dashboard Overview

The main dashboard provides a comprehensive view of your system's current status and performance metrics with real-time updates.

#### How to Access the Dashboard

1. **Navigate to Dashboard**:
   - Look at the left sidebar navigation
   - Find "Dashboard Overview" in the Dashboard section
   - Click to load the main dashboard
   - Note: This is often the default page when opening GreenMatrix

*[Screenshot placeholder: Dashboard Overview highlighted in sidebar]*

#### Understanding the Dashboard Layout

**Guided Walkthrough:**
- On first visit, an interactive walkthrough modal appears
- Guides you through key dashboard features
- Can be accessed later via the Help icon in the top navigation
- Mark complete to hide on subsequent visits

*[Screenshot placeholder: Walkthrough modal on first dashboard visit]*

#### Step 1: Review System Overview Cards

At the top of the dashboard, you'll see key system metrics:

**Hardware Information Section:**

1. **CPU Card**:
   - Shows processor model and manufacturer
   - Displays current CPU utilization percentage
   - Color-coded: Green (<60%), Yellow (60-80%), Red (>80%)
   - Updates every 2 seconds

2. **GPU Card** (if GPU present):
   - Graphics card model and manufacturer
   - Current GPU utilization percentage
   - VRAM usage information
   - Real-time temperature if available

3. **Memory (RAM) Card**:
   - Total system memory capacity
   - Current memory usage percentage
   - Available memory in GB
   - Memory pressure indicator

4. **Storage Card**:
   - Total disk capacity
   - Used vs. available space
   - Storage utilization percentage
   - Disk health status

*[Screenshot placeholder: Hardware information cards showing CPU, GPU, Memory, and Storage]*

#### Step 2: Monitor Real-Time Performance Metrics

**Performance Graphs Section:**

Below the overview cards, you'll find performance visualization:

1. **Performance Analytics Dropdown**:
   - Located above the graph area
   - Click to select which metric to display
   - Options: CPU Usage, Memory Usage, GPU Utilization, Power Consumption

2. **Real-Time Chart Display**:
   - Shows selected metric over the last 60-120 seconds
   - X-axis: Time progression
   - Y-axis: Percentage or value (0-100% for utilization metrics)
   - Line updates every 2 seconds with new data

3. **Chart Interaction**:
   - Hover over any point to see exact values
   - Timestamp and metric value appear in tooltip
   - Chart automatically scrolls as new data arrives

*[Screenshot placeholder: Performance graph with dropdown selector]*

#### Step 3: Review Top Processes

**Process Monitoring Section:**

Below the performance graphs, you'll see active system processes:

1. **Top Processes Table**:
   - Shows top 10 resource-consuming processes
   - Updates in real-time every few seconds
   - Sortable by clicking column headers

2. **Process Information Columns**:
   - **Process Name**: Application or service name
   - **CPU Usage (%)**: Current CPU consumption
   - **Memory Usage (MB)**: RAM consumption
   - **Power (W)**: Estimated power consumption
   - **Cost ($/hr)**: Estimated cost based on regional pricing
   - **Status**: Running state

3. **Process Insights**:
   - Click any process row to open detailed analysis modal
   - View AI-powered recommendations for process optimization
   - See historical trends and metrics

*[Screenshot placeholder: Top processes table with clickable rows]*

#### Step 4: Analyze Cost and Power Consumption

**Cost Analysis Cards:**

Scroll down to find cost breakdown by region:

1. **Regional Cost Cards**:
   - Shows cost per hour for different regions
   - Based on current system power consumption
   - Uses configured cost models from Cost Management
   - Displays currency based on region settings

2. **Power Consumption Summary**:
   - Total system power consumption in watts
   - Breakdown by component (CPU, GPU, RAM)
   - Estimated daily/monthly cost
   - Comparison across time periods

*[Screenshot placeholder: Regional cost comparison cards]*

#### Step 5: Virtual Machine Monitoring

If VMs are configured on your system:

**VM Status Section:**

1. **Active VMs List**:
   - Shows all detected virtual machines
   - Status: Running, Stopped, Paused
   - VM platform type (Docker, LXD, KVM)

2. **Per-VM Metrics**:
   - Click to expand any VM row
   - View CPU and memory allocation
   - See process-level metrics inside the VM
   - Container-specific resource limits

3. **VM Recommendations**:
   - Click "Get Recommendations" button on any VM
   - Opens modal with optimization suggestions
   - Right-sizing recommendations
   - Cost optimization opportunities

*[Screenshot placeholder: VM monitoring section with expanded VM details]*

#### Step 6: Generate System Insights and Recommendations

**System Insights Section** (bottom of dashboard):

This is a powerful feature for AI-powered analysis:

1. **Access Insights Generator**:
   - Scroll to bottom of dashboard
   - Find "System Insights and Recommendations" section
   - Shows backend-generated recommendations

2. **Time Range Selection**:
   - Select analysis period (Last 7 days, 30 days, etc.)
   - System analyzes data over selected timeframe
   - Click "Generate Insights" to refresh analysis

3. **Recommendation Categories**:
   - **Cost Optimization**: Cost-saving opportunities
   - **Performance**: Performance improvement suggestions
   - **Scaling**: Resource scaling recommendations
   - **Maintenance**: System health and maintenance tasks

4. **Download Reports**:
   - Click "Download Report" button
   - Choose format: HTML, PDF, or JSON
   - Comprehensive report with all insights and data

*[Screenshot placeholder: System Insights section with recommendation categories]*

For detailed information about System Insights, see the dedicated [System Insights and Recommendations](#system-insights-and-recommendations) section.

#### Automatic Updates and Data Refresh

**Auto-Refresh Behavior:**
- **System Metrics**: Update every 2 seconds
- **Process Data**: Refreshes every 3-5 seconds
- **Hardware Specs**: Update every hour
- **VM Data**: Refreshes every 5 seconds
- **No Manual Refresh Needed**: All updates happen automatically

**Visual Indicators:**
- Loading spinners during data fetch
- "Last Updated" timestamps on sections
- Connection status indicators
- Error messages if backend unavailable

---

### Performance Monitor

The Performance Monitor provides dedicated real-time system monitoring with detailed charts and historical trend analysis.

#### How to Access Performance Monitor

1. **Navigate to Performance Monitor**:
   - Look at the left sidebar
   - Find "Performance Monitor" in the Dashboard section
   - Click to load the performance monitoring interface

*[Screenshot placeholder: Performance Monitor in sidebar navigation]*

#### Understanding the Performance Monitor Interface

**Step 1: View Real-Time Performance Charts**

When the page loads, you'll see live performance metrics:

1. **Multi-Metric Display**:
   - Multiple charts displayed simultaneously
   - Each chart shows a different metric
   - All charts share the same timeline for easy comparison

2. **Metric Charts Available**:
   - **CPU Utilization**: Processor usage over time
   - **Memory Usage**: RAM consumption percentage
   - **GPU Utilization**: Graphics card usage (if GPU present)
   - **Disk I/O**: Storage read/write activity
   - **Network Activity**: Network bandwidth usage

*[Screenshot placeholder: Performance Monitor with multiple charts]*

**Step 2: Read and Interpret Charts**

1. **Understanding the Timeline**:
   - **X-axis**: Time progression (typically last 2-5 minutes)
   - **Y-axis**: Percentage or absolute values
   - **Data Points**: Each point represents a 2-second measurement
   - **Live Updates**: Charts scroll left as new data arrives

2. **Chart Interaction**:
   - **Hover for Details**: Mouse over any point for exact values
   - **Tooltip Display**: Shows timestamp and metric value
   - **Color Coding**: Different colors for each metric type
   - **Threshold Lines**: Reference lines at critical thresholds

3. **Performance Patterns to Watch**:
   - **Steady Lines**: Consistent resource usage
   - **Spikes**: Sudden increases in resource consumption
   - **Valleys**: Periods of lower activity
   - **Trending Up/Down**: Gradual changes over time
   - **Oscillation**: Regular up-and-down patterns

*[Screenshot placeholder: Chart with hover tooltip showing exact values]*

**Step 3: Review System Specifications**

Alongside charts, system hardware information is displayed:

1. **CPU Information Panel**:
   - Processor model and manufacturer
   - Number of cores and threads
   - Current clock speed
   - Maximum boost frequency
   - CPU temperature (if available)

2. **Memory Configuration**:
   - Total RAM capacity
   - Memory type (DDR4, DDR5, etc.)
   - Currently available memory
   - Memory usage percentage

3. **GPU Details** (if present):
   - Graphics card model
   - VRAM total and usage
   - GPU temperature
   - Driver version
   - Compute capability

4. **Storage Information**:
   - Disk model and type (SSD, HDD)
   - Total capacity
   - Available space
   - Current I/O rates

*[Screenshot placeholder: Hardware specification panels]*

**Step 4: Monitor for Performance Issues**

Use Performance Monitor to identify problems:

1. **CPU Bottlenecks**:
   - CPU chart consistently above 80-90%
   - Other resources underutilized
   - **Action**: Identify CPU-intensive processes

2. **Memory Pressure**:
   - Memory usage consistently above 85%
   - Frequent swapping activity
   - **Action**: Close applications or add RAM

3. **GPU Saturation**:
   - GPU utilization at 100% for extended periods
   - **Action**: Optimize GPU workloads or upgrade GPU

4. **Disk I/O Bottlenecks**:
   - High I/O wait times
   - Storage at capacity
   - **Action**: Optimize disk usage or upgrade storage

5. **Network Congestion**:
   - Network bandwidth maxed out
   - High latency
   - **Action**: Optimize network usage or upgrade connection

*[Screenshot placeholder: Example charts showing performance bottleneck]*

**Step 5: Correlate Metrics**

Look for relationships between metrics:

1. **CPU and Power Consumption**:
   - High CPU usage should correlate with high power
   - Mismatch may indicate inefficiency

2. **Memory and Disk I/O**:
   - High memory usage with high disk I/O suggests swapping
   - System is using disk as virtual memory

3. **GPU and Power**:
   - GPU-intensive workloads should show in power metrics
   - Helps identify GPU utilization accuracy

---

### Process Metrics

Process Metrics provides detailed, process-level monitoring with AI-powered recommendations for optimization. This is a dedicated page accessible from the sidebar.

#### How to Access Process Metrics

1. **Navigate to Process Metrics**:
   - Look at the left sidebar
   - Find "Process Metrics" in the Dashboard section
   - Click to open the dedicated Process Metrics page
   - **Note**: This opens a separate page (`/processes`), not a tab

*[Screenshot placeholder: Process Metrics option in sidebar]*

#### Understanding the Process Metrics Interface

**Step 1: View the Process Table**

When the page loads, you'll see a comprehensive table of all active processes:

1. **Process Table Columns**:
   - **Process Name**: Application or service identifier
   - **Process ID (PID)**: System-assigned unique identifier
   - **CPU Usage (%)**: Current CPU consumption
   - **Memory Usage (MB)**: RAM consumption in megabytes
   - **Memory Usage (%)**: Percentage of total RAM
   - **GPU Utilization (%)**: GPU usage (if applicable)
   - **GPU Memory (MB)**: GPU VRAM consumption
   - **Power Consumption (W)**: Estimated power usage
   - **Energy Cost ($/hr)**: Cost per hour based on region
   - **IOPS**: Disk input/output operations per second
   - **Open Files**: Number of open file descriptors
   - **Status**: Process state (Running, Sleeping, etc.)

*[Screenshot placeholder: Process Metrics table with all columns visible]*

2. **Table Features**:
   - **Sortable Columns**: Click any column header to sort
   - **Real-time Updates**: Data refreshes every few seconds
   - **Timestamp Display**: Shows when data was last collected
   - **Responsive Design**: Horizontal scroll for many columns

**Step 2: Search and Filter Processes**

1. **Search Bar**:
   - Located at the top of the process table
   - Type to filter processes by name
   - Updates table in real-time as you type
   - Case-insensitive search

2. **Regional Cost Selection**:
   - Dropdown to select region for cost calculation
   - Options based on configured cost models
   - Cost column updates when region changes
   - Helps compare costs across regions

*[Screenshot placeholder: Search bar and region selector]*

**Step 3: Analyze Individual Processes**

1. **Click Any Process Row**:
   - Click anywhere on a process row
   - Opens detailed Process Insights modal
   - Modal overlays the main table

*[Screenshot placeholder: Clicking on a process row]*

2. **Process Insights Modal Contents**:

   **Overview Tab**:
   - Process name and PID
   - Current resource utilization metrics
   - Real-time values (CPU, Memory, GPU, Power)
   - Status and state information

   **Metrics Tab**:
   - Detailed breakdown of all metrics
   - Current values with units
   - Visual progress bars for percentage metrics
   - Color-coded indicators (Green/Yellow/Red)

   **Recommendations Tab**:
   - AI-powered optimization suggestions
   - Categorized by type (Power, CPU, Memory, GPU, Cost)
   - Priority levels (High, Medium, Low)
   - Estimated savings percentages
   - Detailed descriptions and action items

*[Screenshot placeholder: Process Insights modal with tabs]*

**Step 4: Review AI-Powered Recommendations**

The Recommendations tab provides intelligent suggestions:

1. **Recommendation Types**:

   **Power Optimization**:
   - Triggers when power consumption > 25W
   - Critical alert for >50W consumption
   - Suggests frequency scaling or workload distribution
   - Estimated savings: 15-40%

   **CPU Optimization**:
   - Detects CPU bottlenecks (>85% usage)
   - Process-specific suggestions (e.g., browser tab management)
   - Code profiling for development processes
   - Estimated savings: 20-35%

   **Memory Optimization**:
   - High memory usage alerts (>1GB)
   - Application-specific recommendations
   - Memory cleanup suggestions
   - Estimated savings: 10-20%

   **GPU Optimization**:
   - GPU-intensive process detection (>70%)
   - Batch processing suggestions for ML workloads
   - Graphics settings optimization for games
   - Estimated savings: 15-30%

   **Cost Optimization**:
   - Regional cost comparison
   - Off-peak scheduling suggestions
   - Annual savings estimates
   - Estimated savings: varies by region

   **Smart Scheduling**:
   - Peak hour detection
   - Workload deferral recommendations
   - Time-based optimization
   - Estimated savings: 10-40%

*[Screenshot placeholder: Recommendations tab showing different recommendation types]*

2. **Understanding Recommendation Priority**:
   - **High Priority** (Red): Immediate action recommended
   - **Medium Priority** (Yellow): Consider implementing soon
   - **Low Priority** (Green): Optional optimization

3. **Acting on Recommendations**:
   - Read the description for specific actions
   - Estimated savings help prioritize
   - Implement recommendations externally (GreenMatrix monitors but doesn't control processes)

**Step 5: Export Process Data**

1. **Download Current Data**:
   - Look for "Download" or "Export" button
   - Typically in the top-right corner
   - Choose format (CSV for spreadsheets, JSON for APIs)
   - Downloads current process snapshot

2. **Use Cases for Exports**:
   - Historical analysis in external tools
   - Sharing with team members
   - Integration with other monitoring systems
   - Compliance and auditing

*[Screenshot placeholder: Export button and format options]*

**Step 6: Monitor Process Trends**

1. **Identify High-Resource Processes**:
   - Sort by CPU or Memory columns
   - Look for consistently high usage
   - Note processes that spike frequently

2. **Cost Analysis**:
   - Sort by Energy Cost column
   - Identify most expensive processes
   - Compare across different regions
   - Calculate daily/monthly costs

3. **GPU Workload Analysis**:
   - Filter for GPU-using processes
   - Check GPU utilization patterns
   - Identify underutilized GPU resources

---

### Hardware Management

The Hardware Management section allows you to maintain the database of available hardware configurations used in simulations and recommendations.

#### How to Access Hardware Management

1. **Navigate to Hardware Management**:
   - Look at the left sidebar navigation
   - Find "Hardware Management" in the Dashboard section
   - Click to load the hardware database interface

*[Screenshot placeholder: Hardware Management in sidebar]*

#### Understanding the Hardware Database

**Step 1: View Current Hardware Inventory**

When Hardware Management loads, you'll see:

1. **Hardware Table Display**:
   - **Table Headers**: CPU Model, GPU Model, Memory, Power, etc.
   - **Hardware Rows**: Each row represents one hardware configuration
   - **Scroll Area**: Use scroll bars if there are many hardware entries
   - **Action Buttons**: Edit and Delete on each row

*[Screenshot placeholder: Hardware database table showing multiple hardware configurations]*

2. **Information Displayed for Each Hardware**:
   - **CPU Specifications**: Processor model, core count, clock speeds
   - **GPU Information**: Graphics card model, VRAM capacity, compute capabilities
   - **Memory Details**: RAM capacity and specifications
   - **Power Consumption**: CPU and GPU power requirements (TDP)
   - **Action Buttons**: Edit and Delete options for each entry

#### Adding New Hardware to the Database

**Step 2: Add Hardware Configuration**

1. **Start Adding Hardware**:
   - Look for the "Add Hardware" button at the top of the hardware table
   - Click this blue "Add Hardware" button
   - A form modal/popup will appear on your screen

*[Screenshot placeholder: Add Hardware button highlighted]*

2. **Complete the Hardware Form**:

   **CPU Information Section**:
   - **CPU Brand**: Click dropdown to select (Intel, AMD, Apple, ARM, etc.)
   - **CPU Model**: Type the specific processor model name
   - **CPU Cores**: Enter number of physical cores
   - **CPU Threads**: Enter number of logical threads (usually 2x cores for hyperthreading)
   - **Base Frequency (GHz)**: Enter base clock speed
   - **Boost Frequency (GHz)**: Enter maximum boost speed

   **GPU Information Section**:
   - **GPU Brand**: Select from dropdown (NVIDIA, AMD, Intel, None)
   - **GPU Model**: Type specific graphics card model (e.g., "RTX 4090", "A100")
   - **GPU Memory (GB)**: Enter VRAM capacity
   - **Compute Units**: Enter number of CUDA cores, Stream Processors, or compute units
   - **GPU Clock Speed (MHz)**: Enter base GPU frequency

   **System Specifications**:
   - **Total Memory (GB)**: Enter system RAM capacity
   - **CPU Power Consumption (W)**: Enter CPU TDP in watts
   - **GPU Power Consumption (W)**: Enter GPU TDP in watts

*[Screenshot placeholder: Add hardware form with all input fields visible]*

3. **Save the Hardware Configuration**:
   - Review all entered information for accuracy
   - Click the green "Save" button at the bottom of the form
   - The form closes and new hardware appears in the table
   - A success message confirms the addition

**Step 3: Edit Existing Hardware**

1. **Locate Hardware to Edit**:
   - Find the hardware row you want to modify in the table
   - Look for the "Edit" button on the right side of that row
   - Click the "Edit" button (usually a pencil icon)

2. **Modify Hardware Details**:
   - The same form opens with current values pre-filled
   - Change any specifications that need updating
   - All fields are editable just like when adding new hardware

3. **Save Changes**:
   - Click the green "Update" button to save modifications
   - Click "Cancel" if you decide not to make changes
   - Updated information appears immediately in the table

*[Screenshot placeholder: Edit hardware modal with pre-filled values]*

**Step 4: Delete Hardware**

1. **Remove Hardware Entry**:
   - Find the hardware row to delete
   - Click the "Delete" button (trash icon)
   - Confirmation dialog appears

2. **Confirm Deletion**:
   - Click "Confirm" to permanently delete
   - Click "Cancel" to abort deletion
   - Hardware removed from database immediately

**Note**: Be careful when deleting hardware configurations that may be referenced in saved simulations or recommendations.

#### Hardware Database Validation

**Step 5: Understanding Data Validation**

The system automatically validates your hardware entries:

1. **Required Field Checking**:
   - Red asterisks (*) indicate mandatory fields
   - Form won't save until all required fields are complete
   - Error messages appear for missing information

2. **Data Format Validation**:
   - Numeric fields only accept numbers
   - System checks for reasonable value ranges
   - Invalid entries are highlighted with error messages

3. **Duplicate Prevention**:
   - System warns if you enter very similar hardware configurations
   - Prevents accidental duplicate entries in the database

---

### Cost Management

Cost Management allows you to configure regional pricing models for accurate cost analysis across different geographical regions and resource types.

#### How to Access Cost Management

1. **Navigate to Cost Management**:
   - Look at the left sidebar navigation
   - Find "Cost Management" in the Dashboard section
   - Click to load the cost modeling interface

*[Screenshot placeholder: Cost Management in sidebar]*

#### Understanding the Cost Management Interface

**Step 1: Review Current Cost Models**

When Cost Management loads, you'll see:

1. **Cost Models Table**:
   - **Region Column**: Shows geographical regions (US-East, EU-West, Asia-Pacific, etc.)
   - **Resource Type Column**: Different types of resources being priced
   - **Cost per Unit Column**: Price for each unit of the resource
   - **Currency Column**: Currency used for pricing (USD, EUR, GBP, etc.)
   - **Action Buttons**: Edit and Delete options for each cost model

*[Screenshot placeholder: Cost management table showing multiple pricing models by region and resource type]*

2. **Resource Types Available**:
   - **ELECTRICITY_KWH**: Power consumption pricing per kilowatt-hour
   - **COMPUTE_HOUR**: Computing resource pricing per hour
   - **STORAGE_GB**: Storage pricing per gigabyte
   - **NETWORK_GB**: Network transfer pricing per gigabyte

#### Adding New Cost Models

**Step 2: Create Cost Models**

1. **Start Adding a Cost Model**:
   - Look for the "Add Cost Model" button at the top of the cost table
   - Click this blue "Add Cost Model" button
   - A form modal will appear on your screen

*[Screenshot placeholder: Add Cost Model button]*

2. **Complete the Cost Model Form**:

   **Regional Selection**:
   - **Region Dropdown**: Click to select geographical region
   - Choose from available regions (US-East-1, EU-West-1, Asia-Pacific-1, etc.)
   - Or enter custom region name

   **Resource Configuration**:
   - **Resource Type Dropdown**: Click to select resource type
   - Choose from: ELECTRICITY_KWH, COMPUTE_HOUR, STORAGE_GB, or NETWORK_GB

   **Pricing Information**:
   - **Cost per Unit Field**: Enter the numeric cost value
   - **Currency Dropdown**: Select currency (USD, EUR, GBP, JPY, CAD, AUD, INR)
   - Use current market rates for accuracy

*[Screenshot placeholder: Add cost model form showing all input fields]*

3. **Save the Cost Model**:
   - Review all information for accuracy
   - Click the green "Save" button to create the cost model
   - The new cost model appears immediately in the table
   - Success message confirms creation

#### Editing Existing Cost Models

**Step 3: Modify Cost Models**

1. **Locate Cost Model to Edit**:
   - Find the cost model row you want to modify
   - Look for the "Edit" button on the right side of that row
   - Click the "Edit" button

2. **Update Pricing Information**:
   - The form opens with current values pre-filled
   - Modify region, resource type, cost, or currency as needed
   - All fields are editable

3. **Save Changes**:
   - Click "Update" to save your modifications
   - Click "Cancel" to discard changes
   - Updated pricing appears in the table immediately

*[Screenshot placeholder: Edit cost model modal]*

#### Using Cost Models for Analysis

**Step 4: Understanding Cost Model Applications**

Your cost models are automatically used throughout GreenMatrix:

1. **In Dashboard**:
   - Regional cost comparison cards use these models
   - Process energy costs calculated from electricity pricing
   - Real-time cost monitoring

2. **In Process Metrics**:
   - Energy cost column uses configured electricity rates
   - Regional selector changes cost calculations
   - Helps identify most expensive processes

3. **Regional Cost Optimization**:
   - Compare the same workload costs across different regions
   - Identify the most cost-effective regions for deployment
   - Make informed decisions about global infrastructure placement

**Step 5: Best Practices for Cost Management**

1. **Regular Updates**:
   - Update cost models regularly as cloud pricing changes
   - Review quarterly to ensure accuracy
   - Monitor for utility rate changes

2. **Complete Coverage**:
   - Add cost models for all regions where you operate
   - Include all resource types you use (compute, storage, network, electricity)
   - Don't leave gaps in regional coverage

3. **Currency Consistency**:
   - Use consistent currencies for easy comparison
   - Consider using a base currency (like USD) for standardization
   - Update exchange rates if using multiple currencies

4. **Accuracy**:
   - Use current market rates from cloud providers
   - Include all cost factors (taxes, fees, etc.)
   - Verify against actual bills periodically

---

### AI Model Management

AI Model Management allows you to maintain a database of AI models with their specifications, which powers the auto-population feature in User Goals and optimization workflows.

#### How to Access AI Model Management

1. **Navigate to AI Model Management**:
   - Look at the left sidebar
   - Find "AI Model Management" in the Dashboard section
   - Click to load the model database interface

*[Screenshot placeholder: AI Model Management in sidebar]*

#### Understanding the AI Model Database

**Step 1: View Current Model Inventory**

When AI Model Management loads, you'll see:

1. **Model Statistics Cards** (top of page):
   - **Total Models**: Count of models in database
   - **Frameworks**: Number of different frameworks represented
   - **Task Types**: Breakdown of training vs. inference models
   - **Average Parameters**: Average model size across all models

*[Screenshot placeholder: Model statistics cards at top of page]*

2. **Models Table**:
   - **Model Name**: Name of the AI model
   - **Framework**: PyTorch, TensorFlow, JAX, etc.
   - **Task Type**: Training, Inference, Fine-tuning
   - **Parameters (M)**: Total parameters in millions
   - **Model Size (MB)**: Storage size
   - **Architecture**: Transformer, CNN, RNN, etc.
   - **Precision**: FP32, FP16, INT8, etc.
   - **GFLOPs**: Computational requirements
   - **Action Buttons**: Edit and Delete options

*[Screenshot placeholder: Models database table with all columns]*

3. **Search and Filter**:
   - Search bar at top to filter by name, framework, or task type
   - Real-time filtering as you type
   - Clear button to reset search

#### Adding New AI Models

**Step 2: Add Model to Database**

1. **Start Adding Model**:
   - Click the "Add Model" button at top of table
   - Large form modal appears with all model fields

*[Screenshot placeholder: Add Model button]*

2. **Complete Model Information Form**:

   **Basic Information**:
   - **Model Name**: Enter model name (e.g., "BERT-Base", "GPT-3.5")
   - **Framework**: Select from dropdown (PyTorch, TensorFlow, JAX, ONNX, Hugging Face)
   - **Task Type**: Select from dropdown (Inference, Training, Fine-tuning, Transfer Learning)

   **Model Specifications**:
   - **Total Parameters (Millions)**: Enter parameter count
   - **Model Size (MB)**: Enter storage size
   - **Architecture Type**: Enter architecture (Transformer, CNN, RNN, etc.)
   - **Model Type**: Specific variant (Encoder-only, Decoder-only, etc.)

   **Advanced Parameters**:
   - **Number of Hidden Layers**: Enter layer count
   - **Embedding Vector Dimension**: Enter embedding size
   - **Precision**: Select from dropdown (FP32, FP16, BF16, INT8, INT4)
   - **Vocabulary Size**: Enter vocabulary size for language models
   - **FFN Dimension**: Feed-forward network dimension
   - **Activation Function**: Select from dropdown (silu, gelu, relu, etc.)
   - **GFLOPs (Billions)**: Computational requirements
   - **Number of Attention Layers**: For transformer models

*[Screenshot placeholder: Add model form with all fields visible]*

3. **Save the Model**:
   - Review all entered data
   - Click green "Save" button
   - Success message appears
   - Model appears in table immediately
   - Statistics cards update with new model

**Step 3: Edit Existing Models**

1. **Select Model to Edit**:
   - Find model row in table
   - Click "Edit" button (pencil icon)
   - Form opens with current values pre-filled

2. **Update Model Information**:
   - Modify any fields as needed
   - All fields are editable
   - Common edits: GFLOPs, model size, precision

3. **Save Changes**:
   - Click "Update" button
   - Click "Cancel" to abort
   - Changes reflect immediately in table

*[Screenshot placeholder: Edit model modal]*

**Step 4: Delete Models**

1. **Remove Model**:
   - Click "Delete" button on model row
   - Confirmation dialog appears
   - Click "Confirm" to delete permanently

**Warning**: Deleting a model affects:
- User Goals auto-population
- Historical references to this model
- Only delete if you're certain the model won't be needed

#### How Model Database Powers User Goals

**Step 5: Understanding Model Database Integration**

The model database enables powerful automation:

1. **Auto-Population in User Goals**:
   - When you select a model name in User Goals
   - System looks up model in this database
   - Automatically fills all specifications
   - Saves time and ensures accuracy

2. **Consistency Across Features**:
   - Same model data used everywhere
   - No discrepancies in model specifications
   - Single source of truth for model information

3. **Custom Models**:
   - Add your own proprietary models
   - Include fine-tuned variants
   - Maintain organization-specific model library

**Best Practices for Model Management**

1. **Complete Information**:
   - Fill all fields when adding models
   - GFLOPs is critical for compute estimates
   - Accurate specifications ensure reliable recommendations

2. **Naming Conventions**:
   - Use clear, descriptive names
   - Include size/variant in name (e.g., "BERT-Base", "BERT-Large")
   - Consistent naming helps with searching

3. **Regular Updates**:
   - Update when new model versions release
   - Modify specifications if measurements improve
   - Remove deprecated models

4. **Documentation**:
   - Keep external documentation of model sources
   - Note where specifications were obtained
   - Track model versions and changes

---

## GreenMatrix AI Optimization Features

The GreenMatrix AI optimization features provide tools for hardware selection and model optimization based on your configured User Goals.

### Hardware Recommendations

The Hardware Recommendations feature provides optimal hardware suggestions for AI workload deployment in both pre-deployment (planning) and post-deployment (optimization) scenarios.

#### How to Access Hardware Recommendations

1. **Navigate to Hardware Recommendations**:
   - Look at the left sidebar navigation
   - Find "Hardware Recommendations" in the AI Optimization section
   - Click to load the recommendation interface
   - **Note**: This opens the AI Workload Optimizer page (`/workload`)

*[Screenshot placeholder: Hardware Recommendations in sidebar]*

#### Understanding Pre-deployment vs. Post-deployment Modes

**Step 1: Choose Your Mode**

At the top of the page, you'll see a mode toggle:

1. **Pre-deployment Mode**:
   - Use when planning a new AI model deployment
   - Don't have actual resource utilization data yet
   - Based on model specifications and expected workload
   - Provides best hardware recommendations for optimal performance

2. **Post-deployment Mode**:
   - Use when you already have a model running
   - Leverages actual resource utilization metrics
   - Provides recommendations to improve current setup
   - Can analyze both bare-metal and VM environments

*[Screenshot placeholder: Pre/Post-deployment toggle switch]*

#### Pre-deployment Workflow

**Step 2A: Configure for Pre-deployment Analysis**

If User Goals is configured, fields auto-populate:

1. **Review Auto-Populated Fields**:
   - Model Name, Task Type, Framework already filled
   - Model specifications loaded from database
   - Task-specific fields (batch size, input size, etc.) populated
   - All fields can be manually overridden if needed

*[Screenshot placeholder: Pre-deployment form with auto-populated fields from User Goals]*

2. **Manual Configuration** (if not using User Goals):
   - Select Model Name from dropdown
   - Choose Task Type (Training or Inference)
   - Framework auto-fills from model database
   - Select Scenario (Single Stream or Server)
   - Configure task-specific parameters
   - Use "Load More Parameters" for advanced options

3. **Run Pre-deployment Recommendation**:
   - Scroll to bottom of form
   - Click green "Get Recommended Configuration" button
   - Wait for analysis (10-20 seconds)
   - Results appear below the form

*[Screenshot placeholder: Get Recommended Configuration button]*

#### Post-deployment Workflow

**Step 2B: Configure for Post-deployment Analysis**

Post-deployment has two sub-modes:

1. **Bare-Metal Mode**:
   - Analyzing workload on physical host
   - Uses host-level metrics
   - Recommends hardware upgrades or migrations

2. **VM-Level Mode**:
   - Analyzing workload inside a virtual machine
   - Uses VM-specific metrics
   - Recommends VM right-sizing or migration

*[Screenshot placeholder: Bare-metal vs VM-level mode selector]*

**Bare-Metal Post-deployment Steps**:

1. **Configure Model Parameters**:
   - Same as pre-deployment
   - Auto-populated from User Goals if configured
   - Represents your currently running model

2. **Review Resource Metrics**:
   - Look for "Resource Metrics" section
   - System provides default values:
     - GPU Utilization %
     - GPU Memory Usage %
     - CPU Utilization %
     - CPU Memory Usage %
     - Disk IOPS
     - Network Bandwidth
   - These defaults come from real-time monitoring if available

*[Screenshot placeholder: Resource Metrics section with default values]*

3. **Override Metrics** (Optional):
   - Toggle "Override Metrics" switch
   - Manually enter actual resource usage values
   - Useful if defaults don't match your observations
   - All fields become editable

4. **Select Current Hardware**:
   - Choose your current hardware configuration from dropdown
   - Helps system understand baseline for comparison
   - Options from Hardware Management database

5. **Set Optimization Priority**:
   - **Balanced**: Equal weight to performance and cost (default)
   - **Performance-focused**: Prioritize performance over cost
   - **Cost-focused**: Prioritize cost savings over performance

*[Screenshot placeholder: Optimization priority radio buttons]*

6. **Generate Recommendations**:
   - Click "Get Recommended Configuration" button
   - System analyzes current usage and model requirements
   - Recommendations appear below

**VM-Level Post-deployment Steps**:

1. **Select VM from Dropdown**:
   - System detects active VMs automatically
   - Choose the VM running your workload
   - VM details load automatically

2. **Auto-Fetch VM Metrics**:
   - Click "Fetch Metrics from VM" button
   - System retrieves real-time VM resource usage
   - Metrics auto-populate in form fields

*[Screenshot placeholder: VM selection and fetch metrics button]*

3. **Review/Override VM Metrics**:
   - VM-specific resource utilization loads
   - Can override if needed
   - Includes VM-level CPU, memory, GPU metrics

4. **Configure Optimization**:
   - Select current hardware (VM's allocated resources)
   - Set optimization priority
   - Click "Get Recommended Configuration"

#### Understanding Recommendation Results

**Step 3: Review Your Recommendations**

After clicking "Get Recommended Configuration", results appear:

1. **Primary Recommendation Card**:
   - **Highlighted Box**: Main recommended hardware
   - **Hardware Configuration**: Specific GPU/CPU combination
   - **Justification**: Why this hardware was recommended
   - **Performance Estimates**: Expected latency/throughput
   - **Cost Analysis**: Total cost of ownership

*[Screenshot placeholder: Primary recommendation card with details]*

2. **Recommendation Details**:

   **Hardware Specifications**:
   - GPU model and VRAM
   - CPU model and core count
   - Required system memory
   - Power consumption estimates

   **Performance Metrics**:
   - Expected latency (ms)
   - Throughput (requests/second)
   - Training time estimates (for training tasks)
   - Inference speed (for inference tasks)

   **Cost Analysis**:
   - Hardware acquisition cost
   - Operational cost (power, cooling)
   - Cost per 1000 inferences
   - ROI timeline

*[Screenshot placeholder: Detailed recommendation metrics]*

3. **Strengths and Considerations**:

   **Strengths Section**:
   - Performance advantages
   - Cost efficiency benefits
   - Compatibility advantages
   - Future-proofing aspects

   **Considerations Section**:
   - Implementation complexity
   - Migration challenges
   - Compatibility requirements
   - Potential limitations

*[Screenshot placeholder: Strengths and Considerations sections]*

4. **Alternative Recommendations**:
   - Shows 2-3 alternative hardware options
   - Compare metrics across alternatives
   - Different cost/performance trade-offs
   - Ranked by suitability

5. **Confidence Score**:
   - Numerical score (1-10 scale)
   - Higher scores = more reliable recommendations
   - Scores >7 are highly reliable
   - Based on data completeness and model certainty

**Step 4: Export Recommendations**

1. **Access Export Options**:
   - Look for "Export" dropdown in results section
   - Click to see format options

2. **Choose Format**:
   - **JSON**: For programmatic use and API integration
   - **CSV**: For spreadsheet analysis
   - **HTML Report**: Formatted document for sharing with stakeholders

3. **Download**:
   - File downloads to your browser's download folder
   - Includes all recommendations and analysis details
   - Timestamped for version control

*[Screenshot placeholder: Export dropdown with format options]*

#### Special Features

**VM-Level Optimization**:
- Specific recommendations for VM right-sizing
- Migration suggestions (Docker, LXD, KVM)
- Container optimization guidance
- Resource allocation tuning

**Post-deployment Benefits**:
- Uses real usage data for accuracy
- Identifies over-provisioned resources
- Detects underutilized hardware
- Recommends cost-saving changes

---

### Model Optimizer

The Model Optimizer provides guidance for optimizing AI models through various techniques to reduce resource requirements while maintaining performance.

#### How to Access Model Optimizer

1. **Navigate to Model Optimizer**:
   - Look at the left sidebar navigation
   - Find "Model Optimizer" in the AI Optimization section
   - Click to load the optimizer interface
   - **Note**: Opens on AI Workload Optimizer page, switches to Model Optimizer tab

*[Screenshot placeholder: Model Optimizer in sidebar]*

#### Step-by-Step Model Optimization Process

**Step 1: Configure Your Model**

If User Goals is configured, fields auto-populate:

1. **Review Auto-Populated Configuration**:
   - Model Name, Task Type, Framework filled from User Goals
   - All model specifications loaded
   - Task-specific fields populated
   - Advanced parameters included if previously set

*[Screenshot placeholder: Auto-populated model configuration in Model Optimizer]*

2. **Manual Configuration** (if not using User Goals):
   - Select Model Name from dropdown
   - Choose Task Type (Training or Inference)
   - Framework auto-fills from model database
   - Select Scenario (Single Stream or Server)
   - Fill task-specific fields (batch size, input size, etc.)
   - Use "Load More Parameters" for advanced config

**Step 2: Set Optimization Goals**

1. **Choose Primary Optimization Goal**:
   - Look for optimization goal radio buttons
   - **Performance Improvement**: Focus on faster inference/training
   - **Memory Reduction**: Focus on reducing model memory footprint
   - **Energy Efficiency**: Focus on lower power consumption

2. **Goal Impacts**:
   - Performance: Recommends techniques like operator fusion, graph optimization
   - Memory: Suggests quantization, pruning, knowledge distillation
   - Energy: Focuses on lower precision, efficient architectures

*[Screenshot placeholder: Optimization goal selection radio buttons]*

**Step 3: Generate Optimization Recommendations**

1. **Run Optimization Analysis**:
   - Scroll to bottom of configuration form
   - Click blue "Optimize Model" button
   - Wait for analysis (15-30 seconds)
   - Loading spinner indicates processing

2. **Processing**:
   - System analyzes model characteristics
   - Evaluates applicable optimization techniques
   - Calculates expected benefits and trade-offs
   - Generates ranked recommendations

*[Screenshot placeholder: Optimize Model button and loading state]*

#### Understanding Optimization Results

**Step 4: Review Optimization Techniques**

Results appear in structured sections:

1. **Primary Optimization Method**:
   - **Technique Name**: e.g., "INT8 Quantization", "Structured Pruning"
   - **Description**: What the technique does
   - **Applicability**: Why it's suitable for your model
   - **Expected Benefits**: Quantified improvements

*[Screenshot placeholder: Primary optimization recommendation card]*

**Common Optimization Techniques**:

**Quantization**:
- Reduces numerical precision (FP32 → INT8 or INT4)
- Decreases model size by 50-75%
- Improves inference speed by 2-4x
- May slightly reduce accuracy (typically <1%)
- Best for: Inference workloads

**Pruning**:
- Removes unnecessary model parameters
- Two types: Unstructured (individual weights) or Structured (entire neurons/channels)
- Model size reduction: 30-80%
- Requires retraining or fine-tuning
- Best for: Models with redundancy

**Knowledge Distillation**:
- Creates smaller "student" model from larger "teacher" model
- Significant size reduction (10-100x)
- Maintains most of original performance
- Requires training infrastructure
- Best for: When starting from large pre-trained models

**Graph Optimization**:
- Optimizes computation graph
- Operator fusion, constant folding
- 10-30% speedup without accuracy loss
- No retraining required
- Best for: Inference optimization

**Mixed Precision**:
- Uses different precisions for different operations
- FP16 for most operations, FP32 for sensitive parts
- 2x speedup with minimal accuracy impact
- Requires hardware support (Tensor Cores)
- Best for: Training and inference on modern GPUs

*[Screenshot placeholder: Different optimization technique cards]*

2. **Secondary Optimization Methods**:
   - Complementary techniques
   - Can be combined with primary method
   - Compound benefits possible
   - Implementation order suggested

3. **Precision Recommendations**:
   - Optimal precision configuration
   - Hardware-specific suggestions
   - Mixed precision strategies
   - Accuracy vs. speed trade-offs

**Step 5: Analyze Benefits and Trade-offs**

1. **Expected Benefits**:
   - **Model Size Reduction**: Percentage decrease in storage
   - **Inference Speed**: Expected speedup multiplier
   - **Memory Usage**: RAM/VRAM reduction
   - **Energy Efficiency**: Power consumption decrease
   - **Cost Savings**: Operational cost reduction

*[Screenshot placeholder: Benefits section with percentage improvements]*

2. **Trade-offs and Considerations**:
   - **Accuracy Impact**: Expected accuracy change (usually minimal)
   - **Implementation Complexity**: Easy, Medium, or Hard
   - **Retraining Required**: Yes/No and estimated time
   - **Hardware Requirements**: Specific hardware needs
   - **Production Readiness**: Maturity of technique

3. **Compatibility Analysis**:
   - Framework support (PyTorch, TensorFlow, ONNX)
   - Hardware compatibility
   - Deployment platform support
   - Library/tool requirements

**Step 6: Implementation Guidance**

1. **Step-by-Step Instructions**:
   - Numbered implementation steps
   - Code examples (if applicable)
   - Configuration parameters
   - Best practices

2. **Required Tools**:
   - Software libraries needed
   - Version requirements
   - Installation instructions
   - Documentation links

*[Screenshot placeholder: Implementation guide section]*

3. **Validation Procedures**:
   - How to test optimized model
   - Accuracy validation steps
   - Performance benchmarking
   - Quality assurance checklist

4. **Monitoring Recommendations**:
   - Metrics to track post-optimization
   - Performance baselines to establish
   - Regression testing suggestions
   - Production monitoring guidance

**Step 7: Export Optimization Guide**

1. **Export Complete Guide**:
   - Find "Export" dropdown in results section
   - Choose format:
     - **JSON**: For automation and CI/CD integration
     - **HTML**: Formatted documentation to share
     - **PDF**: Printable implementation guide (if available)

2. **Export Contents**:
   - All optimization recommendations
   - Implementation steps
   - Expected benefits
   - Validation procedures
   - Tool and library requirements

*[Screenshot placeholder: Export optimization guide]*

#### Advanced Features

**Multi-Technique Optimization**:
- Combine multiple techniques
- Quantization + Pruning
- Knowledge Distillation + Graph Optimization
- Compound benefits
- Implementation sequencing

**Hardware-Specific Optimization**:
- Recommendations tailored to target hardware
- NVIDIA TensorRT for NVIDIA GPUs
- Intel OpenVINO for Intel CPUs
- Apple Neural Engine for Apple Silicon
- Cloud-specific optimizations

---

## System Insights and Recommendations

The System Insights and Recommendations feature provides AI-powered analysis of your system's performance, cost efficiency, and optimization opportunities based on historical data from monitoring.

### How to Access System Insights

System Insights can be accessed from the Dashboard:

1. **Navigate to Dashboard Overview**:
   - Click "Dashboard Overview" in the sidebar
   - Scroll to the bottom of the dashboard page

2. **Locate the System Insights Section**:
   - Found at the bottom of the Dashboard Overview page
   - Titled "System Insights and Recommendations"
   - Always visible on the dashboard

*[Screenshot placeholder: System Insights section location on dashboard]*

### Understanding the System Insights Interface

**Step 1: Configure Analysis Parameters**

Before generating insights:

1. **Select Time Range**:
   - Look for "Time Range" dropdown
   - Options: Last 7 days, Last 30 days, Last 90 days
   - Longer ranges provide more comprehensive insights
   - Default: Last 7 days

2. **Choose Date Range** (Alternative):
   - Use date picker for custom range
   - Select start and end dates
   - Useful for analyzing specific periods
   - Example: Monthly cost analysis

*[Screenshot placeholder: Time range selector and date picker]*

**Step 2: Generate Insights**

1. **Click "Generate Insights" Button**:
   - System fetches data from backend
   - Analyzes historical metrics
   - Applies AI recommendation engine
   - Process takes 5-15 seconds

2. **Loading State**:
   - Loading spinner appears during analysis
   - "Analyzing system data..." message
   - Don't navigate away during processing

**Note**: Insights automatically fetch when dashboard loads, but can be refreshed manually.

*[Screenshot placeholder: Generate Insights button and loading state]*

### Understanding Recommendation Categories

System Insights are organized into four main categories:

#### Category 1: Cost Optimization

Recommendations to reduce operational costs:

**Types of Cost Recommendations**:

1. **Underutilized Resource Detection**:
   - Identifies processes using minimal CPU/memory
   - Suggests consolidation or termination
   - Estimated savings in $/month

2. **Power Efficiency Opportunities**:
   - High-power processes running unnecessarily
   - Off-peak scheduling suggestions
   - Power management configuration

3. **VM Right-Sizing**:
   - Over-provisioned VMs using <20% of allocated resources
   - Suggests smaller VM configurations
   - Cost reduction estimates

**Regional cost optimization recommendations (location/migration-based) are currently disabled.**

*[Screenshot placeholder: Cost optimization recommendations list]*

**Reading Cost Recommendations**:
- **Title**: Brief description of opportunity
- **Description**: Detailed explanation and action items
- **Estimated Savings**: Dollar amount or percentage
- **Priority**: High, Medium, Low
- **Affected Resources**: Which processes/VMs impacted

#### Category 2: Performance Optimization

Recommendations to improve system performance:

**Types of Performance Recommendations**:

1. **Resource Bottleneck Detection**:
   - Identifies CPU, memory, or GPU bottlenecks
   - Suggests hardware upgrades or configuration changes
   - Performance improvement estimates

2. **Process Optimization**:
   - High-CPU processes that could be optimized
   - Memory-intensive applications
   - Disk I/O bottlenecks

3. **Workload Distribution**:
   - Unbalanced resource utilization
   - Load balancing opportunities
   - Multi-threading suggestions

4. **GPU Underutilization**:
   - GPU sitting idle or barely used
   - Suggests workload migration to GPU
   - AI/ML workload acceleration opportunities

*[Screenshot placeholder: Performance optimization recommendations]*

**Reading Performance Recommendations**:
- **Title**: Performance issue identified
- **Description**: Root cause and solution
- **Expected Improvement**: Speed increase or latency reduction
- **Implementation Effort**: Easy, Medium, Hard
- **Prerequisites**: Any required hardware/software

#### Category 3: Scaling Recommendations

Recommendations for resource scaling:

**Types of Scaling Recommendations**:

1. **Scale-Up Recommendations**:
   - Resources consistently maxed out (>85%)
   - Suggests adding CPU cores, memory, or GPUs
   - Prevents performance degradation

2. **Scale-Down Recommendations**:
   - Resources consistently underutilized (<20%)
   - Suggests reducing allocation
   - Cost savings from downsizing

3. **Auto-Scaling Configuration**:
   - Variable workload patterns detected
   - Suggests dynamic scaling policies
   - Cloud-specific auto-scaling recommendations

4. **Capacity Planning**:
   - Trend analysis of resource growth
   - Future capacity needs prediction
   - Proactive scaling timeline

*[Screenshot placeholder: Scaling recommendations with trend charts]*

**Reading Scaling Recommendations**:
- **Title**: Scale-up or scale-down opportunity
- **Current State**: Existing resource allocation and usage
- **Recommended Change**: New resource allocation
- **Impact**: Performance and cost implications
- **Timeline**: When to implement

#### Category 4: Maintenance and Security

System health and maintenance recommendations:

**Types of Maintenance Recommendations**:

1. **Zombie Process Cleanup**:
   - Detects stopped or defunct processes
   - Cleanup instructions
   - System health impact

2. **Memory Leak Detection**:
   - Processes with growing memory usage
   - Investigation and remediation steps
   - Monitoring guidance

3. **Log and Disk Cleanup**:
   - High disk usage from logs
   - Cleanup and rotation recommendations
   - Automated maintenance scripts

4. **Update Notifications**:
   - Outdated driver or software versions
   - Performance/security benefits of updating
   - Compatibility checks

*[Screenshot placeholder: Maintenance recommendations list]*

### Interpreting Recommendation Priority

Each recommendation has a priority level:

1. **High Priority** (Red Badge):
   - Critical issues affecting performance or cost
   - Immediate action recommended
   - Significant impact if addressed

2. **Medium Priority** (Yellow Badge):
   - Important but not urgent
   - Implement within next month
   - Moderate impact

3. **Low Priority** (Green Badge):
   - Nice-to-have optimizations
   - Implement when convenient
   - Incremental improvements

*[Screenshot placeholder: Recommendations with different priority badges]*

### Using the Insights Data

**Step 3: Take Action on Recommendations**

1. **Review Each Recommendation**:
   - Read title and description carefully
   - Understand the problem and solution
   - Check estimated impact

2. **Prioritize Actions**:
   - Start with High priority items
   - Group similar recommendations
   - Create action plan

3. **Implement Changes**:
   - Follow the provided guidance
   - Test in non-production first
   - Monitor impact after implementation

**Note**: GreenMatrix provides recommendations but doesn't automatically implement changes. You maintain full control over your system.

### Downloading Reports

**Step 4: Export System Insights**

1. **Access Download Options**:
   - Look for "Download Report" button
   - Located in the System Insights section header
   - Multiple format options available

*[Screenshot placeholder: Download Report button]*

2. **Choose Report Format**:
   - **HTML Report**:
     - Formatted, readable document
     - Includes charts and visualizations
     - Best for sharing with stakeholders
     - Opens in web browser

   - **PDF Report**:
     - Printable format
     - Professional formatting
     - Includes all recommendations
     - Best for documentation

   - **JSON Export**:
     - Structured data format
     - For programmatic analysis
     - API integration
     - Custom reporting tools

3. **Report Contents**:
   - Executive summary
   - All recommendations by category
   - System metrics and trends
   - Time period analyzed
   - Timestamp and metadata

*[Screenshot placeholder: Downloaded HTML report preview]*

### Backend vs. Client-Side Analysis

**Understanding Data Sources**:

1. **Backend Recommendations** (Primary):
   - Generated by backend recommendation engine
   - Uses historical database data
   - More comprehensive analysis
   - Machine learning-based insights

2. **Client-Side Analysis** (Fallback):
   - If backend unavailable
   - Based on current browser session data
   - Limited to visible data
   - Basic rule-based recommendations

3. **Hybrid Approach**:
   - System tries backend first
   - Falls back to client-side if needed
   - "Backend not available - using cached analysis" message
   - Seamless user experience

*[Screenshot placeholder: Backend availability indicator]*

### Best Practices for System Insights

1. **Regular Review**:
   - Check insights weekly or monthly
   - Track implementation of recommendations
   - Monitor impact of changes

2. **Longer Time Ranges**:
   - Use 30-90 day ranges for comprehensive analysis
   - Identifies long-term trends
   - More accurate recommendations

3. **Baseline Establishment**:
   - Note current metrics before changes
   - Measure improvement after implementation
   - Validate recommendation accuracy

4. **Iterative Optimization**:
   - Implement highest-priority items first
   - Re-generate insights after changes
   - Continuous improvement cycle

---

## Export and Reporting

### Report Generation

All analysis features in GreenMatrix provide comprehensive export capabilities for documentation, sharing, and integration with other tools.

#### Export Formats

Three primary export formats are available across all features:

1. **JSON Format**:
   - **Use Case**: Programmatic analysis, API integration, data pipelines
   - **Contents**: Structured data with all metrics and recommendations
   - **Benefits**: Machine-readable, easy to parse, versioned data
   - **File Extension**: `.json`
   - **Opens With**: Text editors, JSON viewers, custom applications

2. **CSV Format**:
   - **Use Case**: Spreadsheet analysis, data manipulation, reporting
   - **Contents**: Tabular data with metrics in rows and columns
   - **Benefits**: Universal compatibility, Excel/Google Sheets native
   - **File Extension**: `.csv`
   - **Opens With**: Excel, Google Sheets, LibreOffice Calc, data tools

3. **HTML Report Format**:
   - **Use Case**: Sharing with stakeholders, documentation, presentations
   - **Contents**: Formatted document with visualizations and explanations
   - **Benefits**: Professional appearance, self-contained, browser-viewable
   - **File Extension**: `.html`
   - **Opens With**: Any web browser

*[Screenshot placeholder: Export format options dropdown]*

#### Report Contents by Feature

**Hardware Recommendations Export Includes**:
- Input configuration (model, task type, all parameters)
- Primary recommendation with justification
- Alternative hardware options
- Performance estimates (latency, throughput)
- Cost analysis and ROI calculations
- Strengths and considerations
- Confidence score
- Timestamp and metadata

**Model Optimizer Export Includes**:
- Model configuration details
- Optimization goal selected
- Primary optimization technique
- Secondary optimization methods
- Expected benefits (size, speed, efficiency)
- Implementation instructions
- Validation procedures
- Tool requirements
- Trade-off analysis
- Timestamp and metadata

**System Insights Report Includes**:
- Executive summary of findings
- Time period analyzed
- System overview metrics
- All recommendations by category (Cost, Performance, Scaling, Maintenance)
- Priority-sorted action items
- Estimated savings and improvements
- Charts and visualizations (HTML/PDF only)
- Timestamp and system information

**Process Metrics Export Includes**:
- Current process snapshot
- All process-level metrics
- Resource utilization data
- Cost calculations by region
- Timestamp of data collection

*[Screenshot placeholder: Sample HTML report header and sections]*

#### How to Export from Each Feature

**From Hardware Recommendations**:
1. Run analysis and get recommendations
2. Scroll to results section
3. Look for "Export" dropdown button
4. Click dropdown to see format options
5. Click desired format (JSON, CSV, or HTML)
6. File downloads automatically

**From Model Optimizer**:
1. Generate optimization recommendations
2. Review results
3. Find "Export" dropdown in results area
4. Select format
5. Download begins immediately

**From System Insights**:
1. Generate insights on Dashboard
2. Locate "Download Report" button in insights section
3. Click to see format options
4. Choose format based on intended use
5. Report downloads with timestamp

**From Process Metrics**:
1. Access Process Metrics page
2. Look for "Export" or "Download" button
3. Select format (typically CSV or JSON)
4. Downloads current process data snapshot

*[Screenshot placeholder: Export button locations in different features]*

#### Report File Naming

Files are automatically named with descriptive names and timestamps:

- **Hardware Recommendations**: `hardware_recommendation_YYYYMMDD_HHMMSS.{format}`
- **Model Optimizer**: `model_optimization_YYYYMMDD_HHMMSS.{format}`
- **System Insights**: `system_insights_report_YYYYMMDD_HHMMSS.{format}`
- **Process Metrics**: `process_metrics_YYYYMMDD_HHMMSS.{format}`

This ensures:
- Easy identification of report type
- Chronological sorting
- No file overwrites
- Version tracking

#### Using Exported Data

**JSON Files**:
- Import into Python/R for statistical analysis
- Integrate with monitoring dashboards (Grafana, Datadog)
- Feed into CI/CD pipelines
- Store in data warehouses
- Automate report generation

**CSV Files**:
- Open in Excel for pivot tables and charts
- Import into BI tools (Tableau, Power BI)
- Merge with other data sources
- Create custom reports
- Share with non-technical stakeholders

**HTML Reports**:
- Email to management and teams
- Embed in documentation wikis
- Archive for compliance
- Present in meetings (open in browser)
- Print for physical documentation

*[Screenshot placeholder: CSV file opened in Excel showing data]*

#### Best Practices for Reporting

1. **Regular Exports**:
   - Export baseline reports before changes
   - Create weekly/monthly snapshots
   - Track progress over time
   - Build historical archive

2. **Organized Storage**:
   - Create folders by month/quarter
   - Separate by report type
   - Use consistent naming conventions
   - Version control important reports

3. **Report Customization**:
   - Use JSON exports for custom report builders
   - Combine multiple exports for comprehensive views
   - Filter CSV data for specific insights
   - Annotate HTML reports with implementation notes

4. **Sharing Guidelines**:
   - Use HTML for executive summaries
   - CSV for technical teams needing data
   - JSON for automation and integration
   - Redact sensitive information before external sharing

5. **Compliance and Auditing**:
   - Retain reports for compliance periods
   - Timestamp all exports
   - Track who generated each report
   - Document actions taken based on reports

---

## Troubleshooting

### Common Issues and Resolution

This section provides comprehensive troubleshooting guidance for common issues encountered during GreenMatrix operation.

#### System Monitoring Issues

**Issue: No monitoring data appearing in dashboard**

**Symptoms:**
- Empty dashboard displays with no metrics
- "No data available" messages in monitoring sections
- Charts showing flat lines or no data points

**Diagnostic Steps:**
1. **Verify Backend Connection**:
   - Check browser console for error messages (F12 → Console tab)
   - Look for network errors or 404/500 responses
   - Verify backend URL is accessible

2. **Network Connectivity**:
   - Ensure your computer has internet connection
   - Check firewall isn't blocking requests
   - Verify proxy settings if in corporate environment

3. **Browser Compatibility**:
   - Use modern browsers (Chrome 90+, Firefox 88+, Edge 90+)
   - Clear browser cache (Ctrl+Shift+Delete)
   - Disable problematic browser extensions
   - Try incognito/private mode

4. **Backend Service Status**:
   - Contact system administrator
   - Check if backend servers are running
   - Verify database connectivity

**Resolution Procedures:**
- Refresh the page (F5 or Ctrl+R)
- Clear browser cache and reload
- Try different browser
- Contact support with error messages from console

*[Screenshot placeholder: Browser console showing typical errors]*

**Issue: Intermittent data gaps in monitoring**

**Symptoms:**
- Sporadic missing data points in charts
- Inconsistent metric collection intervals
- Partial data availability for some metrics

**Diagnostic Steps:**
1. **Network Performance**: Check for network instability
2. **System Resources**: Ensure your computer isn't resource-constrained
3. **Backend Performance**: Verify backend server health

**Resolution Procedures:**
- Check network connection stability
- Close unnecessary browser tabs
- Refresh the dashboard
- Wait for backend to stabilize if under heavy load

#### AI Optimization Feature Issues

**Issue: User Goals not auto-populating in optimization features**

**Symptoms:**
- Fields remain empty when navigating to Hardware Recommendations
- Model Optimizer doesn't load saved configuration
- Have to manually fill all fields

**Diagnostic Steps:**
1. **Verify User Goals Saved**: Navigate to User Goals and check if configuration exists
2. **Check Model Name**: Ensure Model Name is selected in User Goals
3. **Task Type Selection**: Verify Task Type is chosen

**Resolution:**
- Go to User Goals tab
- Select Model Name and Task Type at minimum
- Click "Save Configuration" button
- Navigate back to Hardware Recommendations or Model Optimizer
- Fields should now auto-populate

**Issue: GFLOPs field not saving in User Goals**

**Symptoms:**
- Enter value in "Computational Requirements (GFLOPs)" field
- Click Save Configuration
- Value disappears on page reload

**This is a known issue that has been fixed. Update to the latest version of GreenMatrix.**

**Workaround (if on old version)**:
- Enter GFLOPs value
- Save configuration
- Immediately verify it saved by reloading User Goals
- If still not saving, manually enter in Hardware Recommendations/Model Optimizer

**Issue: Simulation or recommendation generation failures**

**Symptoms:**
- "Analysis failed" error messages
- Empty recommendation results
- Timeout errors during analysis
- Incomplete results

**Diagnostic Steps:**
1. **Check Input Data**: Verify all required fields are filled
2. **Model Database**: Ensure selected model exists in AI Model Management
3. **Hardware Database**: Verify hardware configurations are added
4. **Numeric Values**: Ensure numeric fields contain valid numbers

**Resolution Procedures:**
- Complete all required form fields (marked with *)
- Use valid numeric values (no text in number fields)
- Ensure Model Name exists in AI Model Management database
- Check Hardware Management has at least one hardware configuration
- Try with different model or simpler configuration
- Check browser console for specific error details

*[Screenshot placeholder: Error message examples]*

#### Virtual Machine Monitoring Issues

**Issue: VMs not appearing in dashboard or recommendations**

**Symptoms:**
- No VMs shown in VM monitoring section
- VM dropdown empty in post-deployment mode
- "No VMs detected" message

**Diagnostic Steps:**
1. **VM Detection**: Verify VMs are actually running on the system
2. **Backend Support**: Check if backend has VM monitoring enabled
3. **Permissions**: Ensure monitoring has permissions to detect VMs

**Resolution:**
- Verify VMs are running (Docker, LXD, KVM)
- Check backend configuration for VM support
- Contact administrator for VM monitoring setup
- Use bare-metal mode if VMs not needed

**Issue: VM metrics not loading in post-deployment**

**Symptoms:**
- "Failed to fetch VM metrics" error
- Metrics remain at default values
- "Fetch Metrics from VM" button doesn't work

**Resolution:**
- Ensure VM is running (not stopped or paused)
- Verify VM has monitoring agent installed
- Check VM network connectivity
- Try selecting a different VM
- Use manual override to enter metrics

#### Performance and Display Issues

**Issue: Dashboard slow to load or update**

**Symptoms:**
- Long loading times (>10 seconds)
- Laggy interface interactions
- Charts stuttering or freezing

**Diagnostic Steps:**
1. **Browser Performance**: Check browser task manager (Shift+Esc in Chrome)
2. **Too Many Tabs**: Close unnecessary browser tabs
3. **Extensions**: Disable browser extensions temporarily
4. **Computer Resources**: Check system CPU/RAM usage

**Resolution:**
- Close unnecessary browser tabs and applications
- Disable browser extensions
- Use lighter browser (Edge, Chrome recommended)
- Reduce time range in System Insights (use 7 days instead of 90)
- Contact administrator if backend is slow

**Issue: Dark mode not working or flickering**

**Symptoms:**
- Theme doesn't change when clicking dark mode toggle
- Interface flickers between light and dark
- Inconsistent theming across pages

**Resolution:**
- Click dark mode toggle in top navigation
- Clear browser cache
- Check browser local storage isn't full
- Try different browser
- Refresh page after toggling

#### Export and Download Issues

**Issue: Reports not downloading**

**Symptoms:**
- Click export but no download starts
- Download starts but file is corrupt
- Empty or incomplete exported files

**Diagnostic Steps:**
1. **Browser Downloads**: Check browser download settings
2. **Pop-up Blocker**: Verify pop-ups not blocked
3. **Disk Space**: Ensure sufficient disk space
4. **Permissions**: Check browser has permission to download files

**Resolution:**
- Enable downloads in browser settings
- Allow pop-ups for GreenMatrix domain
- Check Downloads folder for file
- Try different export format
- Use different browser

### Support Resources

#### Self-Help Resources

1. **In-App Help**:
   - Click Help icon (? symbol) in top navigation
   - Access walkthrough tutorials
   - Feature-specific guidance

2. **Browser Console**:
   - Press F12 to open developer tools
   - Check Console tab for error messages
   - Network tab shows API request failures
   - Share error messages with support

3. **System Requirements**:
   - Modern web browser (Chrome 90+, Firefox 88+, Edge 90+)
   - JavaScript enabled
   - Minimum 2GB RAM recommended
   - Stable internet connection

#### Getting Support

**Information to Collect Before Contacting Support**:
- Browser type and version
- Operating system
- Error messages (screenshots or text from console)
- Steps to reproduce the issue
- User Goals configuration (if relevant)
- Exported JSON file (if feature-specific issue)

**Reporting Issues**:
- Contact your system administrator
- Provide all collected information
- Include screenshots of the issue
- Note when issue started occurring
- Mention if any recent changes were made

---

## Best Practices

### User Goals Configuration

1. **Set Up Early**:
   - Configure User Goals before using optimization features
   - Saves significant time across all analyses
   - Ensures consistency

2. **Keep Updated**:
   - Update when switching to different models
   - Modify when requirements change
   - Reconfigure for different deployment scenarios

3. **Complete Information**:
   - Fill all available fields for best results
   - Include GFLOPs for accurate compute estimates
   - Don't skip advanced parameters if available

4. **Task Type Accuracy**:
   - Select correct Training vs. Inference
   - Affects which fields appear and recommendations
   - Re-check before running analyses

### Hardware Recommendations

1. **Resource Monitoring** (Post-deployment):
   - Use actual metrics when available
   - Override defaults if they don't match observations
   - Collect metrics during typical workload periods

2. **Multiple Scenarios**:
   - Run recommendations for different load levels
   - Test peak, average, and minimum load scenarios
   - Compare cost/performance trade-offs

3. **Hardware Database Maintenance**:
   - Keep hardware configurations current
   - Add new hardware as it becomes available
   - Remove deprecated hardware
   - Verify power consumption values are accurate

4. **Optimization Priority Selection**:
   - Use "Balanced" for general-purpose recommendations
   - "Performance-focused" when speed is critical
   - "Cost-focused" for budget-constrained deployments

### Model Optimization

1. **Baseline Establishment**:
   - Document current model performance before optimization
   - Measure accuracy, speed, and resource usage
   - Create reproducible benchmarks

2. **Iterative Approach**:
   - Implement one optimization at a time
   - Measure impact before adding more
   - Don't combine all techniques immediately

3. **Validation Testing**:
   - Thoroughly test optimized models with representative data
   - Check accuracy on held-out test sets
   - Verify performance improvements in real deployment

4. **Production Monitoring**:
   - Track metrics post-optimization
   - Ensure benefits are realized in production
   - Watch for accuracy degradation over time

### System Monitoring and Insights

1. **Regular Review Schedule**:
   - Check Dashboard daily for real-time issues
   - Review System Insights weekly or monthly
   - Generate comprehensive reports quarterly

2. **Time Range Selection**:
   - Use 7 days for recent trends
   - Use 30 days for monthly patterns
   - Use 90 days for long-term capacity planning

3. **Alert Thresholds**:
   - Note when metrics consistently exceed 80%
   - Identify sustained high usage vs. temporary spikes
   - Take action on High priority recommendations first

4. **Historical Analysis**:
   - Export and archive reports regularly
   - Compare month-over-month trends
   - Track impact of implemented recommendations

### Process Metrics Monitoring

1. **Focus on High-Impact Processes**:
   - Sort by CPU, Memory, or Cost columns
   - Prioritize optimization of top resource consumers
   - Click processes for AI-powered recommendations

2. **Regional Cost Comparison**:
   - Test different regions in the dropdown
   - Identify cost-effective deployment locations
   - Factor in data transfer costs

3. **Recommendation Implementation**:
   - Start with High priority recommendations
   - Document actions taken
   - Re-measure after implementing changes

### Cost Management

1. **Regular Pricing Updates**:
   - Update cost models quarterly
   - Track cloud provider price changes
   - Adjust electricity rates seasonally

2. **Complete Regional Coverage**:
   - Add models for all operating regions
   - Include all resource types
   - Maintain consistency in currency usage

3. **Validation**:
   - Compare calculated costs against actual bills
   - Adjust models if discrepancies found
   - Account for all cost factors (taxes, fees)

### AI Model Management

1. **Comprehensive Model Library**:
   - Add all models you plan to use
   - Include variants and versions
   - Document custom or fine-tuned models

2. **Accurate Specifications**:
   - Verify GFLOPs from official sources
   - Confirm parameter counts and model sizes
   - Test auto-population accuracy

3. **Naming Conventions**:
   - Use clear, descriptive names
   - Include size variant in name (Base, Large, XL)
   - Maintain consistent formatting

### Data Management and Exports

1. **Regular Exports**:
   - Export baseline data before changes
   - Create monthly snapshots
   - Archive important analyses

2. **Organized Storage**:
   - Create folder structure for exports
   - Separate by type and date
   - Use consistent naming conventions

3. **Format Selection**:
   - JSON for automation and APIs
   - CSV for spreadsheet analysis
   - HTML for stakeholder communication

### Security and Compliance

1. **Data Privacy**:
   - Be mindful of sensitive process names
   - Redact confidential information before sharing reports
   - Review exports before distributing

2. **Access Control**:
   - Limit access to authorized users
   - Don't share credentials
   - Log out when finished

3. **Audit Trail**:
   - Retain exported reports for compliance
   - Document decisions based on recommendations
   - Track changes over time

---

**End of User Guide**

*For additional support or questions not covered in this guide, please contact your system administrator or GreenMatrix support team.*
