import React, { useEffect } from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none font-mono">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "pointer-events-auto min-w-[300px] max-w-md p-3 border-l-4 shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-full duration-300 bg-black border-y border-r border-slate-800",
            toast.type === 'success' && "border-l-emerald-500",
            toast.type === 'error' && "border-l-rose-500",
            toast.type === 'warning' && "border-l-amber-500",
            toast.type === 'info' && "border-l-blue-500"
          )}
        >
          <div className={clsx(
            "shrink-0 mt-0.5",
            toast.type === 'success' && "text-emerald-500",
            toast.type === 'error' && "text-rose-500",
            toast.type === 'warning' && "text-amber-500",
            toast.type === 'info' && "text-blue-500"
          )}>
            {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {toast.type === 'warning' && <Bell className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <h4 className={clsx(
              "font-bold text-xs uppercase tracking-wider",
              toast.type === 'success' && "text-emerald-500",
              toast.type === 'error' && "text-rose-500",
              toast.type === 'warning' && "text-amber-500",
              toast.type === 'info' && "text-blue-500"
            )}>{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-1">{toast.message}</p>
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            className="text-slate-600 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
