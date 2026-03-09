import { formatDistanceToNow } from 'date-fns'
import { GitCommit } from 'lucide-react'
import { useGitLog } from '@/hooks/useGit'

interface GitLogProps {
  projectId: string
}

export function GitLog({ projectId }: GitLogProps) {
  const { data: logData } = useGitLog(projectId)
  const commits = logData?.all || []

  if (commits.length === 0) {
    return <div className="text-xs text-muted-foreground py-4 text-center">No commits yet</div>
  }

  return (
    <div className="space-y-1">
      {commits.slice(0, 20).map((commit: any) => (
        <div key={commit.hash} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors">
          <GitCommit className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">{commit.message}</p>
            <p className="text-[10px] text-muted-foreground">
              {commit.author_name} - {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {commit.hash.substring(0, 7)}
          </span>
        </div>
      ))}
    </div>
  )
}
