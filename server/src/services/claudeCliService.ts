import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Cache CLI availability (re-check every 60s)
let cliAvailable: boolean | null = null;
let lastCheck = 0;

export async function isCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('claude', ['--version'], {
      timeout: 5000,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getCliStatus(): Promise<boolean> {
  const now = Date.now();
  if (cliAvailable !== null && now - lastCheck < 60_000) return cliAvailable;
  cliAvailable = await isCliAvailable();
  lastCheck = now;
  return cliAvailable;
}

export interface RunPromptOptions {
  input?: string;
  model?: string;
  maxTurns?: number;
  outputFormat?: 'text' | 'json';
  timeout?: number;
  cwd?: string;
}

export async function runPrompt(prompt: string, options?: RunPromptOptions): Promise<string> {
  const args = ['-p', prompt];

  if (options?.model) args.push('--model', options.model);
  if (options?.maxTurns) args.push('--max-turns', String(options.maxTurns));
  if (options?.outputFormat) args.push('--output-format', options.outputFormat);
  args.push('--no-session-persistence');

  // Remove ANTHROPIC_API_KEY to force subscription usage
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  const execOptions: any = {
    encoding: 'utf-8' as const,
    timeout: options?.timeout ?? 30_000,
    maxBuffer: 1024 * 1024,
    env,
    windowsHide: true,
  };
  if (options?.cwd) execOptions.cwd = options.cwd;

  // If input is provided, use stdin
  if (options?.input) {
    // Use spawn for stdin piping
    const { spawn } = await import('child_process');
    return new Promise<string>((resolve, reject) => {
      const proc = spawn('claude', args, {
        env,
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('Claude CLI timed out'));
      }, options?.timeout ?? 30_000);

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}`));
        }
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      proc.stdin.write(options.input);
      proc.stdin.end();
    });
  }

  const { stdout } = await execFileAsync('claude', args, execOptions);
  return String(stdout).trim();
}
