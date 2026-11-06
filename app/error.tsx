'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-darkBg text-textMain flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-cardBg border border-danger/30 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-danger mb-4">Something went wrong!</h2>
        <p className="text-sm text-textMuted mb-6">
          {error.message || 'An unexpected application error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-accent text-darkBg font-bold rounded-xl hover:opacity-90 transition shadow-lg"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
