import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'CARD IMPOSTER - Clash Royale Social Deduction Game',
  description: 'A multiplayer social-deduction word game in the style of Spyfall, themed on Clash Royale card names.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-darkBg text-textMain antialiased min-h-screen flex flex-col font-sans selection:bg-accent selection:text-white">
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center">
          {children}
        </main>
      </body>
    </html>
  );
}
