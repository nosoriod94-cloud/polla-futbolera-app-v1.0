import { useParams } from 'react-router-dom'
import { useJornadas, useMatches } from '@/hooks/useMatches'
import { usePredictions } from '@/hooks/usePredictions'
import { useParticipantsSafe } from '@/hooks/useParticipants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Eye, Lock } from 'lucide-react'
import { isPast, addMinutes, format } from 'date-fns'
import { es } from 'date-fns/locale'

const pickLabels: Record<string, string> = {
  A_wins: 'A',
  draw: '=',
  B_wins: 'B',
}

export default function Transparencia() {
  const { pollaId } = useParams<{ pollaId: string }>()
  const { data: jornadas = [] } = useJornadas(pollaId)
  const { data: matches = [] } = useMatches(pollaId)
  const { data: participants = [] } = useParticipantsSafe(pollaId)
  const { data: predictions = [] } = usePredictions(pollaId)

  // useParticipantsSafe already filters by status='authorized'
  const authorizedParticipants = participants

  // Build prediction lookup: matchId -> participantId -> pick
  const predMap: Record<string, Record<string, { pick: string; is_default: boolean }>> = {}
  for (const pred of predictions) {
    if (!predMap[pred.match_id]) predMap[pred.match_id] = {}
    predMap[pred.match_id][pred.participant_id] = {
      pick: pred.pick,
      is_default: pred.is_default,
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4 flex items-center gap-2">
        <Eye className="h-6 w-6 text-purple-500" />
        <h1 className="text-xl font-bold">Transparencia</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Las predicciones de cada partido son visibles una vez que el partido queda cerrado.
      </p>

      {jornadas.map(jornada => {
        const jornadaMatches = matches.filter(m => m.jornada_id === jornada.id)
        const closedMatches = jornadaMatches.filter(m => isPast(addMinutes(new Date(m.fecha_hora), -1)))
        if (closedMatches.length === 0) return null

        return (
          <section key={jornada.id} className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              {jornada.nombre}
              <Badge variant="secondary">{jornada.puntos_por_acierto} pts</Badge>
            </h2>

            {closedMatches.map(match => {
              const matchPreds = predMap[match.id] ?? {}

              return (
                <Card key={match.id}>
                  <CardHeader className="py-3 px-4 pb-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {match.equipo_a} vs {match.equipo_b}
                      </CardTitle>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> Cerrado
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(match.fecha_hora), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                    {match.resultado && (
                      <Badge variant="outline" className="w-fit text-xs mt-1">
                        Resultado: {
                          match.resultado === 'A_wins' ? `Ganó ${match.equipo_a}` :
                          match.resultado === 'B_wins' ? `Ganó ${match.equipo_b}` :
                          'Empate'
                        }
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pt-3 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 pr-3 font-medium text-muted-foreground">Participante</th>
                            <th className="text-center py-1 px-2 font-medium text-muted-foreground">{match.equipo_a}</th>
                            <th className="text-center py-1 px-2 font-medium text-muted-foreground">Emp</th>
                            <th className="text-center py-1 px-2 font-medium text-muted-foreground">{match.equipo_b}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {authorizedParticipants.map(p => {
                            const pred = matchPreds[p.id]
                            const pick = pred?.pick
                            const isDefault = pred?.is_default
                            const isCorrect = pick && match.resultado && pick === match.resultado

                            return (
                              <tr key={p.id} className="border-b last:border-0">
                                <td className="py-1.5 pr-3 font-medium">
                                  {p.apodo}
                                  {isDefault && <span className="text-orange-400 ml-1 text-[10px]">(def)</span>}
                                </td>
                                {(['A_wins', 'draw', 'B_wins'] as const).map(option => {
                                  const isSelected = pick === option
                                  return (
                                    <td key={option} className="text-center px-2">
                                      {isSelected ? (
                                        <span
                                          className={cn(
                                            'inline-block w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center',
                                            isCorrect ? 'bg-green-500' : match.resultado ? 'bg-red-400' : 'bg-blue-500'
                                          )}
                                        >
                                          {pickLabels[option]}
                                        </span>
                                      ) : (
                                        <span className="inline-block w-6 h-6 text-center text-muted-foreground/30">·</span>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>
        )
      })}

      {jornadas.every(j => matches.filter(m => m.jornada_id === j.id).every(m => !isPast(addMinutes(new Date(m.fecha_hora), -1)))) && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aún no hay partidos cerrados. Las predicciones se verán aquí cuando el partido haya iniciado.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
