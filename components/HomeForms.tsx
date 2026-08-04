'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { JoinForm } from './JoinForm';
import { NameForm } from './NameForm';
import { Toaster } from './Toaster';
import { UI_STRINGS } from '@/lib/strings';

export function HomeForms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCode = searchParams.get('code') || '';

  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [lastCode, setLastCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  useEffect(() => {
    let storedToken = localStorage.getItem('cardimposter.playerToken');
    if (!storedToken) {
      storedToken = crypto.randomUUID();
      localStorage.setItem('cardimposter.playerToken', storedToken);
    }
    setToken(storedToken);

    const storedName = localStorage.getItem('cardimposter.displayName');
    if (storedName) setDisplayName(storedName);

    const storedCode = queryCode.toUpperCase() || localStorage.getItem('cardimposter.lastCode') || '';
    if (storedCode) setLastCode(storedCode);
  }, [queryCode]);

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
    <>
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
    </>
  );
}

export function HomeFormsFallback() {
  return (
    <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-6 shadow-2xl flex flex-col gap-6 animate-pulse">
      <div className="h-24 bg-darkBg/60 rounded-xl" />
      <div className="h-6 bg-darkBg/30 rounded-xl" />
      <div className="h-24 bg-darkBg/60 rounded-xl" />
    </div>
  );
}
