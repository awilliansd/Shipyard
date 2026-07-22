import { app } from 'electron';
import { join } from 'path';
import { appendFileSync } from 'fs';

export function getElectronLogPath() {
  return join(app.getPath('userData'), 'electron.log');
}

export function logElectron(msg: string, err?: unknown) {
  const line = `[${new Date().toISOString()}] ${msg}${err ? ` | ${String(err)}` : ''}\n`;
  try {
    appendFileSync(getElectronLogPath(), line, 'utf-8');
  } catch {
    // best-effort logging only
  }
  console.log(msg, err ?? '');
}