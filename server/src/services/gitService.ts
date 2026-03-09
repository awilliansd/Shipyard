import { simpleGit, SimpleGit, StatusResult, LogResult } from 'simple-git';
import Anthropic from '@anthropic-ai/sdk';

function getGit(projectPath: string): SimpleGit {
  return simpleGit(projectPath, {
    config: ['core.quotepath=false'],
  });
}

export async function getStatus(projectPath: string): Promise<StatusResult> {
  const git = getGit(projectPath);
  return git.status();
}

export async function getDiff(projectPath: string, file?: string): Promise<string> {
  const git = getGit(projectPath);
  if (file) {
    return git.diff([file]);
  }
  return git.diff();
}

export async function getStagedDiff(projectPath: string): Promise<string> {
  const git = getGit(projectPath);
  return git.diff(['--cached']);
}

export async function stageFile(projectPath: string, file: string): Promise<void> {
  const git = getGit(projectPath);
  await git.add(file);
}

export async function stageAll(projectPath: string): Promise<void> {
  const git = getGit(projectPath);
  await git.add('-A');
}

export async function unstageFile(projectPath: string, file: string): Promise<void> {
  const git = getGit(projectPath);
  await git.reset(['HEAD', '--', file]);
}

export async function unstageAll(projectPath: string): Promise<void> {
  const git = getGit(projectPath);
  await git.reset(['HEAD']);
}

export async function commit(projectPath: string, message: string): Promise<string> {
  const git = getGit(projectPath);
  const result = await git.commit(message);
  return result.commit;
}

export async function push(projectPath: string): Promise<void> {
  const git = getGit(projectPath);
  await git.push();
}

export async function pull(projectPath: string): Promise<void> {
  const git = getGit(projectPath);
  await git.pull();
}

export async function getLog(projectPath: string, maxCount = 20): Promise<LogResult> {
  const git = getGit(projectPath);
  return git.log({ maxCount });
}

export async function getBranches(projectPath: string) {
  const git = getGit(projectPath);
  return git.branch();
}

export async function generateCommitMessage(projectPath: string): Promise<string> {
  const diff = await getStagedDiff(projectPath);
  if (!diff.trim()) {
    throw new Error('No staged changes to generate a commit message for');
  }

  const truncated = diff.length > 12000 ? diff.slice(0, 12000) + '\n... (truncated)' : diff;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Generate a concise git commit message for this diff. Use conventional commit style (feat:, fix:, refactor:, etc). One line only, no quotes, no explanation. Write in the language that matches the code comments/context (English by default).\n\n${truncated}`,
    }],
  });

  const text = response.content[0];
  if (text.type !== 'text') throw new Error('Unexpected response');
  return text.text.trim();
}
