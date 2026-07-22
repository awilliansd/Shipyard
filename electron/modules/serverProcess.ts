import http from 'http';
import { spawn, fork, type ChildProcess } from 'child_process';
import { dialog } from 'electron';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { PORT, SERVER_ENTRY, CLIENT_DIST, DATA_DIR, ROOT_DIR, isDev } from './paths';
import { logElectron, getElectronLogPath } from './logger';

let serverProcess: ChildProcess | null = null;
let isQuitting = false;
let restartInProgress = false;
let restartTimestamps: number[] = [];
let lastServerErrorHint: string | null = null;

export function setQuitting(value: boolean) {
  isQuitting = value;
}

export function getServerErrorHint() {
  return lastServerErrorHint;
}

function isPortInUseError(msg: string) {
  const lower = msg.toLowerCase();
  return lower.includes('eaddrinuse') || lower.includes('already in use') || (lower.includes('port') && lower.includes('in use'));
}

function checkServerReady(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path: '/api/settings', method: 'GET', timeout: 1000 },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function waitForServer(maxAttempts = 30, intervalMs = 500): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkServerReady()) {
      console.log(`[Electron] Server confirmed ready (attempt ${i + 1})`);
      return;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log('[Electron] Server health check timed out, proceeding anyway');
}

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export async function waitForServerReady(url: string, timeoutMs = 15000, intervalMs = 300): Promise<void> {
  const start = Date.now();
  const urlObj = new URL(url);

  logElectron(`[Electron] Waiting for server at ${url} (timeout ${timeoutMs}ms)`);
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(
          {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: '/',
            timeout: 1500,
          },
          (res) => {
            res.resume();
            resolve();
          },
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy(new Error('timeout'));
        });
      });
      return;
    } catch {
      await delay(intervalMs);
    }
  }

  throw new Error(`Server did not respond within ${timeoutMs}ms`);
}

export function startServer(onReady: () => void): Promise<void> {
  return new Promise((res, reject) => {
    lastServerErrorHint = null;
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      SHIPYARD_ELECTRON: '1',
      SHIPYARD_DATA_DIR: DATA_DIR,
      SHIPYARD_STATIC_DIR: CLIENT_DIST,
      SHIPYARD_PORT: String(PORT),
      SHIPYARD_HOST: '127.0.0.1',
    };

    console.log('[Electron] Paths:');
    console.log('  SERVER_ENTRY:', SERVER_ENTRY);
    console.log('  CLIENT_DIST:', CLIENT_DIST);
    console.log('  DATA_DIR:', DATA_DIR);
    console.log('  isDev:', isDev);
    console.log('  exists(SERVER_ENTRY):', existsSync(SERVER_ENTRY));
    console.log('  exists(CLIENT_DIST):', existsSync(CLIENT_DIST));

    if (isDev) {
      const tsxBin = resolve(
        ROOT_DIR,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
      );
      serverProcess = fork(SERVER_ENTRY, [], {
        env,
        execArgv: [],
        execPath: tsxBin,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });
    } else {
      env.ELECTRON_RUN_AS_NODE = '1';
      serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
    }

    const proc = serverProcess!;
    let started = false;

    proc.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.log('[Server]', msg.trim());
      if (!started && (msg.includes('running on') || msg.includes(`${PORT}`))) {
        started = true;
        waitForServer(10, 300).then(() => res());
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      console.error('[Server:err]', msg.trim());
      if (isPortInUseError(msg)) {
        lastServerErrorHint = msg.trim();
      }
    });

    proc.on('error', (err) => {
      console.error('[Electron] Server spawn error:', err);
      if (!started) {
        started = true;
        reject(err);
      }
    });

    proc.on('exit', (code) => {
      console.log(`[Server] Process exited with code ${code}`);
      serverProcess = null;
      if (!started) {
        started = true;
        reject(new Error(`Server exited with code ${code}`));
        return;
      }
      if (!isQuitting) {
        if (lastServerErrorHint) {
          logElectron('[Electron] Server exited due to port conflict:', lastServerErrorHint);
          dialog.showErrorBox(
            'Dockyard - Port In Use',
            `The Dockyard server could not start because the port is already in use.\n\nDetails:\n${lastServerErrorHint}\n\nClose other instances or free the port and try again.`,
          );
          return;
        }
        restartServerWithBackoff(onReady);
      }
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        console.log('[Electron] Stdout detection timed out, falling back to HTTP polling');
        waitForServer().then(() => res());
      }
    }, 5000);
  });
}

export function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

export async function restartServerWithBackoff(onReady: () => void) {
  if (restartInProgress || isQuitting) return;
  restartInProgress = true;

  const now = Date.now();
  restartTimestamps = restartTimestamps.filter((t) => now - t < 30000);
  restartTimestamps.push(now);
  if (restartTimestamps.length > 3) {
    logElectron('[Electron] Server keeps crashing. Aborting auto-restart.');
    dialog.showErrorBox(
      'Dockyard - Server Failure',
      `The server crashed multiple times during startup.\n\nCheck logs at:\n${getElectronLogPath()}`,
    );
    restartInProgress = false;
    return;
  }

  const backoffMs = 1500;
  logElectron(`[Electron] Server exited. Restarting in ${backoffMs}ms...`);
  await delay(backoffMs);

  try {
    await startServer(onReady);
    onReady();
  } catch (err) {
    logElectron('[Electron] Server restart failed:', err);
  } finally {
    restartInProgress = false;
  }
}