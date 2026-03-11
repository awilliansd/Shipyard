import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClaudeStatus } from '@/hooks/useClaude'
import { ClaudeConfigDialog } from './ClaudeConfigDialog'
import { Sparkles, Settings, Check } from 'lucide-react'

export function ClaudeSettingsCard() {
  const { data: status } = useClaudeStatus()
  const [configOpen, setConfigOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Claude AI
          {status?.configured && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Anthropic API key to enable AI-powered features: chat assistant, task analysis, and task summarization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status?.configured ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">API Key configured</p>
                <p className="text-xs text-muted-foreground">Model: {status.model || 'Default'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Configure
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Available features:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Chat panel in workspace sidebar</li>
                <li>"AI Analyze" button in task editor</li>
                <li>Project-aware context in all interactions</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">No API key configured</p>
            <Button onClick={() => setConfigOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Setup Claude AI
            </Button>
            <p className="text-xs text-muted-foreground">
              Requires an Anthropic API key. Pay-per-use billing.
            </p>
          </div>
        )}
      </CardContent>
      <ClaudeConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </Card>
  )
}
