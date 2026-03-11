import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { getProjects } from './projectDiscovery.js';
import * as taskStore from './taskStore.js';
import * as gitService from './gitService.js';

export async function buildProjectContext(projectId: string): Promise<string> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return 'Project not found.';

  const parts: string[] = [];

  // Project info
  parts.push(`Project: ${project.name}`);
  parts.push(`Path: ${project.path}`);
  if (project.techStack.length > 0) {
    parts.push(`Tech Stack: ${project.techStack.join(', ')}`);
  }

  // Git info
  if (project.isGitRepo) {
    parts.push(`Git Branch: ${project.gitBranch || 'unknown'}`);
    try {
      const status = await gitService.getStatus(project.path);
      if (status) {
        const staged = status.staged?.length || 0;
        const modified = status.modified?.length || 0;
        const untracked = status.not_added?.length || 0;
        parts.push(`Git Status: ${staged} staged, ${modified} modified, ${untracked} untracked`);
      }
    } catch {}
  }

  // Tasks
  const tasks = await taskStore.getTasks(projectId);
  if (tasks.length > 0) {
    parts.push('\nCurrent Tasks:');
    const grouped = {
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      todo: tasks.filter(t => t.status === 'todo' || t.status === 'backlog'),
      done: tasks.filter(t => t.status === 'done').slice(-5),
    };

    if (grouped.in_progress.length > 0) {
      parts.push('  In Progress:');
      for (const t of grouped.in_progress) {
        parts.push(`    - [${t.priority}] ${t.title}`);
        if (t.description) parts.push(`      ${t.description.slice(0, 200)}`);
      }
    }
    if (grouped.todo.length > 0) {
      parts.push('  Inbox:');
      for (const t of grouped.todo.slice(0, 10)) {
        parts.push(`    - [${t.priority}] ${t.title}`);
      }
    }
    if (grouped.done.length > 0) {
      parts.push('  Recently Done:');
      for (const t of grouped.done) {
        parts.push(`    - ${t.title}`);
      }
    }
  }

  // File structure (top-level only, limit to avoid flooding)
  try {
    const entries = await readdir(project.path, { withFileTypes: true });
    const files = entries.slice(0, 30).map(e => (e.isDirectory() ? `${e.name}/` : e.name));
    parts.push(`\nProject Files (top-level): ${files.join(', ')}`);
  } catch {}

  return parts.join('\n');
}

export async function buildTaskContext(projectId: string, taskId: string): Promise<string> {
  const projectContext = await buildProjectContext(projectId);
  const task = await taskStore.getTask(projectId, taskId);

  if (!task) return projectContext;

  return `${projectContext}\n\nFocused Task:\n  Title: ${task.title}\n  Status: ${task.status}\n  Priority: ${task.priority}\n  Description: ${task.description || 'None'}\n  Technical Details: ${task.prompt || 'None'}`;
}
