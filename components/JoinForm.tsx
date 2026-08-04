import React, { useState } from 'react';
import { PARTY_CODE_ALPHABET, PARTY_CODE_LENGTH } from '@/lib/config';

interface JoinFormProps {
  initialCode?: string;
  onJoin: (code: string) => void;
  loading?: boolean;
}

export const JoinForm: React.FC<JoinFormProps> = ({
  initialCode = '',
  onJoin,
  loading = false,
}) => {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uppercase = e.target.value.toUpperCase();
    // Strip characters not in party code alphabet
    const filtered = uppercase
      .split('')
      .filter((char) => PARTY_CODE_ALPHABET.includes(char))
      .join('')
      .slice(0, PARTY_CODE_LENGTH);

    setCode(filtered);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== PARTY_CODE_LENGTH) {
      setError(`Party code must be ${PARTY_CODE_LENGTH} characters`);
      return;
    }
    setError(null);
    onJoin(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div>
        <label htmlFor="party-code" className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1">
          Party Code
        </label>
        <input
          id="party-code"
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="e.g. K7QMR"
          maxLength={PARTY_CODE_LENGTH}
          className="w-full px-4 py-3 min-h-[44px] text-center font-mono font-bold tracking-widest text-lg rounded-xl bg-darkBg border border-borderSubtle text-textMain placeholder-textMuted/50 focus:outline-none focus:ring-2 focus:ring-accent transition uppercase"
          required
        />
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || code.length !== PARTY_CODE_LENGTH}
        className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {loading ? 'Joining...' : 'Join Party'}
      </button>
    </form>
  );
};
