// components/CardModal.jsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Screen1 from './screens/Screen1';
import Screen2 from './screens/Screen2';
import Screen3 from './screens/Screen3';
import Screen4 from './screens/Screen4';
import Screen5 from './screens/Screen5';

const screens = [<Screen1 />, <Screen2 />, <Screen3 />, <Screen4 />, <Screen5 />];

function CardModal({ onClose }) {
  const [index, setIndex] = useState(0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>

        {/* Render current screen */}
        {screens[index]}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          {index > 0 ? (
            <button onClick={() => setIndex(index - 1)} className="text-gray-600 hover:text-gray-800">
              <ChevronLeft size={28} />
            </button>
          ) : <div />}

          {index < screens.length - 1 && (
            <button onClick={() => setIndex(index + 1)} className="text-gray-600 hover:text-gray-800">
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Cancel button */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
export default CardModal;
