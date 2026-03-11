import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMcpStatus() {
  return useQuery({
    queryKey: ['mcp', 'status'],
    queryFn: () => api.getMcpStatus(),
    staleTime: 30000,
  })
}

export function useSaveMcpConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { enabled: boolean; requireAuth?: boolean }) =>
      api.saveMcpConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp', 'status'] })
    },
  })
}

export function useRevokeMcpClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => api.revokeMcpClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp', 'status'] })
    },
  })
}
