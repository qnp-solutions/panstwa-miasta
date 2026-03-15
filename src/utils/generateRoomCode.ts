import { ROOM_CODE_LENGTH } from '../constants/game';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude O/0, I/1 for readability

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}
