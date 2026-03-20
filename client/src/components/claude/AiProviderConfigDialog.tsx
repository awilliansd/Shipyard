// client/src/components/claude/AiProviderConfigDialog.tsx

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAiProviders, useSaveProviderConfig, useTestProviderConfig, useDeleteProviderConfig } from '@/hooks/useAiProvider'
import { Loader2, Trash2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AiProviderConfigDialogProps {
  providerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiProviderConfigDialog({
  providerId,
  open,
  onOpenChange,
}: AiProviderConfigDialogProps) {
  const { data: providers } = useAiProviders()
  const provider = providers?.find(p => p.id === providerId)
  const saveConfig = useSaveProviderConfig()
  const testConfig = useTestProviderConfig()
  const deleteConfig = useDeleteProviderConfig()

  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [maxTokens, setMaxTokens] = useState('4096')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (provider && open) {
      setApiKey(provider.config?.apiKey || '')
      setModel(provider.config?.model || '')
      setBaseUrl(provider.config?.baseUrl || '')
      setMaxTokens(provider.config?.maxTokens?.toString() || '4096')
    }
  }, [provider, open])

  if (!provider) return null

  const isOllama = providerId === 'ollama'
  const requiresApiKey = !isOllama

  const handleTest = async () => {
    if (requiresApiKey && !apiKey.trim()) {
      toast.error('API key is required')
      return
    }

    if (isOllama && !baseUrl.trim()) {
      toast.error('Ollama URL is required')
      return
    }

    setTesting(true)
    try {
      const config = {
        ...(requiresApiKey && { apiKey }),
        ...(isOllama && { baseUrl }),
        model: model || undefined,
        maxTokens: parseInt(maxTokens) || 4096,
      }

      const result = await testConfig.mutateAsync({
        providerId,
        config,
      })

      if (result.ok) {
        toast.success(`${provider.name} configuration is valid!`)
      } else {
        toast.error(`Configuration error: ${result.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (requiresApiKey && !apiKey.trim()) {
      toast.error('API key is required')
      return
    }

    if (isOllama && !baseUrl.trim()) {
      toast.error('Ollama URL is required')
      return
    }

    setSaving(true)
    try {
      const config = {
        ...(requiresApiKey && { apiKey }),
        ...(isOllama && { baseUrl }),
        model: model || undefined,
        maxTokens: parseInt(maxTokens) || 4096,
      }

      await saveConfig.mutateAsync({
        providerId,
        config,
      })

      toast.success(`${provider.name} configuration saved!`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete ${provider.name} configuration?`)) return

    try {
      await deleteConfig.mutateAsync(providerId)
      toast.success(`${provider.name} configuration deleted`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    }
  }

  const modelOptions = isOllama ? [] : provider.models || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{provider.name} Configuration</DialogTitle>
          <DialogDescription>
            {isOllama
              ? 'Configure the local Ollama server and model to use.'
              : `Enter your ${provider.name} API key and select a model.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Key / Base URL */}
          {requiresApiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key {provider.configured && <span className="text-xs text-muted-foreground">(leave empty to keep existing)</span>}</label>
              <Input
                type="password"
                placeholder={provider.configured ? 'Leave empty to keep existing' : 'Enter API key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {providerId === 'openai' && (
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer" className="underline">OpenAI Platform</a>
                </p>
              )}
              {providerId === 'gemini' && (
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline">Google AI Studio</a>
                </p>
              )}
            </div>
          )}

          {isOllama && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ollama URL</label>
              <Input
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default is http://localhost:11434. Make sure Ollama is running before configuring.
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            {modelOptions.length > 0 ? (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={isOllama ? 'e.g., mistral, llama2, neural-chat' : 'Select model'}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            )}
            {isOllama && (
              <p className="text-xs text-muted-foreground">
                Enter any model installed in Ollama (e.g., mistral, llama2:13b, neural-chat)
              </p>
            )}
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Tokens</label>
            <Input
              type="number"
              min="100"
              max="32000"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-900 dark:text-blue-100 flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              {requiresApiKey && 'Your API key will be encrypted and stored locally.'}
              {isOllama && 'Ollama runs locally - no API key needed, only the server URL.'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-between pt-4">
          <div>
            {provider.configured && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !model}
              className="gap-1"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Test
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (requiresApiKey && !apiKey.trim())}
              className="gap-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
