// components/CardModal.jsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Screen1 from "./screens/Screen1";
import Screen2 from "./screens/Screen2";
import Screen3 from "./screens/Screen3";
import Screen4 from "./screens/Screen4";
import Screen5 from "./screens/Screen5";

const screens = [<Screen1 />, <Screen2 />, <Screen3 />, <Screen4 />, <Screen5 />];

function CardModal({ showModal, onClose }) {
    const [index, setIndex] = useState(0);

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6 relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                {/* Render current screen */}
                <div className="relative">
                    {screens[index]}
                </div>

                {/* Left navigation */}
                {index > 0 && (
                    <button
                        onClick={() => setIndex(index - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 transform bg-[#01a982] text-white rounded-md shadow p-2 hover:bg-[#018f6c]"
                    >
                        <ChevronLeft size={22} />
                    </button>
                )}

                {/* Right navigation */}
                {index < screens.length - 1 && (
                    <button
                        onClick={() => setIndex(index + 1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transform bg-[#01a982] text-white rounded-md shadow p-2 hover:bg-[#018f6c]"
                    >
                        <ChevronRight size={22} />
                    </button>
                )}

                {/* Divider line */}
                <div className="border-t border-gray-200 mt-6" />

                {/* Cancel button */}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-2 border-2 border-[#01a982] text-black font-medium rounded-full hover:bg-[#01a982] hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CardModal;
