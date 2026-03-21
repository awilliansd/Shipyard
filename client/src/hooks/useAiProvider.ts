// client/src/hooks/useAiProvider.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AiProviderInfo {
  id: string
  name: string
  models: string[]
  configured: boolean
  config: {
    model?: string
    maxTokens?: number
    baseUrl?: string
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// --- Provider Management ---

export function useAiProviders() {
  return useQuery({
    queryKey: ['ai', 'providers'],
    queryFn: () => api.getAiProviders(),
  })
}

export function useActiveProvider() {
  const { data: providers } = useAiProviders()
  // For now, return the first configured provider, or Claude as fallback
  return providers?.find(p => p.configured) || providers?.find(p => p.id === 'claude')
}

export function useSaveProviderConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ providerId, config }: { providerId: string; config: any }) =>
      api.saveAiProviderConfig(providerId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] })
    },
  })
}

export function useDeleteProviderConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (providerId: string) => api.deleteAiProviderConfig(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] })
    },
  })
}

export function useTestProviderConfig() {
  return useMutation({
    mutationFn: ({ providerId, config }: { providerId: string; config: any }) =>
      api.testAiProviderConfig(providerId, config),
  })
}

// --- AI Features ---

export function useAnalyzeTask() {
  const activeProvider = useActiveProvider()
  return useMutation({
    mutationFn: ({ projectId, title, taskId }: { projectId: string; title: string; taskId?: string }) =>
      api.analyzeTask(projectId, title, taskId, activeProvider?.id),
  })
}

export function useBulkOrganizeTasks() {
  const activeProvider = useActiveProvider()
  return useMutation({
    mutationFn: ({ projectId, rawText }: { projectId: string; rawText: string }) =>
      api.bulkOrganizeTasks(projectId, rawText, activeProvider?.id),
  })
}

// SSE streaming chat
export async function streamChat(
  projectId: string | undefined,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  providerId?: string,
) {
  const activeProvider = providerId || 'claude' // fallback to Claude for backward compatibility

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, messages, providerId: activeProvider }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }))
      onError(err.error || 'Request failed')
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError('No response body'); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'text') {
            onChunk(parsed.text)
          } else if (parsed.type === 'done') {
            onDone()
          } else if (parsed.type === 'error') {
            onError(parsed.error)
          }
        } catch {}
      }
    }
  } catch (err: any) {
    onError(err.message || 'Stream failed')
  }
}

// --- Backward Compatibility (deprecated) ---

export function useClaudeStatus() {
  const { data: providers } = useAiProviders()
  const claude = providers?.find(p => p.id === 'claude')
  return {
    data: claude ? {
      configured: claude.configured,
      model: claude.config.model,
      cliAvailable: false, // TODO: implement CLI detection
    } : undefined,
    isLoading: !providers,
  }
}

export function useSaveClaudeConfig() {
  const saveConfig = useSaveProviderConfig()
  return {
    ...saveConfig,
    mutate: (data: { apiKey: string; model?: string; maxTokens?: number }) =>
      saveConfig.mutate({ providerId: 'claude', config: data }),
  }
}

export function useDeleteClaudeConfig() {
  const deleteConfig = useDeleteProviderConfig()
  return {
    ...deleteConfig,
    mutate: () => deleteConfig.mutate('claude'),
  }
}

export function useTestClaudeKey() {
  const testConfig = useTestProviderConfig()
  return {
    ...testConfig,
    mutate: (apiKey: string) =>
      testConfig.mutate({ providerId: 'claude', config: { apiKey } }),
  }
}
