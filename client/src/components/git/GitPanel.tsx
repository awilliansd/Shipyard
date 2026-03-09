import { useState } from 'react'
import { GitBranch, RefreshCw, Upload, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileChange } from './FileChange'
import { CommitForm } from './CommitForm'
import { GitLog } from './GitLog'
import { useGitStatus, useStageAll, useUnstageAll, useGitPush, useGitPull } from '@/hooks/useGit'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GitPanelProps {
  projectId: string
}

export function GitPanel({ projectId }: GitPanelProps) {
  const { data: status, isLoading, refetch } = useGitStatus(projectId)
  const stageAll = useStageAll()
  const unstageAll = useUnstageAll()
  const gitPush = useGitPush()
  const gitPull = useGitPull()
  const [stagedOpen, setStagedOpen] = useState(false)
  const [unstagedOpen, setUnstagedOpen] = useState(true)

  if (isLoading || !status) {
    return <div className="text-sm text-muted-foreground p-4">Loading git status...</div>
  }

  const staged = status.staged || []
  const modified = status.modified || []
  const notAdded = status.not_added || []
  const deleted = status.deleted || []
  const created = status.created || []

  // Build file lists
  const stagedFiles = [
    ...staged.map((f: string) => ({ file: f, status: 'M' })),
  ]

  const unstagedFiles = [
    ...modified.filter((f: string) => !staged.includes(f)).map((f: string) => ({ file: f, status: 'M' })),
    ...deleted.filter((f: string) => !staged.includes(f)).map((f: string) => ({ file: f, status: 'D' })),
    ...notAdded.map((f: string) => ({ file: f, status: '?' })),
    ...created.filter((f: string) => !staged.includes(f)).map((f: string) => ({ file: f, status: 'A' })),
  ]

  const hasStagedChanges = stagedFiles.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Git</h2>
          {status.current && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <GitBranch className="h-3 w-3" />
              {status.current}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => gitPull.mutate(projectId, {
              onSuccess: () => toast.success('Pulled'),
              onError: (err) => toast.error(`Pull failed: ${err.message}`),
            })}
            title="Pull"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => gitPush.mutate(projectId, {
              onSuccess: () => toast.success('Pushed'),
              onError: (err) => toast.error(`Push failed: ${err.message}`),
            })}
            title="Push"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="changes">
        <TabsList className="w-full">
          <TabsTrigger value="changes" className="flex-1 text-xs">
            Changes ({stagedFiles.length + unstagedFiles.length})
          </TabsTrigger>
          <TabsTrigger value="log" className="flex-1 text-xs">
            Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-3">
          {/* Staged section */}
          {stagedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1 text-xs font-medium text-green-500 hover:text-green-400 transition-colors"
                  onClick={() => setStagedOpen(!stagedOpen)}
                >
                  {stagedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Staged ({stagedFiles.length})
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => unstageAll.mutate(projectId)}
                >
                  Unstage All
                </Button>
              </div>
              {stagedOpen && (
                <div className="space-y-1">
                  {stagedFiles.map(({ file, status: s }) => (
                    <FileChange key={`staged-${file}`} projectId={projectId} file={file} status={s} staged />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unstaged section */}
          {unstagedFiles.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setUnstagedOpen(!unstagedOpen)}
                >
                  {unstagedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  Changes ({unstagedFiles.length})
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => stageAll.mutate(projectId)}
                >
                  Stage All
                </Button>
              </div>
              {unstagedOpen && (
                <div className="space-y-1">
                  {unstagedFiles.map(({ file, status: s }) => (
                    <FileChange key={`unstaged-${file}`} projectId={projectId} file={file} status={s} staged={false} />
                  ))}
                </div>
              )}
            </div>
          )}

          {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              Working tree clean
            </div>
          )}

          <CommitForm projectId={projectId} hasStagedChanges={hasStagedChanges} />
        </TabsContent>

        <TabsContent value="log">
          <GitLog projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
