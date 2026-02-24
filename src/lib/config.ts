import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

export const DATA_DIR = join(homedir(), '.xmarks');
export const DB_PATH = join(DATA_DIR, 'db.sqlite');
export const BIRD_PATH = '/opt/homebrew/bin/bird';
export const PORT = 3000;

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}
