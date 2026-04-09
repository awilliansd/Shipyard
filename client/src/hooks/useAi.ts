import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => api.getAiStatus(),
    staleTime: 30000,
  })
}

export function useSaveAiApiConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { apiKey: string; model?: string; maxTokens?: number }) =>
      api.saveAiApiConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'status'] })
    },
  })
}

export function useDeleteAiApiConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.deleteAiApiConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'status'] })
    },
  })
}

export function useTestAiApiKey() {
  return useMutation({
    mutationFn: (apiKey: string) => api.testAiApiKey(apiKey),
  })
}

export function useAnalyzeTask() {
  return useMutation({
    mutationFn: ({ projectId, title, taskId }: { projectId: string; title: string; taskId?: string }) =>
      api.analyzeTask(projectId, title, taskId),
  })
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function streamAiChat(
  projectId: string | undefined,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
) {
  try {
    const res = await fetch('/api/claude/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, messages }),
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

    onDone()
  } catch (err: any) {
    onError(err.message || 'Connection failed')
  }
}
