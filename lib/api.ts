import { NextRequest, NextResponse } from 'next/server';
import { ERROR_MESSAGES } from './strings';

export const HTTP_STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  NAME_TAKEN: 409,
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  ROOM_EXPIRED: 410,
  NOT_LEADER: 403,
  NOT_A_PLAYER: 403,
  WRONG_PHASE: 409,
  ALREADY_SUBMITTED: 409,
  ALREADY_VOTED: 409,
  NOT_ENOUGH_PLAYERS: 409,
  SELF_VOTE: 400,
  SPECTATOR_FORBIDDEN: 403,
  ELIMINATED_FORBIDDEN: 403,
  RATE_LIMITED: 429,
  CONFLICT_RETRY: 409,
  INTERNAL: 500,
};

export function extractPlayerToken(req: NextRequest): string | null {
  // Extract strictly from x-player-token header for normal routes
  const headerToken = req.headers.get('x-player-token');
  if (headerToken) return headerToken.trim();
  return null;
}

export function jsonError(errorCode: string, customMessage?: string, retryAfterSeconds?: number): NextResponse {
  const status = HTTP_STATUS_MAP[errorCode] || 500;
  const message = customMessage || ERROR_MESSAGES[errorCode] || 'An unexpected error occurred.';

  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
  };

  if (errorCode === 'RATE_LIMITED' && retryAfterSeconds) {
    headers['Retry-After'] = retryAfterSeconds.toString();
  }

  return NextResponse.json(
    { error: errorCode, message },
    { status, headers }
  );
}

export function jsonStateResponse(statePayload: any): NextResponse {
  return NextResponse.json(statePayload, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
