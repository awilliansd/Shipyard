import { GripVertical, Pencil, Trash2, Copy, Check, Circle, Clock, AlertTriangle, ArrowUp, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUpdateTask, useDeleteTask, type Task } from '@/hooks/useTasks'
import { toast } from 'sonner'

interface TaskItemProps {
  task: Task
  projectName?: string
  onEdit: (task: Task) => void
  dragListeners?: Record<string, Function>
}

const priorityConfig = {
  urgent: { icon: AlertTriangle, color: 'text-red-500', label: 'Urgent' },
  high: { icon: ArrowUp, color: 'text-orange-500', label: 'High' },
  medium: { icon: Minus, color: 'text-blue-500', label: 'Medium' },
  low: { icon: Circle, color: 'text-muted-foreground', label: 'Low' },
}

const statusConfig = {
  backlog: { label: 'Backlog', variant: 'outline' as const },
  todo: { label: 'To Do', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  done: { label: 'Done', variant: 'outline' as const },
}

export function TaskItem({ task, projectName, onEdit, dragListeners }: TaskItemProps) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const PriorityIcon = priority.icon

  const handleStatusToggle = () => {
    const nextStatus = task.status === 'done' ? 'todo' :
                       task.status === 'todo' ? 'in_progress' :
                       task.status === 'in_progress' ? 'done' : 'todo'
    updateTask.mutate({
      projectId: task.projectId,
      taskId: task.id,
      status: nextStatus,
    })
  }

  const handleCopyPrompt = () => {
    const prompt = task.promptTemplate ||
      `Task: ${task.title}\n${task.description ? `\nDescription: ${task.description}` : ''}${projectName ? `\nProject: ${projectName}` : ''}`
    navigator.clipboard.writeText(prompt)
    toast.success('Copied to clipboard')
  }

  const handleDelete = () => {
    deleteTask.mutate({ projectId: task.projectId, taskId: task.id })
  }

  return (
    <div className={cn(
      'group flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors hover:border-primary/30',
      task.status === 'done' && 'opacity-60'
    )}>
      <button className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50" {...dragListeners}>
        <GripVertical className="h-4 w-4" />
      </button>

      <button onClick={handleStatusToggle} className="mt-0.5 shrink-0">
        {task.status === 'done' ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <PriorityIcon className={cn('h-3.5 w-3.5 shrink-0', priority.color)} />
          <span className={cn('text-sm font-medium', task.status === 'done' && 'line-through')}>
            {task.title}
          </span>
          <Badge variant={status.variant} className="text-[10px] px-1.5 py-0 shrink-0">
            {status.label}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="h-3 w-3" />
            Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>
          {task.status === 'in_progress' && task.inProgressAt && (
            <span className="text-[10px] text-yellow-500/80">
              Started {formatDistanceToNow(new Date(task.inProgressAt), { addSuffix: true })}
            </span>
          )}
          {task.status === 'done' && task.doneAt && (
            <span className="text-[10px] text-green-500/80">
              Done {formatDistanceToNow(new Date(task.doneAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyPrompt} title="Copy as prompt">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
