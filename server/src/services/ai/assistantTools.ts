import { readdir, stat, readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve, extname, sep, dirname } from 'path';
import { getProjects } from '../projectDiscovery.js';
import * as log from '../logService.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const IGNORE_NAMES = new Set([
  '.git', 'node_modules', '__pycache__', '.next', 'dist', 'build',
  '.cache', 'vendor', '.turbo', '.nuxt', '.output', 'coverage',
  '.parcel-cache', '.svelte-kit',
]);

const VISIBLE_DOTFILES = new Set([
  '.env', '.env.local', '.env.example', '.env.development', '.env.production',
  '.env.staging', '.env.test', '.env.sample', '.env.defaults', '.env.template',
  '.gitignore', '.gitattributes', '.gitmodules',
  '.dockerignore', '.docker',
  '.editorconfig',
  '.prettierrc', '.prettierignore',
  '.eslintrc', '.eslintignore',
  '.babelrc',
  '.npmrc', '.nvmrc', '.npmignore',
  '.yarnrc',
  '.browserslistrc',
  '.stylelintrc',
  '.huskyrc',
  '.lintstagedrc',
]);

function isVisibleDotfile(name: string): boolean {
  if (VISIBLE_DOTFILES.has(name)) return true;
  if (name.startsWith('.env.')) return true;
  return false;
}

const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp',
};

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.jsonc', '.json5',
  '.md', '.mdx', '.markdown',
  '.css', '.scss', '.sass', '.less', '.styl',
  '.html', '.htm', '.xml', '.svg',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
  '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1',
  '.py', '.rb', '.rs', '.go', '.java', '.kt', '.kts', '.scala',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.m',
  '.sql', '.graphql', '.gql',
  '.env', '.env.local', '.env.example', '.gitignore', '.gitattributes',
  '.dockerignore', '.editorconfig', '.prettierrc', '.eslintrc',
  '.txt', '.log', '.csv', '.tsv',
  '.vue', '.svelte', '.astro',
  '.prisma', '.proto',
  '.lock',
]);

function getMimeHint(ext: string, name: string): string {
  if (IMAGE_TYPES[ext]) return IMAGE_TYPES[ext];
  if (ext === '.md' || ext === '.mdx' || ext === '.markdown') return 'text/markdown';
  if (ext === '.json' || ext === '.jsonc') return 'application/json';
  if (TEXT_EXTENSIONS.has(ext)) return 'text/plain';
  if (name.startsWith('.env')) return 'text/plain';
  const textNames = new Set([
    'Makefile', 'Dockerfile', 'Procfile', 'Gemfile', 'Rakefile',
    'LICENSE', 'CHANGELOG', 'README', 'CLAUDE',
    '.gitignore', '.gitattributes', '.gitmodules', '.dockerignore',
    '.editorconfig', '.prettierrc', '.prettierignore',
    '.eslintrc', '.eslintignore', '.babelrc',
    '.npmrc', '.nvmrc', '.npmignore', '.yarnrc',
    '.browserslistrc', '.stylelintrc', '.huskyrc', '.lintstagedrc',
  ]);
  if (textNames.has(name)) return 'text/plain';
  return 'application/octet-stream';
}

async function getProjectPath(projectId: string): Promise<string | null> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  return project?.path || null;
}

function validatePath(projectPath: string, relPath: string, projectId?: string): string {
  const resolved = resolve(join(projectPath, relPath));
  const projectRoot = resolve(projectPath);
  if (!resolved.startsWith(projectRoot + sep) && resolved !== projectRoot) {
    log.warn('files', 'Path traversal attempt blocked', `${relPath} → ${resolved}`, projectId);
    throw new Error('Path traversal detected');
  }
  return resolved;
}

export type AssistantToolResult = { ok: boolean; data?: any; error?: string };

export const ASSISTANT_TOOLS = [
  {
    name: 'list_files',
    description: 'List directory entries for the project. Use path "" for project root.',
    inputSchema: { type: 'object' as const, properties: { path: { type: 'string' } }, required: [] as string[] },
  },
  {
    name: 'read_file',
    description: 'Read a text file from the project.',
    inputSchema: { type: 'object' as const, properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'write_file',
    description: 'Write full content to a text file (creates file if missing).',
    inputSchema: { type: 'object' as const, properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  },
];

export async function listFiles(projectId: string, relPath = ''): Promise<AssistantToolResult> {
  const projectPath = await getProjectPath(projectId);
  if (!projectPath) return { ok: false, error: 'Project not found' };

  let targetPath: string;
  try {
    targetPath = validatePath(projectPath, relPath, projectId);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  try {
    const entries = await readdir(targetPath, { withFileTypes: true });
    const result: Array<{ name: string; path: string; type: 'file' | 'dir'; size?: number; extension?: string; mimeHint?: string }> = [];

    for (const entry of entries) {
      if (IGNORE_NAMES.has(entry.name)) continue;
      if (entry.name.startsWith('.') && !isVisibleDotfile(entry.name)) continue;

      const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        result.push({ name: entry.name, path: entryRelPath, type: 'dir' });
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        try {
          const st = await stat(join(targetPath, entry.name));
          result.push({
            name: entry.name,
            path: entryRelPath,
            type: 'file',
            size: st.size,
            extension: ext || undefined,
            mimeHint: getMimeHint(ext, entry.name),
          });
        } catch {
          // Skip files we can't stat
        }
      }
    }

    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return { ok: true, data: { entries: result } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function readFileContent(projectId: string, relPath: string): Promise<AssistantToolResult> {
  const projectPath = await getProjectPath(projectId);
  if (!projectPath) return { ok: false, error: 'Project not found' };
  if (!relPath) return { ok: false, error: 'path is required' };

  let targetPath: string;
  try {
    targetPath = validatePath(projectPath, relPath, projectId);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  try {
    const st = await stat(targetPath);
    if (!st.isFile()) return { ok: false, error: 'Not a file' };
    if (st.size > MAX_FILE_SIZE) return { ok: false, error: 'File too large (max 2MB)' };

    const ext = extname(targetPath).toLowerCase();
    const name = targetPath.split(/[/\\]/).pop() || '';
    const mimeHint = getMimeHint(ext, name);

    if (mimeHint === 'application/octet-stream' || IMAGE_TYPES[ext]) {
      return { ok: false, error: 'Binary files are not supported' };
    }

    const content = await readFile(targetPath, 'utf8');
    return { ok: true, data: { content, size: st.size, mimeHint } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function writeFileContent(projectId: string, relPath: string, content: string): Promise<AssistantToolResult> {
  const projectPath = await getProjectPath(projectId);
  if (!projectPath) return { ok: false, error: 'Project not found' };
  if (!relPath) return { ok: false, error: 'path is required' };
  if (typeof content !== 'string') return { ok: false, error: 'content must be a string' };

  let targetPath: string;
  try {
    targetPath = validatePath(projectPath, relPath, projectId);
  } catch (err: any) {
    return { ok: false, error: err.message };
  }

  const ext = extname(targetPath).toLowerCase();
  const name = targetPath.split(/[/\\]/).pop() || '';
  const mimeHint = getMimeHint(ext, name);

  if (mimeHint === 'application/octet-stream' || IMAGE_TYPES[ext]) {
    return { ok: false, error: 'Cannot write binary files' };
  }

  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE) {
    return { ok: false, error: 'Content too large (max 2MB)' };
  }

  try {
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
    const newStat = await stat(targetPath);
    return { ok: true, data: { success: true, size: newStat.size } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function runAssistantTool(name: string, args: Record<string, any>, projectId: string): Promise<AssistantToolResult> {
  switch (name) {
    case 'list_files':
      return listFiles(projectId, args.path || '');
    case 'read_file':
      return readFileContent(projectId, args.path);
    case 'write_file':
      return writeFileContent(projectId, args.path, args.content);
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
