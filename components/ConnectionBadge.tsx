import React from 'react';
import { ConnectionStatus } from '@/lib/usePoll';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ status }) => {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/30 text-success text-[11px] font-semibold">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span>Live</span>
      </div>
    );
  }

  if (status === 'amber') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/30 text-danger text-[11px] font-semibold">
      <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
      <span>Offline</span>
    </div>
  );
};
