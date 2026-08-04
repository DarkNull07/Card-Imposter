import React from 'react';

interface RulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesDialog: React.FC<RulesDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-dialog-title"
    >
      <div
        className="w-full max-w-lg bg-darkSurface border border-borderSubtle rounded-2xl p-6 flex flex-col gap-4 text-textMain shadow-2xl overflow-y-auto max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
          <h3 id="rules-dialog-title" className="text-lg font-black text-white flex items-center gap-2">
            <span>⚔️</span> How to Play CARD IMPOSTER
          </h3>
          <button
            onClick={onClose}
            className="min-h-[36px] px-3 py-1 text-xs font-bold text-textMuted hover:text-white bg-darkBg rounded-lg border border-borderSubtle transition"
          >
            Close ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm text-textMain/90 leading-relaxed">
          <p>
            <strong className="text-accent">1. The Secret Cards:</strong> Every player receives a Clash Royale card name. All Crew members get the <em>SAME</em> card. Exactly ONE Imposter gets a <em>DIFFERENT</em> but thematically similar card!
          </p>
          <p>
            <strong className="text-accent">2. Round 1 & Round 2 Hints:</strong> In each round, write one subtle hint about your card without giving it away or naming it. Hints remain hidden until all alive players submit.
          </p>
          <p>
            <strong className="text-accent">3. Voting:</strong> Vote to eliminate the player you suspect is the Imposter. Self-votes are forbidden. Plurality wins (ties mean nobody is eliminated).
          </p>
          <p>
            <strong className="text-accent">4. Victory & Scoring:</strong>
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1 text-xs text-textMuted">
            <li><strong className="text-success">CREW WINS (+1 pt each):</strong> If the Imposter is eliminated.</li>
            <li><strong className="text-danger">IMPOSTER WINS (+3 pts):</strong> If a crewmate is eliminated or on a tie vote.</li>
          </ul>
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[44px] mt-2 py-3 rounded-xl font-bold text-white bg-accent hover:bg-accent/90 transition focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
