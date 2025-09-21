// components/screens/Screen5.jsx
import screenshot from '../../assets/greenmatrix-panel.png'; // Replace with your actual image path

export default function Screen5() {
  return (
    <div className="space-y-6">
      {/* Top Card: Screenshot */}
      <div className="border rounded-lg shadow overflow-hidden">
        <img
          src={screenshot}
          alt="GreenMatrix Panel Screenshot"
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Bottom Card: Text Description */}
      <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Hardware & Power Overview</h2>

        <div className="space-y-2 text-sm text-gray-700">
          <p><strong>CPU:</strong> Intel(R) Xeon(R) Platinum 8358 CPU @ 2.60GHz — 64 cores / 128 threads</p>
          <p><strong>GPU:</strong> NVIDIA A100 — 4 units</p>
          <p><strong>VRAM:</strong> 320 GB</p>
          <p><strong>Total Energy Consumption:</strong> 5.2 kWh</p>
          <p><strong>Power Consumption:</strong> 1.2 kW</p>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Based on provided model specifications (e.g., model name, task type, FLOPs), this function generates a simulated performance output. The simulation benchmarks the specified hardware configuration against configurations in your environment or chosen cloud provider. This allows for proactive identification of potential bottlenecks and optimal resource allocation before any physical deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
