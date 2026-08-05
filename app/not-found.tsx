import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-darkBg text-textMain flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-cardBg border border-borderSubtle rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-4xl font-extrabold text-accent mb-2">404</h2>
        <h3 className="text-xl font-bold mb-4">Party Not Found</h3>
        <p className="text-sm text-textMuted mb-6">
          The party code or route you entered does not exist or has expired.
        </p>
        <Link
          href="/"
          className="block w-full py-3 bg-accent text-darkBg font-bold rounded-xl text-center hover:opacity-90 transition shadow-lg"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
