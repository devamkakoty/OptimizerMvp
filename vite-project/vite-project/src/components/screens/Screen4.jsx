// components/screens/Screen4.jsx
export default function Screen4() {
  const capabilities = [
    {
      title: 'Performance Simulation',
      color: 'bg-blue-100 text-blue-800',
      description:
        'Predict model performance across different hardware.',
      details:
        'Based on user-provided model specifications (e.g., model name, task type, FLOPs), this function generates a simulated performance output. The simulation benchmarks the specified model against potential hardware configurations in your environment or chosen cloud provider. This allows for proactive identification of potential bottlenecks and optimal resource allocation before any physical deployment.',
    },
    {
      title: 'Pre-Deployment Hardware Optimization',
      color: 'bg-purple-100 text-purple-800',
      description:
        'Identify ideal hardware before deployment.',
    },
    {
      title: 'Post-Deployment Hardware Optimization',
      color: 'bg-yellow-100 text-yellow-800',
      description:
        'Optimize hardware after deployment.',
    },
    {
      title: 'Model Optimization Recommendation',
      color: 'bg-teal-100 text-teal-800',
      description:
        'Suggest ways to make models faster and lighter.',
    },
  ];

  return (
    <div className="space-y-6">
      {capabilities.map((item, index) => (
        <div
          key={index}
          className={`border rounded-lg shadow p-6 hover:shadow-md transition ${item.color}`}
        >
          <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
          <p className="text-sm mb-2">{item.description}</p>
          {item.details && (
            <p className="text-sm text-gray-700">{item.details}</p>
          )}
        </div>
      ))}
    </div>
  );
}
