import React from 'react';

function Screen1() {
  const features = [
    {
      title: 'Intelligent Optimization',
      description:
        'Green Matrix offers an AI-powered platform designed to bring clarity and control to IT infrastructure. By combining advanced simulation with real-time analysis, it ensures optimal hardware use at the lowest possible cost.',
    },
    {
      title: 'Data-Driven Decisions',
      description:
        'Green Matrix provides actionable insights and recommendations, empowering users to make informed decisions about hardware provisioning, model deployment, and ongoing optimization.',
    },
    {
      title: 'Sustainable Growth',
      description:
        'Green Matrix helps achieve a future-proof AI strategy. It enables users to scale AI initiatives efficiently while reducing both operational and environmental impact, maintaining peak performance.',
    },
  ];

  return (
    <div className="space-y-6">
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg shadow p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h2>
          <p className="text-gray-600 text-sm">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
export default Screen1;
