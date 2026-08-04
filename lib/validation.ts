import { z } from 'zod';
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH } from './config';

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, 'Name is required')
    .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters`),
});

export const joinRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, 'Name is required')
    .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters`),
});

export const submitMessageSchema = z.object({
  round: z.number().int().min(1).max(2),
  body: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
});

export const castVoteSchema = z.object({
  targetPlayerId: z.string().uuid('Invalid target player ID'),
});

export const kickPlayerSchema = z.object({
  playerId: z.string().uuid('Invalid player ID'),
});
