import React, { Suspense } from 'react';
import { HomeForms, HomeFormsFallback } from '@/components/HomeForms';
import { UI_STRINGS } from '@/lib/strings';

export default function HomePage() {
  return (
    <div className="w-full flex flex-col items-center gap-8 py-4 sm:py-8 animate-fadeIn">
      {/* Title & Tagline */}
      <div className="text-center flex flex-col items-center gap-2">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center gap-3">
          <span>⚔️</span>
          <span className="bg-gradient-to-r from-accent via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {UI_STRINGS.APP_TITLE}
          </span>
        </h1>
        <p className="text-sm sm:text-base text-textMuted font-medium max-w-md">
          {UI_STRINGS.APP_TAGLINE}
        </p>
      </div>

      {/* Main Form Container wrapped in Suspense */}
      <Suspense fallback={<HomeFormsFallback />}>
        <HomeForms />
      </Suspense>
    </div>
  );
}
