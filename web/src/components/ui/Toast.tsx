import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon = type === 'success' ? CheckCircle : XCircle;
  const colorClass = type === 'success' ? 'text-success' : 'text-danger';
  const borderClass = type === 'success' ? 'border-success/30' : 'border-danger/30';

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3
        bg-bg-elevated border ${borderClass} px-4 py-3
        shadow-lg transition-all duration-300
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <Icon className={`w-5 h-5 ${colorClass}`} />
      <span className="font-mono text-sm text-text">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-2 text-muted hover:text-text transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Toast container for managing multiple toasts
interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
