import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchResult } from '@/lib/database.types'

export function useJornadas(pollaId: string | undefined) {
  return useQuery({
    queryKey: ['jornadas', pollaId],
    enabled: !!pollaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jornadas')
        .select('*')
        .eq('polla_id', pollaId!)
        .order('orden', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useMatches(pollaId: string | undefined, jornadaId?: string) {
  return useQuery({
    queryKey: ['matches', pollaId, jornadaId],
    enabled: !!pollaId,
    queryFn: async () => {
      let q = supabase
        .from('matches')
        .select('*')
        .eq('polla_id', pollaId!)
        .order('fecha_hora', { ascending: true })
      if (jornadaId) q = q.eq('jornada_id', jornadaId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useCreateJornada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pollaId,
      nombre,
      orden,
      puntosPorAcierto,
    }: {
      pollaId: string
      nombre: string
      orden: number
      puntosPorAcierto: number
    }) => {
      const { data, error } = await supabase
        .from('jornadas')
        .insert({ polla_id: pollaId, nombre, orden, puntos_por_acierto: puntosPorAcierto })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['jornadas', pollaId] })
    },
  })
}

export function useCreateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pollaId,
      jornadaId,
      equipoA,
      equipoB,
      fechaHora,
      estadio,
    }: {
      pollaId: string
      jornadaId: string
      equipoA: string
      equipoB: string
      fechaHora: string
      estadio?: string
    }) => {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          polla_id: pollaId,
          jornada_id: jornadaId,
          equipo_a: equipoA,
          equipo_b: equipoB,
          fecha_hora: fechaHora,
          estadio: estadio || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['matches', pollaId] })
    },
  })
}

export function useUpdateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      matchId,
      pollaId,
      updates,
    }: {
      matchId: string
      pollaId: string
      updates: {
        equipo_a?: string
        equipo_b?: string
        fecha_hora?: string
        estadio?: string
        is_unlocked?: boolean
        resultado?: MatchResult
      }
    }) => {
      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
      if (error) throw error
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['matches', pollaId] })
    },
  })
}

export function useDeleteMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ matchId, pollaId }: { matchId: string; pollaId: string }) => {
      const { error } = await supabase.from('matches').delete().eq('id', matchId)
      if (error) throw error
    },
    onSuccess: (_data, { pollaId }) => {
      qc.invalidateQueries({ queryKey: ['matches', pollaId] })
    },
  })
}
