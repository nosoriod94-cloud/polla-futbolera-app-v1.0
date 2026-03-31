import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { ParticipantStatus } from '@/lib/database.types'

export function useParticipants(pollaId: string | undefined) {
  return useQuery({
    queryKey: ['participants', pollaId],
    enabled: !!pollaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polla_participants')
        .select('*, profiles(nombre_completo)')
        .eq('polla_id', pollaId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useMyParticipant(pollaId: string | undefined) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['my_participant', pollaId, user?.id],
    enabled: !!pollaId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polla_participants')
        .select('*')
        .eq('polla_id', pollaId!)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useJoinPolla() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ pollaId, apodo }: { pollaId: string; apodo: string }) => {
      const { data, error } = await supabase
        .from('polla_participants')
        .insert({ polla_id: pollaId, user_id: user!.id, apodo, status: 'pending' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['participants', pollaId] })
      qc.invalidateQueries({ queryKey: ['my_participant', pollaId, user?.id] })
    },
  })
}

export function useUpdateParticipantStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      participantId,
      pollaId,
      status,
    }: {
      participantId: string
      pollaId: string
      status: ParticipantStatus
    }) => {
      const { error } = await supabase
        .from('polla_participants')
        .update({ status })
        .eq('id', participantId)
      if (error) throw error
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['participants', pollaId] })
    },
  })
}
