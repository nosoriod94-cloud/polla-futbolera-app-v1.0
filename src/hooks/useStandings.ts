import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStandings(pollaId: string | undefined) {
  return useQuery({
    queryKey: ['standings', pollaId],
    enabled: !!pollaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('standings_view')
        .select('*')
        .eq('polla_id', pollaId!)
        .order('puntos_totales', { ascending: false })
      if (error) throw error
      return data
    },
    refetchInterval: 30_000, // Refrescar cada 30 segundos
  })
}
