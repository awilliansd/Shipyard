import { useEffect, useState } from 'react'
import { Loader2, Wand2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTerminalStatus } from '@/hooks/useTerminal'
import { useActiveProvider, useAiProviders } from '@/hooks/useAiProvider'
import { useLaunchTerminal } from '@/hooks/useProjects'
import { type Task } from '@/hooks/useTasks'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface TaskManagerDialogProps {
  projectId: string
  tasks: Task[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskManagerDialog({ projectId, tasks, open, onOpenChange }: TaskManagerDialogProps) {
  const { data: terminalStatus } = useTerminalStatus()
  const { data: providers } = useAiProviders()
  const activeProvider = useActiveProvider()
  const launchTerminal = useLaunchTerminal()
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [providerId, setProviderId] = useState<string | undefined>(activeProvider?.id)

  const hasIntegrated = terminalStatus?.available ?? false
  const aiCliCommand = (() => {
    try { return localStorage.getItem('shipyard:ai-cli-command') || '' } catch { return '' }
  })()
  const aiCliEnabled = (() => {
    try { return localStorage.getItem('shipyard:ai-cli-enabled') === 'true' } catch { return false }
  })()

  useEffect(() => {
    if (!providerId && activeProvider?.id) {
      setProviderId(activeProvider.id)
    }
  }, [providerId, activeProvider?.id])

  const handleRunInCli = async () => {
    if (!rawText.trim()) return
    setLoading(true)
    try {
      const { prompt } = await api.getAiManagePrompt(projectId, rawText)
      navigator.clipboard.writeText(prompt)
      if (aiCliEnabled && aiCliCommand) {
        if (hasIntegrated) {
          window.dispatchEvent(new CustomEvent('shipyard:open-terminal', {
            detail: { projectId, type: 'ai-cli', command: aiCliCommand }
          }))
        } else {
          launchTerminal.mutate({ projectId, type: 'ai-cli', command: aiCliCommand })
        }
        toast.success('AI Task Manager opened in CLI — prompt copied to clipboard')
      } else if (hasIntegrated) {
        window.dispatchEvent(new CustomEvent('shipyard:open-terminal', {
          detail: { projectId, type: 'ai-manage', prompt }
        }))
        toast.success('AI Task Manager started in terminal')
      } else {
        toast.error('Integrated terminal required for CLI mode')
      }
      setRawText('')
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to start AI Task Manager')
    } finally {
      setLoading(false)
    }
  }

  const handleRunInApp = async () => {
    if (!rawText.trim()) return
    if (!providerId) {
      toast.error('Select an AI provider first')
      return
    }
    setLoading(true)
    try {
      const existing = tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
      }))
      const result = await api.aiManageTasks(projectId, rawText, existing, providerId)
      let created = 0
      let updated = 0
      let skipped = 0

      for (const action of result.actions || []) {
        if (action.type === 'create' && action.task) {
          await api.createTask(projectId, action.task)
          created++
        } else if ((action.type === 'update' || action.type === 'update_task') && action.taskId && action.changes) {
          await api.updateTask(projectId, action.taskId, action.changes)
          updated++
        } else {
          skipped++
        }
      }

      toast.success(`AI Task Manager: ${created} created, ${updated} updated, ${skipped} skipped`)
      setRawText('')
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'AI Task Manager failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setRawText('')
      setLoading(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Task Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1">
          <p className="text-xs text-muted-foreground">
            Paste any text — task lists, meeting notes, client emails, bug reports — and AI will organize them into tasks.
            It can also update existing tasks, detect duplicates, and handle instructions like "mark all X as done".
          </p>
          <Textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"Paste anything here...\n\nExamples:\n- Fix login page not loading on mobile\n- Add dark mode toggle to settings\n- Mark all auth tasks as done\n- The checkout flow needs validation on the email field (URGENT)"}
            className="min-h-[220px] text-xs font-mono resize-none"
            disabled={loading}
            autoFocus
          />
          {tasks.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              AI will compare against {tasks.length} existing task{tasks.length !== 1 ? 's' : ''} to avoid duplicates
            </p>
          )}
          <div className="flex items-center gap-2">
            <select
              value={providerId || ''}
              onChange={e => setProviderId(e.target.value || undefined)}
              className="h-7 text-xs bg-background border rounded px-1.5"
              disabled={loading}
            >
              <option value="">Select provider</option>
              {(providers || []).filter(p => p.configured).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleRunInApp}
              disabled={!rawText.trim() || loading || !providerId}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {loading ? 'Running...' : 'Run with AI'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleRunInCli}
              disabled={!rawText.trim() || loading || (!hasIntegrated && !aiCliEnabled)}
            >
              <Terminal className="h-3.5 w-3.5" />
              Run in CLI
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
