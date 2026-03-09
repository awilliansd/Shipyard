import { Terminal, Play, Monitor, Code2, FolderOpen, Copy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLaunchTerminal, useLaunchVSCode, useOpenFolder } from '@/hooks/useProjects'
import { useTasks, type Task } from '@/hooks/useTasks'
import { toast } from 'sonner'

interface TerminalLauncherProps {
  projectId: string
  projectPath?: string
  projectName?: string
}

const priorityLabel = { urgent: 'URGENT', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }
const statusLabel = { backlog: 'BACKLOG', todo: 'TODO', in_progress: 'IN_PROGRESS', done: 'DONE' }

function buildClaudeContext(projectName: string, projectPath: string, projectId: string, tasks: Task[]) {
  const dataPath = 'C:\\Code\\devdash\\data\\tasks'
  const tasksFile = `${dataPath}\\${projectId}.json`

  const lines = [
    `Project: ${projectName}`,
    `Project path: ${projectPath}`,
    `DevDash tasks file: ${tasksFile}`,
    '',
  ]

  const active = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')

  if (active.length > 0) {
    lines.push(`Active tasks (${active.length}):`)
    for (const t of active) {
      lines.push(`- [${statusLabel[t.status]}] ${t.title} (${priorityLabel[t.priority]})${t.description ? ` — ${t.description}` : ''}`)
    }
  }

  if (done.length > 0) {
    lines.push('')
    lines.push(`Done (${done.length}):`)
    for (const t of done.slice(0, 5)) {
      lines.push(`- [DONE] ${t.title}`)
    }
    if (done.length > 5) lines.push(`  ... and ${done.length - 5} more`)
  }

  lines.push('')
  lines.push('You can read and update the tasks JSON file directly to organize, add, or update tasks.')

  return lines.join('\n')
}

export function TerminalLauncher({ projectId, projectPath, projectName }: TerminalLauncherProps) {
  const launchTerminal = useLaunchTerminal()
  const launchVSCode = useLaunchVSCode()
  const openFolder = useOpenFolder()
  const { data: tasks } = useTasks(projectId)

  const handleCopyContext = () => {
    if (!projectPath || !projectName) return
    const context = buildClaudeContext(projectName, projectPath, projectId, tasks || [])
    navigator.clipboard.writeText(context)
    toast.success('Context copied — paste in Claude')
  }

  const handleLaunchClaudeWithContext = () => {
    // Copy context first, then launch Claude
    if (projectPath && projectName) {
      const context = buildClaudeContext(projectName, projectPath, projectId, tasks || [])
      navigator.clipboard.writeText(context)
    }
    launchTerminal.mutate(
      { projectId, type: 'claude' },
      { onSuccess: () => toast.success('Claude opened — context is in your clipboard, just paste') }
    )
  }

  return (
    <div className="space-y-5">
      {/* Claude Context */}
      {projectPath && projectName && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Claude</h2>
          <div className="space-y-1">
            <Button
              variant="default"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={handleLaunchClaudeWithContext}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Open Claude + Copy Context
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={handleCopyContext}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Tasks Context
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 px-1">
            Copies project path, tasks file location, and current tasks to clipboard.
          </p>
        </div>
      )}

      {/* Quick Launch */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Launch</h2>
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={() => launchTerminal.mutate(
              { projectId, type: 'claude' },
              { onSuccess: () => toast.success('Launched Claude Code') }
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            Claude Code
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={() => launchTerminal.mutate(
              { projectId, type: 'dev' },
              { onSuccess: () => toast.success('Launched Dev Server') }
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Dev Server
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={() => launchTerminal.mutate(
              { projectId, type: 'shell' },
              { onSuccess: () => toast.success('Launched Shell') }
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            Shell
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={() => launchVSCode.mutate(projectId, {
              onSuccess: () => toast.success('Opened VS Code'),
            })}
          >
            <Code2 className="h-3.5 w-3.5" />
            VS Code
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={() => openFolder.mutate(projectId, {
              onSuccess: () => toast.success('Opened folder'),
            })}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Folder
          </Button>
        </div>
      </div>
    </div>
  )
}
