import { TrendingDown, FolderTree, Leaf, ClipboardList } from 'lucide-react';

function Screen2() {
  const benefits = [
    {
      title: 'Significant Cost Reduction',
      description:
        'Achieve average savings of 20–40% on AI infrastructure spend by eliminating over-provisioning and optimizing resource utilization.',
        icon: <TrendingDown size={40} className="text-[#317873] mx-auto mb-2" />,
    },
    {
      title: 'Enhanced Performance',
      description:
        'Ensure AI models run at peak efficiency, leading to faster inference times, improved throughput, and superior application responsiveness.',
        icon: <FolderTree size={40} className="text-[#317873] mx-auto mb-2" />,
    },
    {
      title: 'Reduced Operational Risk',
      description:
        'Achieve average savings of 20–40% on AI infrastructure spend by eliminating over-provisioning and optimizing resource utilization.',
        icon: <Leaf  size={40} className="text-[#317873] mx-auto mb-2" />,
    },
    {
      title: 'Accelerated Innovation',
      description:
        'Free up engineering resources from manual optimization tasks, allowing them to focus on developing and deploying cutting-edge AI solutions.',
        icon: <ClipboardList  size={40} className="text-[#317873] mx-auto mb-2" />,
    },
  ];

  return (
    <div>
      <h2 className="text-[24px] text-gray-900 dark:text-white mb-4">
        Why Green Matrix Matters
      </h2>
      <div className="border-t border-gray-200 mt-2 mb-6" />

      {/* Grid container for 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {benefits.map((item, index) => (
          <div
            key={index}
            className="relative bg-gradient-to-b from-green-50 to-white border border-green-100 rounded-3xl shadow p-6 flex flex-col items-center text-center h-full min-h-[200px]"
          >
            <div className="mt-4">{item.icon}</div>
            <h2 className="text-[22px] font-medium text-[#317873] mb-2 mt-2">{item.title}</h2>
            <p className="text-gray-500 text-[16px] text-left">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Screen2;
