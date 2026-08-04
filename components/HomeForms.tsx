'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH, PARTY_CODE_ALPHABET, PARTY_CODE_LENGTH } from '@/lib/config';
import { Toaster } from './Toaster';
import { UI_STRINGS } from '@/lib/strings';

export function HomeForms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCode = searchParams.get('code') || '';

  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    let storedToken = localStorage.getItem('cardimposter.playerToken');
    if (!storedToken) {
      storedToken = crypto.randomUUID();
      localStorage.setItem('cardimposter.playerToken', storedToken);
    }
    setToken(storedToken);

    const storedName = localStorage.getItem('cardimposter.displayName');
    if (storedName) setName(storedName);

    const storedCode = queryCode.toUpperCase() || localStorage.getItem('cardimposter.lastCode') || '';
    if (storedCode) setCode(storedCode);
  }, [queryCode]);

  const validateName = (rawName: string): string | null => {
    const trimmed = rawName.trim();
    if (!trimmed || trimmed.length < MIN_NAME_LENGTH) {
      return 'Please enter a display name.';
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      return `Name cannot exceed ${MAX_NAME_LENGTH} characters.`;
    }
    return null;
  };

  const validateCode = (rawCode: string): string | null => {
    const trimmed = rawCode.trim().toUpperCase();
    if (trimmed.length !== PARTY_CODE_LENGTH) {
      return `Party code must be ${PARTY_CODE_LENGTH} characters.`;
    }
    return null;
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const err = validateName(name);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(null);
    setToastError(null);

    const trimmedName = name.trim();
    localStorage.setItem('cardimposter.displayName', trimmedName);
    setLoading(true);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': token,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to create party');
      }

      localStorage.setItem('cardimposter.lastCode', json.code);
      router.push(`/party/${json.code}`);
    } catch (err: any) {
      setToastError(err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const errName = validateName(name);
    if (errName) {
      setNameError(errName);
      return;
    }
    setNameError(null);

    const errCode = validateCode(code);
    if (errCode) {
      setCodeError(errCode);
      return;
    }
    setCodeError(null);
    setToastError(null);

    const trimmedName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    localStorage.setItem('cardimposter.displayName', trimmedName);
    localStorage.setItem('cardimposter.lastCode', cleanCode);
    setLoading(true);

    try {
      const res = await fetch(`/api/room/${cleanCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-token': token,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || json.error || 'Failed to join party');
      }

      router.push(`/party/${cleanCode}`);
    } catch (err: any) {
      setToastError(err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercase = e.target.value.toUpperCase();
    const filtered = uppercase
      .split('')
      .filter((char) => PARTY_CODE_ALPHABET.includes(char))
      .join('')
      .slice(0, PARTY_CODE_LENGTH);

    setCode(filtered);
    if (codeError) setCodeError(null);
  };

  return (
    <>
      <div className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
        {/* Step 1: Display Name Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="display-name-input" className="block text-xs font-semibold uppercase tracking-wider text-textMuted">
            Your Display Name
          </label>
          <input
            id="display-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              localStorage.setItem('cardimposter.displayName', e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="e.g. RoyalKnight"
            maxLength={MAX_NAME_LENGTH}
            className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-darkBg border border-borderSubtle text-textMain placeholder-textMuted/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
            required
          />
          {nameError && <p className="text-xs text-danger">{nameError}</p>}
        </div>

        {/* Create Party Action */}
        <button
          type="button"
          onClick={handleCreateParty}
          disabled={loading || !name.trim()}
          className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {loading ? 'Creating...' : UI_STRINGS.CREATE_PARTY}
        </button>

        <div className="relative flex items-center my-1">
          <div className="flex-grow border-t border-borderSubtle" />
          <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest text-textMuted/60">
            Or Join Existing
          </span>
          <div className="flex-grow border-t border-borderSubtle" />
        </div>

        {/* Join Party Action */}
        <form onSubmit={handleJoinParty} className="flex flex-col gap-3 w-full">
          <div>
            <label htmlFor="party-code-input" className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1">
              Party Code
            </label>
            <input
              id="party-code-input"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="e.g. K7QMR"
              maxLength={PARTY_CODE_LENGTH}
              className="w-full px-4 py-3 min-h-[44px] text-center font-mono font-bold tracking-widest text-lg rounded-xl bg-darkBg border border-borderSubtle text-textMain placeholder-textMuted/50 focus:outline-none focus:ring-2 focus:ring-accent transition uppercase"
              required
            />
            {codeError && <p className="text-xs text-danger mt-1">{codeError}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== PARTY_CODE_LENGTH || !name.trim()}
            className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {loading ? 'Joining...' : 'Join Party'}
          </button>
        </form>
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
