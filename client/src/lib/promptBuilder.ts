import type { Task } from '@/hooks/useTasks'

const priorityLabel: Record<string, string> = { urgent: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }

export function buildInProgressPrompt(
  tasks: Task[],
  projectName: string,
  projectPath: string,
  projectId: string,
  tasksDir: string,
): string | null {
  const inProgress = tasks
    .filter(t => t.status === 'in_progress')
    .sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (po[a.priority] ?? 2) - (po[b.priority] ?? 2)
    })

  if (inProgress.length === 0) return null

  const sep = tasksDir.includes('\\') ? '\\' : '/'
  const tasksFilePath = `${tasksDir}${sep}${projectId}.json`

  const lines: string[] = []

  lines.push(`# In Progress Tasks — ${projectName}`)
  lines.push('')
  lines.push(`Project path: ${projectPath}`)
  lines.push(`Tasks file: ${tasksFilePath}`)
  lines.push('')
  lines.push(`You have ${inProgress.length} task${inProgress.length > 1 ? 's' : ''} to resolve:`)
  lines.push('')

  for (let i = 0; i < inProgress.length; i++) {
    const t = inProgress[i]
    lines.push(`## ${i + 1}. ${t.title} [${priorityLabel[t.priority]}]`)
    if (t.description) {
      lines.push('')
      lines.push(t.description)
    }
    lines.push('')
  }

  lines.push('## Instructions')
  lines.push(`Resolve each task in order of priority listed above.`)
  lines.push('For each task:')
  lines.push('1. Investigate the codebase to understand the context')
  lines.push('2. Plan and implement the solution')
  lines.push('3. Test that your changes work correctly')
  lines.push(`4. Update the tasks file (${tasksFilePath}) to mark the task as done:`)
  lines.push(`   - Set "status": "done"`)
  lines.push(`   - Set "doneAt" and "updatedAt" to the current ISO timestamp`)

  const ids = inProgress.map(t => `"${t.id}"`).join(', ')
  lines.push('')
  lines.push(`Task IDs to update: ${ids}`)

  return lines.join('\n')
}

export function buildTaskPrompt(
  task: Task,
  projectName: string | undefined,
  projectPath: string | undefined,
  tasksDir: string | undefined,
): string {
  if (task.promptTemplate) return task.promptTemplate

  const sep = tasksDir?.includes('\\') ? '\\' : '/'
  const tasksFilePath = tasksDir ? `${tasksDir}${sep}${task.projectId}.json` : null

  const lines: string[] = []

  // Task instruction
  lines.push(`# Task: ${task.title}`)
  lines.push('')
  if (task.description) {
    lines.push(task.description)
    lines.push('')
  }
  lines.push(`Priority: ${priorityLabel[task.priority]}`)
  if (projectName) lines.push(`Project: ${projectName}`)
  if (projectPath) lines.push(`Project path: ${projectPath}`)
  lines.push('')

  // AI instructions
  lines.push('## Instructions')
  lines.push('1. Investigate the codebase to understand the context of this task')
  lines.push('2. Plan and implement the solution')
  lines.push('3. Test that your changes work correctly')

  // DevDash task update instructions
  if (tasksFilePath) {
    lines.push(`4. After completing the task, update the DevDash tasks file to mark this task as done:`)
    lines.push(`   - File: ${tasksFilePath}`)
    lines.push(`   - Find the task with id "${task.id}" and set:`)
    lines.push(`     - "status": "done"`)
    lines.push(`     - "doneAt": "<current ISO timestamp>"`)
    lines.push(`     - "updatedAt": "<current ISO timestamp>"`)
  }

  return lines.join('\n')
}
