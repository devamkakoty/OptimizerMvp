import React, { useState } from "react";
import { Monitor, Cpu, Server, Settings } from "lucide-react";

export default function Screen4() {
  const capabilities = [
    {
      title: "Performance Simulation",
      color: "bg-green-50",
      textColor: "text-green-700",
      description: "Predict model performance across diverse hardware.",
      details:
        "Based on user-provided model specifications (e.g., model name, task type, FLOPs), this function generates a simulated performance output. The simulation benchmarks the specified model against all available hardware configurations in your environment or chosen cloud provider. This allows for proactive identification of potential bottlenecks and optimal resource allocation before any physical deployment.",
      icon: <Monitor size={24} />,
    },
    {
      title: "Pre-Deployment Hardware Optimization",
      color: "bg-purple-50",
      textColor: "text-purple-700",
      description: "Identify ideal hardware before deployment.",
      details:
        "This feature helps evaluate and recommend the most cost-effective and efficient hardware setup for deploying new AI models, ensuring smooth scaling and minimized downtime.",
      icon: <Cpu size={24} />,
    },
    {
      title: "Post-Deployment Hardware Optimization",
      color: "bg-yellow-50",
      textColor: "text-yellow-700",
      description: "Optimize hardware for live models.",
      details:
        "Continuously monitor deployed models and recommend hardware reconfiguration or migration to optimize costs and performance.",
      icon: <Server size={24} />,
    },
    {
      title: "Model Optimization Recommendation",
      color: "bg-sky-50",
      textColor: "text-sky-700",
      description: "Suggest ways to make models faster and lighter.",
      details:
        "Provides actionable recommendations like quantization, pruning, or mixed precision to improve inference speed and reduce resource utilization.",
      icon: <Settings size={24} />,
    },
  ];

  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Title */}
      <h2 className="text-[24px] text-gray-900 dark:text-white mb-4">
        Powerful Capabilities
      </h2>
      <div className="border-t border-gray-200 mt-2 mb-4" />

      <p className="font-semibold text-lg text-gray-600 mb-6">
        Green Matrix is engineered to provide a holistic approach to AI
        infrastructure management, from initial planning to ongoing operational
        excellence.
      </p>

      {/* Capability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {capabilities.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelected(index)}
            className={`relative cursor-pointer p-4 rounded-lg shadow-sm transition
              ${item.color} ${
              selected === index ? "ring-2 ring-green-500 shadow-md" : ""
            }`}
          >
            <div className={`${item.textColor} my-4`}>{item.icon}</div>
            <h3 className={`font-semibold text-gray-900 text-[17px]`}>{item.title}</h3>
            <p className="text-md text-gray-700 my-2">{item.description}</p>

            {/* Pointer under active card */}
            {selected === index && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-3 h-3 bg-white border-l border-t border-gray-300 rotate-45"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Details Section */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h4 className="text-xl font-semibold text-[#317873] mb-2">
          {capabilities[selected].title}
        </h4>
        <p className="space-y-2 text-md text-gray-700">
          {capabilities[selected].details}
        </p>
      </div>
    </div>
  );
}
