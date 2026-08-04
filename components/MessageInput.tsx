import React, { useState } from 'react';
import { MAX_MESSAGE_LENGTH } from '../lib/config';

interface MessageInputProps {
  onSubmit: (body: string) => void;
  hasSubmitted: boolean;
  myMessage: string | null;
  disabled?: boolean;
  loading?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSubmit,
  hasSubmitted,
  myMessage,
  disabled = false,
  loading = false,
}) => {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (hasSubmitted) {
    return (
      <div className="w-full bg-darkSurface border border-success/30 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-success text-xs font-bold uppercase tracking-wider">
          <span>✓ Hint Submitted</span>
        </div>
        <p className="text-sm text-textMain italic bg-darkBg/60 p-3 rounded-xl border border-borderSubtle">
          &quot;{myMessage}&quot;
        </p>
        <p className="text-xs text-textMuted">
          Waiting for all players to submit their hints before revealing...
        </p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Please write a hint before sending.');
      return;
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Hint cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  const remaining = MAX_MESSAGE_LENGTH - body.length;

  return (
    <form onSubmit={handleSubmit} className="w-full bg-darkSurface border border-borderSubtle rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor="hint-input" className="text-xs font-semibold uppercase tracking-wider text-textMuted">
          Your Card Hint (Max 140 Chars)
        </label>
        <span
          className={`text-xs font-mono font-bold ${
            remaining < 20 ? 'text-amber-400' : 'text-textMuted'
          }`}
        >
          {remaining}
        </span>
      </div>

      <div className="flex gap-2 flex-col sm:flex-row">
        <input
          id="hint-input"
          type="text"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Give a subtle hint about your card..."
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled || loading}
          className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-darkBg border border-borderSubtle text-textMain placeholder-textMuted/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 transition"
          required
        />
        <button
          type="submit"
          disabled={disabled || loading || !body.trim()}
          className="min-h-[44px] px-6 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {loading ? 'Sending...' : 'Send Hint'}
        </button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
};
