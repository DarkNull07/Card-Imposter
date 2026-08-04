'use me';
'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { JoinForm } from '../components/JoinForm';
import { NameForm } from '../components/NameForm';
import { Toaster } from '../components/Toaster';
import { UI_STRINGS } from '../lib/strings';

export default function HomePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [lastCode, setLastCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    // Generate or retrieve player token
    let storedToken = localStorage.getItem('cardimposter.playerToken');
    if (!storedToken) {
      storedToken = crypto.randomUUID();
      localStorage.setItem('cardimposter.playerToken', storedToken);
    }
    setToken(storedToken);

    const storedName = localStorage.getItem('cardimposter.displayName');
    if (storedName) setDisplayName(storedName);

    const storedCode = localStorage.getItem('cardimposter.lastCode');
    if (storedCode) setLastCode(storedCode);
  }, []);

  const handleCreateParty = async (name: string) => {
    if (!token) return;
    setLoading(true);
    setToastError(null);

    try {
      localStorage.setItem('cardimposter.displayName', name);

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': token,
        },
        body: JSON.stringify({ name }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to create party');
      }

      localStorage.setItem('cardimposter.lastCode', json.code);
      router.push(`/party/${json.code}`);
    } catch (err: any) {
      setToastError(err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async (code: string) => {
    if (!token) return;
    if (!displayName.trim()) {
      setToastError('Please enter a display name before joining.');
      return;
    }

    setLoading(true);
    setToastError(null);

    try {
      localStorage.setItem('cardimposter.displayName', displayName.trim());

      const res = await fetch(`/api/room/${code}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': token,
        },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to join party');
      }

      localStorage.setItem('cardimposter.lastCode', code);
      router.push(`/party/${code}`);
    } catch (err: any) {
      setToastError(err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

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

      {/* Main Form Container */}
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Step 1: Display Name */}
        <NameForm
          initialName={displayName}
          onSubmit={(name) => {
            setDisplayName(name);
            handleCreateParty(name);
          }}
          submitLabel={UI_STRINGS.CREATE_PARTY}
          loading={loading}
        />

        <div className="relative flex items-center my-1">
          <div className="flex-grow border-t border-borderSubtle" />
          <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest text-textMuted/60">
            Or Join Existing
          </span>
          <div className="flex-grow border-t border-borderSubtle" />
        </div>

        {/* Step 2: Join Code */}
        <JoinForm
          initialCode={lastCode}
          onJoin={handleJoinParty}
          loading={loading}
        />
      </div>

      {/* Error Toaster */}
      <Toaster message={toastError} onDismiss={() => setToastError(null)} />
    </div>
  );
}
