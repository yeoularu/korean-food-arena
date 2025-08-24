import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import type { SessionData } from '@/lib/types'

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<SessionData | null> => {
      const response = await authClient.getSession()
      return response.data as SessionData | null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}

export function useSignInAnonymous() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await authClient.signIn.anonymous()
      return response.data
    },
    onSuccess: () => {
      // Invalidate session query to refetch updated session
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useUpdateNationality() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nationality?: string) => {
      const response = await fetch('/api/auth/update-nationality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nationality }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to update nationality')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate session query to refetch updated user data
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}
