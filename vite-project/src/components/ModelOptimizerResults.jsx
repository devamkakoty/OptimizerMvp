import React from 'react';

const ModelOptimizerResults = ({ results }) => {
  // Handle both demo format and real API format
  if (!results) {
    return null;
  }

  // Check if it's the demo format with rich data structure
  const isDemoFormat = results.recommendedMethods && results.recommendedPrecision && results.prosAndCons;
  
  // Check if it's the real API format
  const isRealApiFormat = results.status === "success" && (results.recommended_method || results.recommended_precision);
  
  if (!isDemoFormat && !isRealApiFormat) {
    return null;
  }

  // For real API format, transform it to display format
  let displayData;
  if (isRealApiFormat) {
    displayData = {
      recommendedMethods: {
        primary: results.recommended_method || "Quantization",
        secondary: "Fine-tuning",
        description: `Based on your model analysis, we recommend ${results.recommended_method || "optimization techniques"} for optimal performance.`
      },
      recommendedPrecision: {
        precision: results.recommended_precision ? `${results.recommended_precision.toFixed(2)} precision score` : "Mixed Precision (FP16/INT8)",
        benefits: "Improved performance and efficiency",
        description: `The optimization analysis suggests a precision score of ${results.recommended_precision?.toFixed(2) || "high quality"} for your model configuration.`
      },
      prosAndCons: {
        pros: [
          "Optimized for your specific model architecture",
          "Reduced memory footprint",
          "Improved inference speed",
          "Maintains model accuracy",
          "Compatible with your hardware setup"
        ],
        cons: [
          "May require fine-tuning for optimal results",
          "Performance varies with different input types",
          "Initial optimization setup required"
        ],
        considerations: [
          "Test with your specific use case",
          "Monitor performance across different scenarios",
          "Consider gradual optimization approach"
        ]
      }
    };
  } else {
    // Use demo format as-is
    displayData = results;
  }

  const { recommendedMethods, recommendedPrecision, prosAndCons } = displayData;

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
          Optimization Results
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Based on your model characteristics and requirements, here are our optimization recommendations
        </p>
      </div>

      {/* Recommended Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recommended Methods Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 rounded-lg p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Recommended Methods</h3>
          </div>
          
          <div className="space-y-3 mb-4">
            <div>
              <span className="text-blue-100 text-sm">Primary Method:</span>
              <p className="text-lg font-semibold">{recommendedMethods.primary}</p>
            </div>
            <div>
              <span className="text-blue-100 text-sm">Secondary Method:</span>
              <p className="text-lg font-semibold">{recommendedMethods.secondary}</p>
            </div>
          </div>
          
          <p className="text-blue-100 text-sm">
            {recommendedMethods.description}
          </p>
        </div>

        {/* Recommended Precision Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 rounded-lg p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Recommended Precision</h3>
          </div>
          
          <div className="space-y-3 mb-4">
            <div>
              <span className="text-green-100 text-sm">Precision:</span>
              <p className="text-lg font-semibold">{recommendedPrecision.precision}</p>
            </div>
            <div>
              <span className="text-green-100 text-sm">Expected Benefits:</span>
              <p className="text-lg font-semibold">{recommendedPrecision.benefits}</p>
            </div>
          </div>
          
          <p className="text-green-100 text-sm">
            {recommendedPrecision.description}
          </p>
        </div>
      </div>

      {/* Pros and Cons Section */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          Optimization Analysis
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pros */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-green-700 dark:text-green-400">Advantages</h4>
            </div>
            <ul className="space-y-3">
              {prosAndCons.pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{pro}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-orange-100 dark:bg-orange-900/20 rounded-lg p-2">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-orange-700 dark:text-orange-400">Considerations</h4>
            </div>
            <ul className="space-y-3">
              {prosAndCons.cons.map((con, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/20 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Additional Considerations */}
        {prosAndCons.considerations && prosAndCons.considerations.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-400">Important Considerations</h4>
            </div>
            <ul className="space-y-2">
              {prosAndCons.considerations.map((consideration, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{consideration}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelOptimizerResults;