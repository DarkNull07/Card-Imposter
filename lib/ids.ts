import { PARTY_CODE_ALPHABET, PARTY_CODE_LENGTH } from './config';
import crypto from 'crypto';

export function generatePartyCode(): string {
  let result = '';
  const alphabetLength = PARTY_CODE_ALPHABET.length;
  for (let i = 0; i < PARTY_CODE_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, alphabetLength);
    result += PARTY_CODE_ALPHABET[randomIndex];
  }
  return result;
}
