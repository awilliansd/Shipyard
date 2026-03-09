import { useState } from 'react'
import { Plus, Minus, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStageFile, useUnstageFile, useGitDiff } from '@/hooks/useGit'

interface FileChangeProps {
  projectId: string
  file: string
  status: string
  staged: boolean
}

export function FileChange({ projectId, file, status, staged }: FileChangeProps) {
  const [showDiff, setShowDiff] = useState(false)
  const stageFile = useStageFile()
  const unstageFile = useUnstageFile()
  const { data: diffData } = useGitDiff(showDiff ? projectId : undefined, file)

  const statusColors: Record<string, string> = {
    M: 'text-yellow-500',
    A: 'text-green-500',
    D: 'text-red-500',
    '?': 'text-muted-foreground',
  }

  const statusLabel = status === '?' ? 'U' : status

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors">
        <button onClick={() => setShowDiff(!showDiff)} className="shrink-0">
          {showDiff ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs flex-1 truncate font-mono">{file}</span>
        <span className={cn('text-xs font-bold shrink-0', statusColors[status] || 'text-muted-foreground')}>
          {statusLabel}
        </span>
        {staged ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => unstageFile.mutate({ projectId, file })}
            title="Unstage"
          >
            <Minus className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => stageFile.mutate({ projectId, file })}
            title="Stage"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {showDiff && diffData?.diff && (
        <pre className="text-[11px] leading-relaxed p-3 bg-muted/50 overflow-x-auto border-t max-h-64 overflow-y-auto">
          {diffData.diff.split('\n').map((line, i) => (
            <div
              key={i}
              className={cn(
                line.startsWith('+') && !line.startsWith('+++') && 'text-green-400 bg-green-500/10',
                line.startsWith('-') && !line.startsWith('---') && 'text-red-400 bg-red-500/10',
                line.startsWith('@@') && 'text-blue-400'
              )}
            >
              {line}
            </div>
          ))}
        </pre>
      )}
    </div>
  )
}
