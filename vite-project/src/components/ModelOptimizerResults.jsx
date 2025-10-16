import React from 'react';
import { Download, FileText, Database } from 'lucide-react';

const ModelOptimizerResults = ({ results, modelParameters }) => {
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
        precision: results.recommended_precision_name || (results.recommended_precision ? `${results.recommended_precision.toFixed(2)} precision score` : "Mixed Precision (FP16/INT8)"),
        benefits: "Improved performance and efficiency",
        description: `The optimization analysis suggests ${results.recommended_precision_name || (results.recommended_precision?.toFixed(2) + " precision score") || "high quality precision"} for your model configuration.`
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

  // Export functions
  const exportData = (format) => {
    const timestamp = new Date().toLocaleString();
    const filename = `Model_Optimization_Report_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'json') {
      const jsonData = {
        reportType: 'Model Optimization',
        timestamp: timestamp,
        modelParameters: modelParameters || {},
        optimization: displayData,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      let csvContent = 'Model Optimization Report\n\n';

      if (modelParameters) {
        csvContent += 'Model Parameters\n';
        csvContent += 'Parameter,Value\n';
        Object.entries(modelParameters).forEach(([key, value]) => {
          csvContent += `${key},${value || 'N/A'}\n`;
        });
        csvContent += '\n';
      }

      csvContent += 'Recommended Methods\n';
      csvContent += 'Type,Method\n';
      csvContent += `Primary,${recommendedMethods.primary}\n`;
      csvContent += `Secondary,${recommendedMethods.secondary}\n\n`;

      csvContent += 'Recommended Precision\n';
      csvContent += 'Attribute,Value\n';
      csvContent += `Precision,${recommendedPrecision.precision}\n`;
      csvContent += `Benefits,${recommendedPrecision.benefits}\n\n`;

      csvContent += 'Advantages\n';
      prosAndCons.pros.forEach((pro, idx) => {
        csvContent += `${idx + 1},${pro}\n`;
      });
      csvContent += '\n';

      csvContent += 'Considerations\n';
      prosAndCons.cons.forEach((con, idx) => {
        csvContent += `${idx + 1},${con}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'report') {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Model Optimization Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #01a982 0%, #059669 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(1, 169, 130, 0.2);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid #e1e5e9;
        }
        .section h2 {
            color: #01a982;
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.8em;
            border-bottom: 3px solid #01a982;
            padding-bottom: 10px;
            font-weight: 700;
        }
        .recommended-config {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .config-card {
            background: linear-gradient(135deg, #01a982 0%, #059669 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(1, 169, 130, 0.15);
        }
        .config-card h3 {
            margin: 0 0 10px 0;
            font-size: 0.9em;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .config-card .value {
            font-size: 1.5em;
            font-weight: 700;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .metric-item {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        .metric-label {
            font-size: 0.8em;
            color: #6b7280;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.2em;
            font-weight: 600;
            color: #01a982;
        }
        .pros-cons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        .pros-cons h3 {
            color: #01a982;
            font-size: 1.3em;
            margin-bottom: 15px;
        }
        .pros-cons ul {
            list-style: none;
            padding: 0;
        }
        .pros-cons li {
            padding: 10px;
            margin-bottom: 8px;
            background: #f9fafb;
            border-radius: 6px;
            border-left: 3px solid #01a982;
        }
        .considerations-section {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #e0f2fe;
        }
        .considerations-section h3 {
            color: #01a982;
            margin-top: 0;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6b7280;
            font-size: 0.9em;
            border-top: 1px solid #e5e7eb;
        }
        @media print {
            body { background: white; }
            .header, .section { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>HPE GreenMatrix Model Optimization Report</h1>
        <p>AI Model Optimization Recommendations</p>
        <p>Generated on: ${timestamp}</p>
    </div>

    ${modelParameters ? `
    <div class="section">
        <h2>AI Model Details</h2>
        <div class="metrics-grid">
            ${Object.entries(modelParameters).map(([key, value]) => `
                <div class="metric-item">
                    <div class="metric-label">${key}</div>
                    <div class="metric-value">${value || 'N/A'}</div>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Recommended Optimization Configuration</h2>

        <div class="recommended-config">
            <div class="config-card">
                <h3>PRIMARY METHOD</h3>
                <div class="value">${recommendedMethods.primary}</div>
            </div>
            <div class="config-card">
                <h3>SECONDARY METHOD</h3>
                <div class="value">${recommendedMethods.secondary}</div>
            </div>
            <div class="config-card">
                <h3>RECOMMENDED PRECISION</h3>
                <div class="value">${recommendedPrecision.precision}</div>
            </div>
            <div class="config-card">
                <h3>EXPECTED BENEFITS</h3>
                <div class="value">${recommendedPrecision.benefits}</div>
            </div>
        </div>

        <p style="color: #6b7280; font-size: 0.95em; margin-top: 20px;">
            ${recommendedMethods.description}
        </p>
    </div>

    <div class="section">
        <h2>Optimization Analysis</h2>

        <div class="pros-cons">
            <div>
                <h3>✓ Advantages</h3>
                <ul>
                    ${prosAndCons.pros.map(pro => `<li>${pro}</li>`).join('')}
                </ul>
            </div>

            <div>
                <h3>⚠ Considerations</h3>
                <ul>
                    ${prosAndCons.cons.map(con => `<li>${con}</li>`).join('')}
                </ul>
            </div>
        </div>

        ${prosAndCons.considerations && prosAndCons.considerations.length > 0 ? `
        <div class="considerations-section">
            <h3>💡 Important Considerations</h3>
            <ul style="list-style: none; padding: 0;">
                ${prosAndCons.considerations.map(consideration => `
                    <li style="padding: 8px 0; border-bottom: 1px solid #e0f2fe;">→ ${consideration}</li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
    </div>

    <div class="footer">
        <p>This report was generated automatically by the HPE GreenMatrix Dashboard</p>
        <p>For more details and analysis, visit the HPE GreenMatrix Platform</p>
    </div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      {/* Header with Export Buttons */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Optimization Results
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Based on your model characteristics and requirements, here are our optimization recommendations
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-2 px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as JSON"
            >
              <Database className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-2 px-4 py-2 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => exportData('report')}
              className="flex items-center gap-2 px-4 py-2 text-[#01a982] dark:text-[#01a982] border border-[#01a982] rounded-lg hover:bg-[#01a982]/10 dark:hover:bg-[#01a982]/20 transition-colors"
              title="Export as HTML Report"
            >
              <FileText className="w-4 h-4" />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recommended Methods Card */}
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recommended Methods</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">Primary Method:</span>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{recommendedMethods.primary}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">Secondary Method:</span>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{recommendedMethods.secondary}</p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {recommendedMethods.description}
          </p>
        </div>

        {/* Recommended Precision Card */}
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recommended Precision</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">Precision:</span>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{recommendedPrecision.precision}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">Expected Benefits:</span>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{recommendedPrecision.benefits}</p>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm">
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
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Advantages</h4>
            </div>
            <ul className="space-y-3">
              {prosAndCons.pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Considerations</h4>
            </div>
            <ul className="space-y-3">
              {prosAndCons.cons.map((con, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-gray-100 dark:bg-gray-600 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Important Considerations</h4>
            </div>
            <ul className="space-y-2">
              {prosAndCons.considerations.map((consideration, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 mt-1">
                    <svg className="w-3 h-3 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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