import React from 'react';
import { X } from 'lucide-react';

const ProcessInsightsModal = ({ 
  isOpen, 
  onClose, 
  selectedProcess, 
  processRecommendations, 
  processRealTimeData 
}) => {
  if (!isOpen || !selectedProcess) return null;

  const processId = selectedProcess['Process ID'];
  const realTimeData = processRealTimeData[processId];
  const recommendations = processRecommendations[processId] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Real-Time Performance Metrics - {selectedProcess['Process Name']}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Live • {realTimeData?.current?.timestamp || new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          
          {/* Real-time Metrics Grid */}
          {realTimeData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { 
                  label: 'CPU Usage', 
                  value: `${realTimeData.current.cpu.toFixed(1)}%`
                },
                { 
                  label: 'RAM', 
                  value: `${realTimeData.current.memory.toFixed(1)} MB`
                },
                { 
                  label: 'GPU Usage', 
                  value: `${realTimeData.current.gpu.toFixed(1)}%`
                },
                { 
                  label: 'VRAM', 
                  value: `${(realTimeData.current.gpuMemory / 1024).toFixed(1)} GB`
                },
                { 
                  label: 'Watts', 
                  value: realTimeData.current.power.toFixed(0)
                },
                { 
                  label: 'Open Files', 
                  value: realTimeData.current.openFiles.toString()
                },
                { 
                  label: 'Status', 
                  value: selectedProcess.Status || 'Running'
                }
              ].map((metric, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{metric.label}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </div>
                  {metric.label === 'CPU Usage' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min(100, realTimeData.current.cpu)}%`}}
                      />
                    </div>
                  )}
                  {metric.label === 'RAM' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min(100, realTimeData.current.memoryPercent)}%`}}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI-Powered Optimization Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                AI-Powered Optimization Recommendations
              </h3>
              
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                            rec.priority === 'high' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : rec.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {rec.priority}
                          </span>
                          {rec.savings && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {rec.savings} savings
                            </span>
                          )}
                        </div>
                        <h4 className={`font-semibold text-base mb-2 ${
                          rec.priority === 'high' 
                            ? 'text-red-800 dark:text-red-200'
                            : rec.priority === 'medium'
                            ? 'text-yellow-800 dark:text-yellow-200'
                            : 'text-green-800 dark:text-green-200'
                        }`}>
                          {rec.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          <div className="flex justify-end mt-8">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessInsightsModal;