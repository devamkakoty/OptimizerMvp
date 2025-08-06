import React, { useState } from 'react';

const HardwareTab = () => {
  const [activeHardwareTab, setActiveHardwareTab] = useState('gpu');

  // Static GPU data based on CSV structure
  const gpuData = [
    {
      id: 1,
      gpuCount: 1,
      brand: 'NVIDIA',
      model: 'NVIDIA GeForce GTX 1660 Ti',
      version: '576.52',
      totalMemory: 6144,
      usedMemory: 178,
      freeMemory: 5966,
      currentLoad: 0,
      utilization: 0,
      memoryUtilization: 0,
      temperature: 48,
      powerUsage: 24.4,
      graphicsClock: 1455,
      smClock: 1455,
      memoryClock: 6000,
      smCores: 'N/A',
      cudaCores: 'N/A'
    },
    {
      id: 2,
      gpuCount: 1,
      brand: 'NVIDIA',
      model: 'NVIDIA GeForce RTX 3080',
      version: '580.34',
      totalMemory: 10240,
      usedMemory: 2048,
      freeMemory: 8192,
      currentLoad: 45,
      utilization: 67,
      memoryUtilization: 20,
      temperature: 68,
      powerUsage: 275.0,
      graphicsClock: 1710,
      smClock: 1710,
      memoryClock: 19000,
      smCores: 68,
      cudaCores: 8704
    },
    {
      id: 3,
      gpuCount: 1,
      brand: 'AMD',
      model: 'AMD Radeon RX 6800 XT',
      version: '22.11.2',
      totalMemory: 16384,
      usedMemory: 1024,
      freeMemory: 15360,
      currentLoad: 15,
      utilization: 23,
      memoryUtilization: 6,
      temperature: 55,
      powerUsage: 180.5,
      graphicsClock: 2250,
      smClock: 2250,
      memoryClock: 16000,
      smCores: 72,
      cudaCores: 'N/A'
    }
  ];

  // Static CPU data based on CSV structure
  const cpuData = [
    {
      id: 1,
      brand: 'Intel',
      model: 'Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz',
      family: 6,
      modelFamily: 158,
      baseClock: '2.60GHz',
      physicalCores: 6,
      totalCores: 12,
      maxFrequency: '2.6',
      minFrequency: '0',
      currentSpeed: '2.6',
      threadsPerCore: 2,
      coresPerSocket: 6,
      sockets: 1
    },
    {
      id: 2,
      brand: 'AMD',
      model: 'AMD Ryzen 9 5900X',
      family: 25,
      modelFamily: 33,
      baseClock: '3.70GHz',
      physicalCores: 12,
      totalCores: 24,
      maxFrequency: '4.8',
      minFrequency: '2.2',
      currentSpeed: '3.7',
      threadsPerCore: 2,
      coresPerSocket: 12,
      sockets: 1
    },
    {
      id: 3,
      brand: 'Intel',
      model: 'Intel(R) Core(TM) i9-12900K',
      family: 6,
      modelFamily: 167,
      baseClock: '3.20GHz',
      physicalCores: 16,
      totalCores: 24,
      maxFrequency: '5.2',
      minFrequency: '0.8',
      currentSpeed: '3.2',
      threadsPerCore: 2,
      coresPerSocket: 16,
      sockets: 1
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Hardware Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveHardwareTab('gpu')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
              activeHardwareTab === 'gpu'
                ? 'bg-[#01a982] text-white border-b-2 border-[#01a982]'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            GPU Management
          </button>
          <button
            onClick={() => setActiveHardwareTab('cpu')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
              activeHardwareTab === 'cpu'
                ? 'bg-[#01a982] text-white border-b-2 border-[#01a982]'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            CPU Management
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeHardwareTab === 'gpu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">GPU Hardware</h3>
                <p className="text-gray-600 dark:text-gray-300">Manage and monitor GPU resources</p>
              </div>
              <button className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors">
                Add GPU
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Utilization</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Temperature</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Power</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {gpuData.map((gpu) => (
                    <tr key={gpu.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{gpu.brand}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={gpu.model}>{gpu.model}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">v{gpu.version}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{(gpu.totalMemory / 1024).toFixed(1)} GB</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.usedMemory} MB used</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{gpu.utilization}% GPU</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.memoryUtilization}% Memory</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          gpu.temperature > 70 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          gpu.temperature > 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {gpu.temperature}°C
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{gpu.powerUsage} W</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{gpu.cudaCores !== 'N/A' ? gpu.cudaCores : gpu.smCores} Cores</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{gpu.graphicsClock} MHz</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#01a982] hover:text-[#019670] mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeHardwareTab === 'cpu' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">CPU Hardware</h3>
                <p className="text-gray-600 dark:text-gray-300">Manage and monitor CPU resources</p>
              </div>
              <button className="px-4 py-2 bg-[#01a982] text-white rounded-lg hover:bg-[#019670] transition-colors">
                Add CPU
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brand</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Frequency</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Architecture</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cpuData.map((cpu) => (
                    <tr key={cpu.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{cpu.brand}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div className="max-w-xs truncate" title={cpu.model}>{cpu.model.split(' @ ')[0]}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Family {cpu.family}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.physicalCores} Physical</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cpu.totalCores} Total</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.baseClock} Base</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Max: {cpu.maxFrequency} GHz</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div>{cpu.threadsPerCore} Threads/Core</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cpu.sockets} Socket(s)</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-[#01a982] hover:text-[#019670] mr-3">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HardwareTab;