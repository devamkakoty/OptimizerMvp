import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
ChartJS.register(ArcElement, Tooltip);

function CircularProgressChart({ percentage }) {
  const data = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: ['#16a34a', '#d1fae5'], // green and light green
        borderWidth: 0,
        cutout: '80%', // controls donut thickness
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="relative w-30 h-30 mb-4">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-green-600 font-bold text-xl">{percentage}%</span>
      </div>
    </div>
  );
}

export default CircularProgressChart;
