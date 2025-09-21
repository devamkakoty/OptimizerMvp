import dashboard from '../../assets/dashboard.png'

export default function Screen5() {
  return (
    <div className="space-y-6">
      <h2 className="text-[24px] text-gray-900 dark:text-white mb-2">Introducing Green Matrix</h2>
       {/* Divider line */}
      <div className="border-t border-gray-200 mt-2"/>
      {/* Top Card: Screenshot */}
      <div className="overflow-hidden">
        <img
          src={dashboard}
          alt="GreenMatrix Panel Screenshot"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Bottom Card: Text Description */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg shadow px-4 py-4">
        <h2 className="text-xl font-semibold text-[#317873] mb-2">Dashboard</h2>

        <div className="space-y-2 text-md text-gray-700">
          <p>Based on user-provided model specifications (e.g., model name, task type, FLOPs) , this function generates a simulated performance output. The simulation benchmarks the specified model against all available hardware configurations in your environment or chosen
cloud provider. This allows for proactive identification of potential bottlenecks and optimal resource allocation before any physical deployment.</p>
        </div>
      </div>
    </div>
  );
}
