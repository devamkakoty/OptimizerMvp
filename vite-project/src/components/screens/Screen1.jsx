import { Cpu, Laptop2, BarChart3 } from 'lucide-react';

function Screen1() {
  const features = [
    {
      title: 'Intelligent Optimization',
      description:
        'Green Matrix offers an AI-powered platform designed to bring clarity and control to your AI infrastructure. By combining advanced simulation with real-time analysis, we ensure your AI models run on the optimal hardware at the lowest possible cost.',
      icon: <Cpu size={40} className="text-[#317873] mx-auto mb-2" />,
    },
    {
      title: 'Data-Driven Decisions',
      description:
        'Move beyond guesswork. Green Matrix provides actionable insights and recommendations, empowering your teams to make informed decisions about hardware provisioning, model deployment, and ongoing optimization.',
      icon: <Laptop2 size={40} className="text-[#317873] mx-auto mb-2" />,
    },
    {
      title: 'Sustainable Growth',
      description:
        'Achieve a future-proof AI strategy. With Green Matrix, you can scale your AI initiatives efficiently, reducing both operational costs and environmental impact, while maintaining peak performance.',
      icon: <BarChart3 size={40} className="text-[#317873] mx-auto mb-2" />,
    },
  ];

  return (
    <div>
      <h2 className="text-[24px] text-gray-900 dark:text-white mb-4">Introducing Green Matrix</h2>
       {/* Divider line */}
      <div className="border-t border-gray-200 mt-4"/>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-4 pt-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="relative bg-gradient-to-b from-green-50 to-white border border-green-100 rounded-3xl shadow p-8 flex flex-col items-center text-center"
          >
            {/* Green accent shape */}
            {/* <div className="absolute -top-4 left-0 w-full h-6 pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,20 Q25,0 50,10 Q75,20 100,0 L100,20 Z" fill="#00b386" />
              </svg>
            </div> */}
            <div className="mt-4">{feature.icon}</div>
            <h3 className="text-[22px] font-medium text-[#317873] mb-2 mt-2">{feature.title}</h3>
            <p className="text-gray-500 text-[16px] text-left">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Screen1;