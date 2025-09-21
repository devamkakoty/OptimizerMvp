import CircularProgressChart from '../CircularProgressChart';

export default function Screen3() {
  const metrics = [
    {
      title: 'Faster Iteration',
      percentage: '20',
      description:
        'Rapidly test and deploy new models with optimized infrastructure from the outset.',
    },
    {
      title: 'Reduced Manual Effort',
      percentage: '50',
      description:
        'Automate complex infrastructure decisions, freeing up valuable engineering time.',
    },
    {
      title: 'Uptime & Stability',
      percentage: '100',
      description:
        'Ensure robust, high-availability AI services through responsive resource matching.',
    },
  ];

  return (
    <div>
      <h2 className="text-[24px] text-gray-900 dark:text-white mb-4">
        Unlocking Your AI Potential
      </h2>
      <div className="border-t border-gray-200 mt-2 mb-4" />
      <p className="font-semibold text-lg text-gray-600 mb-6">
        Green Matrix transforms AI infrastructure from a cost center into a strategic asset, empowering your organization to innovate faster and achieve superior business outcomes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-4">
        {metrics.map((item, index) => (
          <div
            key={index}
            className="relative bg-gradient-to-b from-green-50 to-white border border-green-100 rounded-3xl shadow p-6 flex flex-col items-center text-center h-full"
          >
            <h2 className="text-[22px] font-medium text-[#317873] mb-4 mt-2">{item.title}</h2>

            {/* Fixed size wrapper for chart */}
            <div className="w-24 h-24 mb-4 flex items-center justify-center  my-4">
              <CircularProgressChart
                className="w-full h-full text-green-600"
                percentage={item.percentage}
              />
            </div>

            <p className="text-gray-500 text-[16px] my-4">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
