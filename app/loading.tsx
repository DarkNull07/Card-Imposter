import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-darkBg text-textMain flex items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-textMuted tracking-wider uppercase">Loading Arena...</p>
      </div>
    </div>
  );
}
