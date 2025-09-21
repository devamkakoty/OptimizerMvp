function Screen2() {
  const benefits = [
    {
      title: 'Significant Cost Reduction',
      description:
        'Achieve average savings of 20–40% on AI infrastructure spend by eliminating over-provisioning and optimizing resource utilization.',
    },
    {
      title: 'Enhanced Performance',
      description:
        'Ensure AI models run at peak efficiency, leading to faster inference times, improved throughput, and superior application responsiveness.',
    },
    {
      title: 'Reduced Operational Risk',
      description:
        'Achieve average savings of 20–40% on AI infrastructure spend by eliminating over-provisioning and optimizing resource utilization.',
    },
    {
      title: 'Accelerated Innovation',
      description:
        'Free up engineering resources from manual optimization tasks, allowing them to focus on developing and deploying cutting-edge AI solutions.',
    },
  ];

  return (
    <div className="space-y-6">
      {benefits.map((item, index) => (
        <div
          key={index}
          className="bg-white border border-gray-200 rounded-lg shadow p-6 hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h2>
          <p className="text-gray-600 text-sm">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
export default Screen2;
