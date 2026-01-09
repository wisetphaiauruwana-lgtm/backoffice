
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: {
      bg: 'bg-green-500',
      icon: <CheckCircle2 className="text-white" />,
    },
    error: {
      bg: 'bg-red-500',
      icon: <AlertCircle className="text-white" />,
    },
  };

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center justify-between p-4 rounded-lg shadow-lg text-white ${styles[type].bg} animate-slide-in-right`}>
      <div className="flex items-center">
        {styles[type].icon}
        <p className="ml-3 font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors">
        <X size={18} />
      </button>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
