import { execFile, spawn } from 'child_process';
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
  // Always pipe prompt via stdin to avoid Windows command line length limits (~8KB).
  // claude -p reads from stdin when no prompt argument is given.
  const args = ['-p'];

  if (options?.model) args.push('--model', options.model);
  if (options?.maxTurns) args.push('--max-turns', String(options.maxTurns));
  if (options?.outputFormat) args.push('--output-format', options.outputFormat);
  args.push('--no-session-persistence');

  // Remove ANTHROPIC_API_KEY to force subscription usage
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  return new Promise<string>((resolve, reject) => {
    const proc = spawn('claude', args, {
      env,
      cwd: options?.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    const timeout = options?.timeout ?? 30_000;
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Claude CLI timed out'));
    }, timeout);

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

    // Pipe prompt (+ optional input) via stdin
    const stdinContent = options?.input
      ? `${prompt}\n\n${options.input}`
      : prompt;
    proc.stdin.write(stdinContent);
    proc.stdin.end();
  });
}
