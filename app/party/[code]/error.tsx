'use client';

import React from 'react';

export default function PartyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-darkBg text-textMain flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-cardBg border border-danger/40 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold text-danger mb-3">Match Connection Error</h2>
        <p className="text-sm text-textMuted mb-6">
          {error.message || 'An error occurred while connecting to the match session.'}
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-accent text-darkBg font-bold rounded-xl hover:opacity-90 transition shadow-lg"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}
