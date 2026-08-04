import React from 'react';

interface ToasterProps {
  message: string | null;
  onDismiss: () => void;
}

export const Toaster: React.FC<ToasterProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 max-w-md z-50 bg-danger text-white px-4 py-3 rounded-2xl shadow-2xl border border-red-400 flex items-center justify-between gap-3 animate-slideUp"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>⚠️</span>
        <span>{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="min-h-[32px] px-2 py-1 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-lg transition"
        aria-label="Dismiss error notification"
      >
        Dismiss
      </button>
    </div>
  );
};
