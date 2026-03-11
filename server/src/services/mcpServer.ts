import { getProjects } from './projectDiscovery.js';
import * as taskStore from './taskStore.js';
import * as gitService from './gitService.js';
import type { Project, Task } from '../types/index.js';

// MCP Tool handlers - these are called by the MCP route handler
// Each returns a JSON-RPC compatible result

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

// ── Tool Implementations ────────────────────────────────

export async function listProjects(): Promise<McpToolResult> {
  const projects = await getProjects();
  const summary = projects.map(p => ({
    id: p.id,
    name: p.name,
    path: p.path,
    category: p.category,
    techStack: p.techStack,
    gitBranch: p.gitBranch,
    gitDirty: p.gitDirty,
    favorite: p.favorite,
  }));
  return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
}

export async function getProject(projectId: string): Promise<McpToolResult> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    return { content: [{ type: 'text', text: `Project "${projectId}" not found` }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] };
}

export async function listTasks(projectId: string, status?: string): Promise<McpToolResult> {
  const tasks = await taskStore.getTasks(projectId);
  const filtered = status ? tasks.filter(t => t.status === status) : tasks;
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}

export async function getAllTasks(status?: string): Promise<McpToolResult> {
  const tasks = await taskStore.getAllTasks();
  const filtered = status ? tasks.filter(t => t.status === status) : tasks;
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}

export async function getTask(projectId: string, taskId: string): Promise<McpToolResult> {
  const task = await taskStore.getTask(projectId, taskId);
  if (!task) {
    return { content: [{ type: 'text', text: `Task "${taskId}" not found` }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
}

export async function createTask(projectId: string, data: {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  prompt?: string;
}): Promise<McpToolResult> {
  const task = await taskStore.createTask(projectId, {
    title: data.title,
    description: data.description || '',
    priority: (data.priority as Task['priority']) || 'medium',
    status: (data.status as Task['status']) || 'todo',
    prompt: data.prompt,
  });
  return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
}

export async function updateTask(projectId: string, taskId: string, data: {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  prompt?: string;
}): Promise<McpToolResult> {
  const updates: any = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.status !== undefined) updates.status = data.status;
  if (data.prompt !== undefined) updates.prompt = data.prompt;

  const task = await taskStore.updateTask(projectId, taskId, updates);
  if (!task) {
    return { content: [{ type: 'text', text: `Task "${taskId}" not found` }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] };
}

export async function deleteTask(projectId: string, taskId: string): Promise<McpToolResult> {
  const ok = await taskStore.deleteTask(projectId, taskId);
  if (!ok) {
    return { content: [{ type: 'text', text: `Task "${taskId}" not found` }], isError: true };
  }
  return { content: [{ type: 'text', text: `Task "${taskId}" deleted successfully` }] };
}

export async function getGitStatus(projectId: string): Promise<McpToolResult> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.isGitRepo) {
    return { content: [{ type: 'text', text: 'Not a git repository' }], isError: true };
  }
  try {
    const status = await gitService.getStatus(project.path);
    return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
  } catch (err: any) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
}

export async function getGitLog(projectId: string): Promise<McpToolResult> {
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project || !project.isGitRepo) {
    return { content: [{ type: 'text', text: 'Not a git repository' }], isError: true };
  }
  try {
    const log = await gitService.getLog(project.path);
    return { content: [{ type: 'text', text: JSON.stringify(log, null, 2) }] };
  } catch (err: any) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
}

export async function searchTasks(query: string): Promise<McpToolResult> {
  const all = await taskStore.getAllTasks();
  const q = query.toLowerCase();
  const matched = all.filter(t =>
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    (t.prompt && t.prompt.toLowerCase().includes(q))
  );
  return { content: [{ type: 'text', text: JSON.stringify(matched, null, 2) }] };
}

// ── Tool Registry (for MCP protocol) ────────────────────

export const MCP_TOOLS = [
  {
    name: 'list_projects',
    description: 'List all projects in Shipyard with git info and tech stack',
    inputSchema: { type: 'object' as const, properties: {}, required: [] as string[] },
  },
  {
    name: 'get_project',
    description: 'Get detailed info about a specific project',
    inputSchema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string', description: 'The project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks for a specific project, optionally filtered by status',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        status: { type: 'string', description: 'Filter by status: backlog, todo, in_progress, done', enum: ['backlog', 'todo', 'in_progress', 'done'] },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_all_tasks',
    description: 'List all tasks across all projects, optionally filtered by status',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status', enum: ['backlog', 'todo', 'in_progress', 'done'] },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_task',
    description: 'Get full details of a specific task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['projectId', 'taskId'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in a project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'User-facing description of what needs to be done' },
        priority: { type: 'string', description: 'Priority level', enum: ['urgent', 'high', 'medium', 'low'] },
        status: { type: 'string', description: 'Initial status', enum: ['backlog', 'todo', 'in_progress', 'done'] },
        prompt: { type: 'string', description: 'Technical details, implementation notes, relevant files' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        taskId: { type: 'string', description: 'The task ID' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        status: { type: 'string', enum: ['backlog', 'todo', 'in_progress', 'done'] },
        prompt: { type: 'string' },
      },
      required: ['projectId', 'taskId'],
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'The project ID' },
        taskId: { type: 'string', description: 'The task ID' },
      },
      required: ['projectId', 'taskId'],
    },
  },
  {
    name: 'get_git_status',
    description: 'Get git status for a project (read-only)',
    inputSchema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string', description: 'The project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_git_log',
    description: 'Get recent git commits for a project (read-only)',
    inputSchema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string', description: 'The project ID' } },
      required: ['projectId'],
    },
  },
  {
    name: 'search_tasks',
    description: 'Search tasks across all projects by keyword',
    inputSchema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  },
];

// ── Tool Dispatcher ─────────────────────────────────────

export async function handleToolCall(name: string, args: Record<string, any>): Promise<McpToolResult> {
  switch (name) {
    case 'list_projects':
      return listProjects();
    case 'get_project':
      return getProject(args.projectId);
    case 'list_tasks':
      return listTasks(args.projectId, args.status);
    case 'get_all_tasks':
      return getAllTasks(args.status);
    case 'get_task':
      return getTask(args.projectId, args.taskId);
    case 'create_task':
      return createTask(args.projectId, { title: args.title, description: args.description, priority: args.priority, status: args.status, prompt: args.prompt });
    case 'update_task':
      return updateTask(args.projectId, args.taskId, args);
    case 'delete_task':
      return deleteTask(args.projectId, args.taskId);
    case 'get_git_status':
      return getGitStatus(args.projectId);
    case 'get_git_log':
      return getGitLog(args.projectId);
    case 'search_tasks':
      return searchTasks(args.query);
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}
