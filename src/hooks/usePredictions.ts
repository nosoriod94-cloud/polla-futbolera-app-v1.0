import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Pick } from '@/lib/database.types'

export function usePredictions(pollaId: string | undefined, jornadaId?: string) {
  return useQuery({
    queryKey: ['predictions', pollaId, jornadaId],
    enabled: !!pollaId,
    queryFn: async () => {
      let q = supabase
        .from('predictions')
        .select('*, matches(equipo_a, equipo_b, fecha_hora, resultado, jornada_id, is_unlocked), polla_participants(apodo, user_id)')
        .eq('polla_id', pollaId!)
      if (jornadaId) {
        // Filter by jornada via nested match
        q = q.eq('matches.jornada_id', jornadaId)
      }
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useMyPredictions(pollaId: string | undefined, participantId: string | undefined) {
  return useQuery({
    queryKey: ['my_predictions', pollaId, participantId],
    enabled: !!pollaId && !!participantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('polla_id', pollaId!)
        .eq('participant_id', participantId!)
      if (error) throw error
      // Return as a map: match_id -> prediction
      const map: Record<string, typeof data[0]> = {}
      for (const p of data) map[p.match_id] = p
      return map
    },
  })
}

export function useUpsertPrediction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pollaId,
      matchId,
      participantId,
      pick,
    }: {
      pollaId: string
      matchId: string
      participantId: string
      pick: Pick
    }) => {
      const { data, error } = await supabase
        .from('predictions')
        .upsert(
          { polla_id: pollaId, match_id: matchId, participant_id: participantId, pick, is_default: false },
          { onConflict: 'match_id,participant_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { pollaId, participantId }) => {
      qc.invalidateQueries({ queryKey: ['my_predictions', pollaId, participantId] })
      qc.invalidateQueries({ queryKey: ['predictions', pollaId] })
    },
  })
}

// Predicciones para descarga (admin)
export function useAllPredictionsForExport(pollaId: string | undefined) {
  return useQuery({
    queryKey: ['predictions_export', pollaId],
    enabled: !!pollaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select(`
          pick,
          is_default,
          submitted_at,
          polla_participants(apodo),
          matches(equipo_a, equipo_b, fecha_hora, resultado, jornadas(nombre, orden))
        `)
        .eq('polla_id', pollaId!)
        .order('submitted_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
