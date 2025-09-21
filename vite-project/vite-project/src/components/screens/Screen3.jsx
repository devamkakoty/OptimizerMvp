export default function Screen3() {
  const metrics = [
    {
      title: 'Faster Iteration',
      percentage: '20%',
      description:
        'Rapidly test and deploy new models with optimized infrastructure from the outset.',
    },
    {
      title: 'Reduced Manual Effort',
      percentage: '50%',
      description:
        'Automate complex infrastructure decisions, freeing up valuable engineering time.',
    },
    {
      title: 'Uptime & Stability',
      percentage: '100%',
      description:
        'Ensure robust, high-availability AI services through responsive resource matching.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((item, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg shadow p-6 flex flex-col items-center text-center hover:shadow-md transition"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-green-600">{item.percentage}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h2>
          <p className="text-sm text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
