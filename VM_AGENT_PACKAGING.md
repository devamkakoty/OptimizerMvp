# VM Agent Packaging Instructions

This document provides step-by-step instructions for creating a self-contained, distributable package of the GreenMatrix VM monitoring agent (`vm_agent.py`).

## Overview

The VM agent requires several Python dependencies to function properly. To make deployment easy for users, we'll create a self-contained package using PyInstaller that includes all dependencies.

## Prerequisites

- Python 3.8 or higher
- pip package manager
- Virtual environment (recommended)

## Step 1: Set Up Development Environment

### Create Virtual Environment

```bash
# Create a new virtual environment
python -m venv vm_agent_env

# Activate the virtual environment
# On Windows:
vm_agent_env\Scripts\activate
# On Linux/macOS:
source vm_agent_env/bin/activate
```

### Install Required Dependencies

```bash
pip install psutil>=5.9.0
pip install requests>=2.28.0
pip install netifaces>=0.11.0

# Install pynvml for Windows GPU monitoring
# (Optional - only needed on Windows systems with NVIDIA GPUs)
pip install pynvml>=11.4.1

# Install PyInstaller for packaging
pip install pyinstaller>=5.0
```

## Step 2: Prepare the Agent Files

### Create Package Directory Structure

```
vm_agent_package/
├── vm_agent.py                 # Main agent script
├── vm_agent.ini.example        # Configuration file template
├── requirements.txt            # Python dependencies
├── install.bat                 # Windows installation script
├── install.sh                  # Linux installation script
├── README.md                   # User instructions
└── build_package.py            # Packaging script
```

### Create Configuration Template

Create `vm_agent.ini.example`:

```ini
[agent]
# Backend URL (auto-discovered if not set)
backend_url = 

# VM name identifier (auto-detected if not set)
vm_name = 

# Collection interval in seconds (default: 60)
collection_interval = 60

# API request timeout in seconds (default: 30)
api_timeout = 30

# CPU TDP in watts for power estimation (default: 125.0)
cpu_tdp_watts = 125.0

# Maximum retry attempts for failed requests (default: 3)
max_retries = 3

# Retry delay in seconds (default: 5)
retry_delay = 5

# Logging level: DEBUG, INFO, WARNING, ERROR (default: INFO)
log_level = INFO
```

### Create Requirements File

Create `requirements.txt`:

```
psutil>=5.9.0
requests>=2.28.0
netifaces>=0.11.0
pynvml>=11.4.1
```

## Step 3: Create Packaging Script

Create `build_package.py`:

```python
#!/usr/bin/env python3
"""
VM Agent Packaging Script
Creates a self-contained executable package of the VM monitoring agent.
"""

import os
import sys
import subprocess
import shutil
import platform

def build_executable():
    """Build the VM agent into a standalone executable"""
    
    print("Building VM Agent executable...")
    
    # PyInstaller command to create standalone executable
    cmd = [
        'pyinstaller',
        '--onefile',                    # Create single executable file
        '--name', 'vm_agent',          # Output name
        '--add-data', 'vm_agent.ini.example;.',  # Include config template
        '--hidden-import', 'pynvml',    # Include GPU monitoring module
        '--console',                    # Console application
        '--clean',                      # Clean build
        'vm_agent.py'
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("✓ Executable built successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def create_package():
    """Create the complete distribution package"""
    
    system = platform.system().lower()
    package_name = f"vm_agent_{system}"
    
    # Create package directory
    if os.path.exists(package_name):
        shutil.rmtree(package_name)
    os.makedirs(package_name)
    
    print(f"Creating package: {package_name}")
    
    # Copy executable
    exe_name = 'vm_agent.exe' if system == 'windows' else 'vm_agent'
    exe_path = os.path.join('dist', exe_name)
    
    if os.path.exists(exe_path):
        shutil.copy(exe_path, package_name)
        print(f"✓ Copied executable: {exe_name}")
    else:
        print(f"✗ Executable not found: {exe_path}")
        return False
    
    # Copy configuration template
    shutil.copy('vm_agent.ini.example', package_name)
    print("✓ Copied configuration template")
    
    # Copy installation scripts
    if system == 'windows':
        with open(os.path.join(package_name, 'install.bat'), 'w') as f:
            f.write("""@echo off
echo Installing GreenMatrix VM Agent...

REM Copy configuration template if it doesn't exist
if not exist vm_agent.ini (
    copy vm_agent.ini.example vm_agent.ini
    echo Created vm_agent.ini from template
)

REM Test the agent
echo Testing agent connectivity...
vm_agent.exe --test
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Test failed. Please check your configuration in vm_agent.ini
    pause
    exit /b 1
)

echo.
echo Installation completed successfully!
echo.
echo To run the agent:
echo   vm_agent.exe
echo.
echo To run once for testing:
echo   vm_agent.exe --once
echo.
echo To configure the agent, edit vm_agent.ini
pause
""")
    else:
        with open(os.path.join(package_name, 'install.sh'), 'w') as f:
            f.write("""#!/bin/bash
echo "Installing GreenMatrix VM Agent..."

# Make executable
chmod +x vm_agent

# Copy configuration template if it doesn't exist
if [ ! -f vm_agent.ini ]; then
    cp vm_agent.ini.example vm_agent.ini
    echo "Created vm_agent.ini from template"
fi

# Test the agent
echo "Testing agent connectivity..."
./vm_agent --test
if [ $? -ne 0 ]; then
    echo ""
    echo "Test failed. Please check your configuration in vm_agent.ini"
    exit 1
fi

echo ""
echo "Installation completed successfully!"
echo ""
echo "To run the agent:"
echo "  ./vm_agent"
echo ""
echo "To run once for testing:"
echo "  ./vm_agent --once"
echo ""
echo "To configure the agent, edit vm_agent.ini"
""")
        
        # Make install script executable
        install_path = os.path.join(package_name, 'install.sh')
        os.chmod(install_path, 0o755)
    
    print("✓ Created installation script")
    
    # Create README
    readme_content = f"""# GreenMatrix VM Monitoring Agent

## Overview

This package contains the GreenMatrix VM monitoring agent, a self-contained tool that collects detailed process-level metrics from virtual machines and sends them to the GreenMatrix backend for analysis.

## Features

- **Cross-platform**: Works on Windows and Linux
- **Self-contained**: No need to install Python or dependencies
- **Auto-discovery**: Automatically finds the backend API endpoint
- **Comprehensive metrics**: Collects CPU, memory, GPU, I/O, and power metrics
- **Robust**: Built-in retry logic and error handling

## Quick Start

### Windows

1. Run `install.bat` to set up the agent
2. Edit `vm_agent.ini` if needed to configure settings
3. Run `vm_agent.exe` to start monitoring

### Linux

1. Run `./install.sh` to set up the agent
2. Edit `vm_agent.ini` if needed to configure settings  
3. Run `./vm_agent` to start monitoring

## Configuration

The agent can be configured by editing `vm_agent.ini`. Key settings:

- `backend_url`: URL of the GreenMatrix backend (auto-detected if not set)
- `vm_name`: Identifier for this VM (auto-detected if not set)
- `collection_interval`: How often to collect metrics (seconds)
- `log_level`: Logging verbosity (DEBUG, INFO, WARNING, ERROR)

## Command Line Options

- `--once`: Run once and exit (useful for testing)
- `--test`: Test connectivity and configuration
- `--vm-name NAME`: Override VM name
- `--backend-url URL`: Override backend URL
- `--interval SECONDS`: Override collection interval
- `--log-level LEVEL`: Override log level

## Examples

```bash
# Test connectivity
./vm_agent --test

# Run once for testing
./vm_agent --once

# Run with custom settings
./vm_agent --vm-name "web-server-01" --interval 30

# Run with debug logging
./vm_agent --log-level DEBUG
```

## Running as a Service

### Windows Service

To run as a Windows service, you can use tools like `nssm` or `sc`:

```cmd
# Using nssm (download from https://nssm.cc/)
nssm install "GreenMatrix VM Agent" "C:\\path\\to\\vm_agent.exe"
nssm start "GreenMatrix VM Agent"
```

### Linux Systemd Service

Create `/etc/systemd/system/vm-agent.service`:

```ini
[Unit]
Description=GreenMatrix VM Monitoring Agent
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/path/to/vm_agent
ExecStart=/path/to/vm_agent/vm_agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vm-agent
sudo systemctl start vm-agent
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check that the backend is running and accessible
2. **Permission denied**: Ensure the agent has permission to access system metrics
3. **High CPU usage**: Increase the collection interval in configuration

### Getting Help

Run with `--test` to check connectivity and configuration:

```bash
./vm_agent --test
```

Check logs for detailed error information. Increase log level to DEBUG for maximum detail.

## Requirements

- No additional software required (self-contained)
- Network access to GreenMatrix backend
- Appropriate permissions to read system metrics

## Version

VM Agent v1.0.0 - Built for {system.title()}
Generated on: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    
    with open(os.path.join(package_name, 'README.md'), 'w') as f:
        f.write(readme_content)
    
    print("✓ Created README.md")
    
    # Create archive
    archive_name = f"{package_name}.zip" if system == 'windows' else f"{package_name}.tar.gz"
    
    if system == 'windows':
        shutil.make_archive(package_name, 'zip', '.', package_name)
    else:
        shutil.make_archive(package_name, 'gztar', '.', package_name)
    
    print(f"✓ Created archive: {archive_name}")
    
    return True

def main():
    """Main packaging function"""
    print("="*60)
    print("GreenMatrix VM Agent Packaging Script")
    print("="*60)
    
    # Check if vm_agent.py exists
    if not os.path.exists('vm_agent.py'):
        print("✗ vm_agent.py not found in current directory")
        return False
    
    # Build executable
    if not build_executable():
        return False
    
    # Create package
    if not create_package():
        return False
    
    print("="*60)
    print("✓ VM Agent packaging completed successfully!")
    print("="*60)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
```

## Step 4: Build the Package

### For Windows

```cmd
# Ensure you're in the vm_agent_package directory
cd vm_agent_package

# Copy the vm_agent.py file
copy ..\vm_agent.py .

# Build the package
python build_package.py
```

### For Linux

```bash
# Ensure you're in the vm_agent_package directory
cd vm_agent_package

# Copy the vm_agent.py file
cp ../vm_agent.py .

# Build the package
python build_package.py
```

## Step 5: Distribution

After running the build script, you'll have:

- **Windows**: `vm_agent_windows.zip`
- **Linux**: `vm_agent_linux.tar.gz`

These archives contain everything needed to run the VM agent on target systems.

## Alternative: PyApp Packaging

For a more modern approach, you can use [PyApp](https://github.com/ofek/pyapp):

```bash
# Install PyApp
pip install pyapp

# Create self-extracting executable
pyapp build --python-version 3.11 vm_agent.py
```

## Deployment Instructions for Users

### Windows Deployment

1. Download and extract `vm_agent_windows.zip`
2. Run `install.bat` as Administrator
3. Configure `vm_agent.ini` if needed
4. Run `vm_agent.exe` to start monitoring

### Linux Deployment

1. Download and extract `vm_agent_linux.tar.gz`
2. Run `sudo ./install.sh`
3. Configure `vm_agent.ini` if needed
4. Run `./vm_agent` to start monitoring

## Security Considerations

- The agent requires system-level access to collect process metrics
- Ensure network communication with the backend is secured (HTTPS recommended)
- Consider running the agent with minimal privileges when possible
- Regularly update the agent to get security fixes

## Performance Notes

- Default collection interval is 60 seconds (adjustable)
- Memory usage is typically under 50MB
- CPU usage is minimal (< 1% on modern systems)
- Network bandwidth usage is approximately 1-10KB per snapshot

## Support and Maintenance

- Monitor agent logs for errors
- Test connectivity regularly with `--test` option
- Update configuration as needed for environment changes
- Consider implementing log rotation for long-running deployments

---

**Note**: This packaging creates a self-contained executable that includes all Python dependencies. The resulting package is larger (50-100MB) but requires no additional software installation on target systems.