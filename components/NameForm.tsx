import React, { useState } from 'react';
import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '@/lib/config';

interface NameFormProps {
  initialName?: string;
  onSubmit: (name: string) => void;
  submitLabel?: string;
  loading?: boolean;
}

export const NameForm: React.FC<NameFormProps> = ({
  initialName = '',
  onSubmit,
  submitLabel = 'Create Party',
  loading = false,
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < MIN_NAME_LENGTH) {
      setError('Please enter a display name');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div>
        <label htmlFor="display-name" className="block text-xs font-semibold uppercase tracking-wider text-textMuted mb-1">
          Your Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. RoyalKnight"
          maxLength={MAX_NAME_LENGTH}
          className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-darkBg border border-borderSubtle text-textMain placeholder-textMuted/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
          required
        />
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[44px] px-5 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 active:scale-[0.98] transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {loading ? 'Creating...' : submitLabel}
      </button>
    </form>
  );
};
