import { useParams } from 'react-router-dom'
import { useStandings } from '@/hooks/useStandings'
import { useMyParticipant } from '@/hooks/useParticipants'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Trophy, Star } from 'lucide-react'

const medals = ['🥇', '🥈', '🥉']

export default function Posiciones() {
  const { pollaId } = useParams<{ pollaId: string }>()
  const { data: standings = [], isLoading } = useStandings(pollaId)
  const { data: myParticipant } = useMyParticipant(pollaId)

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Cargando tabla...</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h1 className="text-xl font-bold">Tabla de posiciones</h1>
      </div>

      {standings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Aún no hay puntos registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {standings.map((row, idx) => {
            const isMe = row.user_id === myParticipant?.user_id
            return (
              <Card
                key={row.participant_id}
                className={cn(
                  'transition-all',
                  isMe && 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
                  idx === 0 && 'border-yellow-400 shadow-md'
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center font-bold text-lg">
                      {medals[idx] ?? <span className="text-muted-foreground text-sm">#{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm truncate">{row.apodo}</span>
                        {isMe && <Star className="h-3 w-3 text-blue-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.aciertos}/{row.total_predicciones} acertadas
                        {row.predicciones_default > 0 && ` · ${row.predicciones_default} por defecto`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{row.puntos_totales}</span>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground pt-2">
        Se actualiza cada 30 segundos
      </p>
    </div>
  )
}
