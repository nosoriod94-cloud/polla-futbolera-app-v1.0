import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useJornadas, useMatches } from '@/hooks/useMatches'
import { useMyParticipant } from '@/hooks/useParticipants'
import { useMyPredictions, useUpsertPrediction } from '@/hooks/usePredictions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Lock, Clock } from 'lucide-react'
import { format, isPast, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Pick } from '@/lib/database.types'

interface PredictionToggleProps {
  matchId: string
  pollaId: string
  participantId: string
  currentPick: Pick | undefined
  equipoA: string
  equipoB: string
  disabled: boolean
}

function PredictionToggle({ matchId, pollaId, participantId, currentPick, equipoA, equipoB, disabled }: PredictionToggleProps) {
  const upsert = useUpsertPrediction()
  const { toast } = useToast()

  async function pick(p: Pick) {
    if (disabled) return
    try {
      await upsert.mutateAsync({ pollaId, matchId, participantId, pick: p })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const btnBase = 'flex-1 py-2 px-1 rounded-lg text-xs font-semibold border-2 transition-all text-center cursor-pointer select-none'
  const active = 'border-blue-600 bg-blue-600 text-white shadow-md scale-105'
  const inactive = 'border-muted bg-background text-muted-foreground hover:border-blue-400 hover:text-blue-600'
  const disabledCls = 'opacity-50 cursor-not-allowed'

  return (
    <div className={cn('flex gap-2 mt-2', disabled && disabledCls)}>
      <button
        type="button"
        className={cn(btnBase, currentPick === 'A_wins' ? active : inactive)}
        onClick={() => pick('A_wins')}
        disabled={disabled || upsert.isPending}
      >
        {equipoA}
      </button>
      <button
        type="button"
        className={cn(btnBase, currentPick === 'draw' ? active : inactive)}
        onClick={() => pick('draw')}
        disabled={disabled || upsert.isPending}
      >
        Empate
      </button>
      <button
        type="button"
        className={cn(btnBase, currentPick === 'B_wins' ? active : inactive)}
        onClick={() => pick('B_wins')}
        disabled={disabled || upsert.isPending}
      >
        {equipoB}
      </button>
    </div>
  )
}

export default function Predicciones() {
  const { pollaId } = useParams<{ pollaId: string }>()
  const { user } = useAuth()
  const { toast } = useToast()

  const { data: participant } = useMyParticipant(pollaId)
  const { data: jornadas = [] } = useJornadas(pollaId)
  const { data: matches = [] } = useMatches(pollaId)
  const { data: myPredictions = {} } = useMyPredictions(pollaId, participant?.id)

  if (!participant) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>No estás registrado en esta polla.</p>
      </div>
    )
  }

  if (participant.status === 'pending') {
    return (
      <div className="p-6 text-center">
        <Clock className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
        <h2 className="font-semibold mb-1">Solicitud pendiente</h2>
        <p className="text-sm text-muted-foreground">
          El admin debe aprobar tu solicitud antes de que puedas hacer predicciones.
        </p>
      </div>
    )
  }

  if (participant.status === 'blocked') {
    return (
      <div className="p-6 text-center text-destructive">
        <p>Tu acceso a esta polla ha sido bloqueado.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4">
        <h1 className="text-xl font-bold">Mis predicciones</h1>
        <p className="text-sm text-muted-foreground">Apodo: <strong>{participant.apodo}</strong></p>
      </div>

      {jornadas.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            El admin no ha creado partidos todavía.
          </CardContent>
        </Card>
      )}

      {jornadas.map(jornada => {
        const jornadaMatches = matches.filter(m => m.jornada_id === jornada.id)
        const unlocked = jornadaMatches.filter(m => m.is_unlocked)
        if (unlocked.length === 0) return null

        return (
          <section key={jornada.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{jornada.nombre}</h2>
              <Badge variant="secondary">{jornada.puntos_por_acierto} pts</Badge>
            </div>

            {unlocked.map(match => {
              const kickoff = new Date(match.fecha_hora)
              const cutoff = addMinutes(kickoff, -1)
              const isLocked = isPast(cutoff)
              const myPick = myPredictions[match.id]?.pick

              return (
                <Card key={match.id} className={cn(isLocked && 'opacity-80')}>
                  <CardContent className="py-3 px-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {match.equipo_a} <span className="text-muted-foreground">vs</span> {match.equipo_b}
                      </span>
                      {isLocked ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> Cerrado
                        </span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Abierto</span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {format(kickoff, "d MMM yyyy, HH:mm", { locale: es })}
                      {match.estadio && <> · {match.estadio}</>}
                    </p>

                    <PredictionToggle
                      matchId={match.id}
                      pollaId={pollaId!}
                      participantId={participant.id}
                      currentPick={myPick}
                      equipoA={match.equipo_a}
                      equipoB={match.equipo_b}
                      disabled={isLocked}
                    />

                    {isLocked && !myPick && (
                      <p className="text-xs text-orange-600 mt-1">
                        No predijiste — quedaste con Empate por defecto.
                      </p>
                    )}

                    {myPick && myPredictions[match.id]?.is_default && (
                      <p className="text-xs text-orange-500 mt-1">Empate asignado automáticamente.</p>
                    )}

                    {match.resultado && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Resultado:</span>
                        <Badge variant="outline" className="text-xs">
                          {match.resultado === 'A_wins' ? match.equipo_a :
                           match.resultado === 'B_wins' ? match.equipo_b : 'Empate'}
                        </Badge>
                        {myPick && (
                          <span className={cn('text-xs font-medium', myPick === match.resultado ? 'text-green-600' : 'text-red-500')}>
                            {myPick === match.resultado ? `+${jornada.puntos_por_acierto} pts` : '0 pts'}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
