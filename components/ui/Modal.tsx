import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Changed title from string to React.ReactNode to allow JSX elements.
  title: React.ReactNode;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  maxWidth = "2xl",
}) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full max-w-${maxWidth} transform transition-all animate-in-up`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slide-in-from-bottom 0.3s ease-out' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 id="modal-title" className="text-xl font-semibold text-gray-800">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={24} />
            </button>
          )}
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-none">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slide-in-from-bottom {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in-up {
          animation: slide-in-from-bottom 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Modal;
