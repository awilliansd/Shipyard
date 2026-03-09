import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGitCommit, useGitPush, useGenerateCommitMessage } from '@/hooks/useGit'
import { toast } from 'sonner'

interface CommitFormProps {
  projectId: string
  hasStagedChanges: boolean
}

export function CommitForm({ projectId, hasStagedChanges }: CommitFormProps) {
  const [message, setMessage] = useState('')
  const gitCommit = useGitCommit()
  const gitPush = useGitPush()
  const generateMsg = useGenerateCommitMessage()

  const handleGenerate = () => {
    generateMsg.mutate(projectId, {
      onSuccess: (data) => setMessage(data.message),
      onError: (err) => toast.error(`AI: ${err.message}`),
    })
  }

  const handleCommit = () => {
    if (!message.trim()) return
    gitCommit.mutate(
      { projectId, message },
      {
        onSuccess: () => {
          toast.success('Committed successfully')
          setMessage('')
        },
        onError: (err) => toast.error(`Commit failed: ${err.message}`),
      }
    )
  }

  const handleCommitAndPush = () => {
    if (!message.trim()) return
    gitCommit.mutate(
      { projectId, message },
      {
        onSuccess: () => {
          setMessage('')
          gitPush.mutate(projectId, {
            onSuccess: () => toast.success('Committed and pushed'),
            onError: (err) => toast.error(`Push failed: ${err.message}`),
          })
        },
        onError: (err) => toast.error(`Commit failed: ${err.message}`),
      }
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Commit message..."
          className="text-sm"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCommit()}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!hasStagedChanges || generateMsg.isPending}
          onClick={handleGenerate}
          title="Generate commit message with AI"
        >
          {generateMsg.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          disabled={!message.trim() || !hasStagedChanges || gitCommit.isPending}
          onClick={handleCommit}
        >
          Commit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          disabled={!message.trim() || !hasStagedChanges || gitCommit.isPending}
          onClick={handleCommitAndPush}
        >
          Commit & Push
        </Button>
      </div>
    </div>
  )
}
