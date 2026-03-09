import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { platform } from 'os';

export type TerminalType = 'claude' | 'claude-yolo' | 'dev' | 'shell';

const isLinux = platform() === 'linux';

async function detectDevCommand(projectPath: string): Promise<string | null> {
  try {
    const pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'));
    if (pkg.scripts?.dev) return 'pnpm dev';
    if (pkg.scripts?.start) return 'pnpm start';
    if (pkg.scripts?.serve) return 'pnpm serve';
  } catch {}
  return null;
}

function spawnDetached(cmd: string, args: string[], useShell = false) {
  spawn(cmd, args, {
    detached: true,
    stdio: 'ignore',
    shell: useShell,
  }).unref();
}

function launchLinuxTerminal(projectPath: string, title: string, command?: string) {
  // Try gnome-terminal first, fall back to x-terminal-emulator
  const args = ['--title', title, '--working-directory', projectPath];
  if (command) {
    args.push('--', 'bash', '-c', `${command}; exec bash`);
  }
  spawnDetached('gnome-terminal', args);
}

export async function launchTerminal(projectPath: string, type: TerminalType): Promise<void> {
  if (isLinux) {
    switch (type) {
      case 'claude':
        launchLinuxTerminal(projectPath, 'Claude Code', 'claude');
        break;
      case 'claude-yolo':
        launchLinuxTerminal(projectPath, 'Claude Code', 'claude --dangerously-skip-permissions');
        break;
      case 'dev': {
        const devCmd = await detectDevCommand(projectPath);
        if (devCmd) {
          launchLinuxTerminal(projectPath, 'Dev Server', devCmd);
        } else {
          launchLinuxTerminal(projectPath, 'Dev Server');
        }
        break;
      }
      case 'shell':
        launchLinuxTerminal(projectPath, 'Shell');
        break;
    }
    return;
  }

  // Windows: wt.exe + cmd.exe
  const args: string[] = ['-w', '0', 'nt', '-d', projectPath];

  switch (type) {
    case 'claude':
      args.push('--title', 'Claude Code', 'cmd.exe', '/k', 'set CLAUDECODE= && claude');
      break;
    case 'claude-yolo':
      args.push('--title', 'Claude Code', 'cmd.exe', '/k', 'set CLAUDECODE= && claude --dangerously-skip-permissions');
      break;
    case 'dev': {
      const devCmd = await detectDevCommand(projectPath);
      if (devCmd) {
        args.push('--title', 'Dev Server', 'cmd.exe', '/k', devCmd);
      } else {
        args.push('--title', 'Dev Server');
      }
      break;
    }
    case 'shell':
      args.push('--title', 'Shell');
      break;
  }

  spawnDetached('wt.exe', args);
}

export async function launchVSCode(projectPath: string): Promise<void> {
  spawnDetached('code', [projectPath], true);
}

export async function openFolder(projectPath: string): Promise<void> {
  if (isLinux) {
    spawnDetached('xdg-open', [projectPath]);
  } else {
    spawnDetached('explorer.exe', [projectPath]);
  }
}
