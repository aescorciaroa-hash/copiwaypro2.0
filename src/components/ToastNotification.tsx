import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle2, AlertCircle, MessageCircle, Trash2, Sparkles, X, Layers, Users, Sliders, Calculator } from 'lucide-react';

export interface ToastData {
  id?: string;
  type?: 'cart' | 'success' | 'info' | 'whatsapp' | 'warning' | 'danger' | 'staff' | 'inventory' | 'config' | 'cierre';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, toast.duration || 3200);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const renderIcon = () => {
    switch (toast.type) {
      case 'cart':
        return <ShoppingBag className="w-5 h-5 text-brand-orange" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'whatsapp':
        return <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'danger':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case 'inventory':
        return <Layers className="w-5 h-5 text-brand-orange" />;
      case 'staff':
        return <Users className="w-5 h-5 text-blue-500" />;
      case 'config':
        return <Sliders className="w-5 h-5 text-purple-500" />;
      case 'cierre':
        return <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'info':
      default:
        return <ShoppingBag className="w-5 h-5 text-brand-orange" />;
    }
  };

  const getBadgeStyle = () => {
    switch (toast.type) {
      case 'cart':
        return 'bg-brand-orange/10 border-brand-orange/20';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40';
      case 'whatsapp':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40';
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/40 border-red-200/50 dark:border-red-800/40';
      case 'inventory':
        return 'bg-brand-orange/10 border-brand-orange/20';
      case 'staff':
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40';
      case 'config':
        return 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/40';
      case 'cierre':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40';
      case 'info':
      default:
        return 'bg-brand-orange/10 border-brand-orange/20';
    }
  };

  const defaultTitle = toast.title || (
    toast.type === 'whatsapp' ? 'WhatsApp' :
    toast.type === 'staff' ? 'Equipo Copiway' :
    toast.type === 'inventory' ? 'Inventario Copiway' :
    toast.type === 'config' ? 'Ajustes Copiway' :
    toast.type === 'cierre' ? 'Cierre de Caja' : 'Copiway'
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center justify-between gap-3.5 bg-white dark:bg-[#151515] border border-gray-100 dark:border-stone-800 shadow-2xl p-3.5 sm:p-4 rounded-[22px] w-[90%] max-w-sm pointer-events-auto"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${getBadgeStyle()}`}>
            {renderIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">
              {defaultTitle}
            </p>
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-stone-400 mt-0.5 leading-snug">
              {toast.message}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-gray-50 dark:bg-stone-800/60 hover:bg-gray-100 dark:hover:bg-stone-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-stone-200 transition-colors shrink-0"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
