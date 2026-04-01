import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { usePolla } from '@/hooks/usePollas'
import { useParticipants, useUpdateParticipantStatus, useLimitRequest, useRequestParticipantLimit } from '@/hooks/useParticipants'
import { useJornadas, useMatches, useCreateJornada, useCreateMatch, useUpdateMatch, useDeleteMatch } from '@/hooks/useMatches'
import { useAllPredictionsForExport } from '@/hooks/usePredictions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Plus, Download, Lock, Unlock, CheckCircle, XCircle, Clock, Pencil, Trash2, Copy, Users, AlertTriangle } from 'lucide-react'
import type { MatchResult } from '@/lib/database.types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const resultLabels: Record<string, string> = {
  A_wins: 'Gana A',
  draw: 'Empate',
  B_wins: 'Gana B',
}

export default function Admin() {
  const { pollaId } = useParams<{ pollaId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const { data: polla, isLoading: loadingPolla } = usePolla(pollaId)
  const { data: participants = [] } = useParticipants(pollaId)
  const { data: limitRequest } = useLimitRequest(pollaId)
  const requestLimit = useRequestParticipantLimit()
  const { data: jornadas = [] } = useJornadas(pollaId)
  const { data: matches = [] } = useMatches(pollaId)
  const { data: predictionsExport } = useAllPredictionsForExport(pollaId)

  const updateStatus = useUpdateParticipantStatus()
  const createJornada = useCreateJornada()
  const createMatch = useCreateMatch()
  const updateMatch = useUpdateMatch()
  const deleteMatch = useDeleteMatch()

  // Jornada form
  const [jornadaNombre, setJornadaNombre] = useState('')
  const [jornadaPuntos, setJornadaPuntos] = useState(3)
  const [jornadaOpen, setJornadaOpen] = useState(false)

  // Match form
  const [matchJornadaId, setMatchJornadaId] = useState('')
  const [matchEquipoA, setMatchEquipoA] = useState('')
  const [matchEquipoB, setMatchEquipoB] = useState('')
  const [matchFechaHora, setMatchFechaHora] = useState('')
  const [matchEstadio, setMatchEstadio] = useState('')
  const [matchOpen, setMatchOpen] = useState(false)

  // Edit match
  const [editMatch, setEditMatch] = useState<typeof matches[0] | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // Participant limit
  const [limitOpen, setLimitOpen] = useState(false)
  const authorizedCount = participants.filter(p => p.status === 'authorized').length
  const approvedLimit = limitRequest?.status === 'approved' ? limitRequest.requested_limit : 50

  // Not admin → redirect
  if (!loadingPolla && polla && polla.admin_user_id !== user?.id) {
    navigate('/')
    return null
  }

  async function handleCreateJornada(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createJornada.mutateAsync({
        pollaId: pollaId!,
        nombre: jornadaNombre,
        orden: jornadas.length + 1,
        puntosPorAcierto: jornadaPuntos,
      })
      toast({ title: 'Jornada creada' })
      setJornadaOpen(false)
      setJornadaNombre('')
      setJornadaPuntos(3)
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createMatch.mutateAsync({
        pollaId: pollaId!,
        jornadaId: matchJornadaId,
        equipoA: matchEquipoA,
        equipoB: matchEquipoB,
        fechaHora: matchFechaHora,
        estadio: matchEstadio || undefined,
      })
      toast({ title: 'Partido creado' })
      setMatchOpen(false)
      setMatchEquipoA('')
      setMatchEquipoB('')
      setMatchFechaHora('')
      setMatchEstadio('')
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function handleUpdateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!editMatch) return
    try {
      await updateMatch.mutateAsync({
        matchId: editMatch.id,
        pollaId: pollaId!,
        updates: {
          equipo_a: editMatch.equipo_a,
          equipo_b: editMatch.equipo_b,
          fecha_hora: editMatch.fecha_hora,
          estadio: editMatch.estadio ?? undefined,
          resultado: editMatch.resultado,
        },
      })
      toast({ title: 'Partido actualizado' })
      setEditOpen(false)
      setEditMatch(null)
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function toggleUnlock(match: typeof matches[0]) {
    try {
      await updateMatch.mutateAsync({
        matchId: match.id,
        pollaId: pollaId!,
        updates: { is_unlocked: !match.is_unlocked },
      })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('¿Eliminar este partido?')) return
    try {
      await deleteMatch.mutateAsync({ matchId, pollaId: pollaId! })
      toast({ title: 'Partido eliminado' })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  function downloadCSV(jornadaId?: string) {
    if (!predictionsExport) return
    const rows = predictionsExport.filter(p => {
      if (!jornadaId) return true
      const m = p.matches as unknown as { jornadas: { id?: string } } | null
      return m?.jornadas
    })

    const headers = ['Jornada', 'Partido', 'Participante', 'Predicción', 'Resultado', 'Acertó', 'Es default', 'Fecha envío']
    const lines = rows.map(p => {
      const m = p.matches as unknown as {
        equipo_a: string; equipo_b: string; fecha_hora: string; resultado: string | null
        jornadas: { nombre: string }
      } | null
      const pp = p.polla_participants as unknown as { apodo: string } | null
      const acerto = m?.resultado && p.pick === m.resultado ? 'Sí' : (m?.resultado ? 'No' : '-')
      return [
        m?.jornadas?.nombre ?? '',
        m ? `${m.equipo_a} vs ${m.equipo_b}` : '',
        pp?.apodo ?? '',
        resultLabels[p.pick] ?? p.pick,
        m?.resultado ? (resultLabels[m.resultado] ?? m.resultado) : 'Sin resultado',
        acerto,
        p.is_default ? 'Sí' : 'No',
        p.submitted_at ? format(new Date(p.submitted_at), 'dd/MM/yyyy HH:mm') : '',
      ].join(',')
    })

    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `predicciones_${polla?.nombre ?? 'polla'}_${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function copyPollaId() {
    navigator.clipboard.writeText(pollaId!)
    toast({ title: 'ID copiado', description: 'Compártelo con los participantes.' })
  }

  async function handleRequestLimit() {
    try {
      await requestLimit.mutateAsync({
        pollaId: pollaId!,
        currentLimit: approvedLimit,
        requestedLimit: approvedLimit + 25,
      })
      toast({ title: 'Solicitud enviada', description: 'El administrador del sistema revisará tu solicitud.' })
      setLimitOpen(false)
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  if (loadingPolla) {
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{polla?.nombre}</h1>
          <p className="text-xs text-muted-foreground">Panel de administración</p>
        </div>
      </div>

      {/* ID para compartir */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-blue-700 font-medium mb-1">ID de la polla (para compartir)</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white border rounded px-2 py-1 flex-1 truncate">{pollaId}</code>
            <Button size="sm" variant="outline" onClick={copyPollaId} className="shrink-0">
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="participantes">
        <TabsList className="w-full">
          <TabsTrigger value="participantes" className="flex-1 text-xs">Participantes</TabsTrigger>
          <TabsTrigger value="partidos" className="flex-1 text-xs">Partidos</TabsTrigger>
          <TabsTrigger value="exportar" className="flex-1 text-xs">Exportar</TabsTrigger>
        </TabsList>

        {/* ===== PARTICIPANTES ===== */}
        <TabsContent value="participantes" className="space-y-3 mt-4">
          {/* Contador y estado del límite */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                <strong className={authorizedCount >= approvedLimit ? 'text-red-600' : authorizedCount >= approvedLimit - 2 ? 'text-orange-600' : 'text-foreground'}>
                  {authorizedCount}
                </strong>
                {' / '}{approvedLimit} participantes autorizados
              </span>
            </div>
            {/* Botón solicitar expansión */}
            {authorizedCount >= approvedLimit && limitRequest?.status !== 'pending' && limitRequest?.status !== 'approved' && (
              <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50">
                    <Plus className="h-3 w-3 mr-1" /> Más cupos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar más participantes</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <p className="text-sm text-muted-foreground">
                      Tu polla ha alcanzado el límite de <strong>{approvedLimit} participantes</strong>.
                      Puedes solicitar ampliar el cupo en 25 participantes adicionales.
                    </p>
                    <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800">
                      <p className="font-medium">Solicitud de expansión</p>
                      <p className="text-xs mt-1">
                        Límite actual: {approvedLimit} → Nuevo límite solicitado: {approvedLimit + 25}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El administrador del sistema revisará tu solicitud. Te informaremos cuando sea aprobada.
                    </p>
                    <Button
                      className="w-full"
                      onClick={handleRequestLimit}
                      disabled={requestLimit.isPending}
                    >
                      {requestLimit.isPending ? 'Enviando...' : 'Enviar solicitud'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {limitRequest?.status === 'pending' && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                <Clock className="inline h-3 w-3 mr-1" />Solicitud pendiente
              </span>
            )}
            {limitRequest?.status === 'approved' && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle className="inline h-3 w-3 mr-1" />Límite ampliado
              </span>
            )}
          </div>

          {/* Alerta cuando casi llega al límite */}
          {authorizedCount >= approvedLimit - 2 && authorizedCount < approvedLimit && (
            <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">
                Pronto llegarás al límite de {approvedLimit} participantes.
              </p>
            </div>
          )}

          {participants.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nadie se ha unido todavía. Comparte el ID de la polla.
              </CardContent>
            </Card>
          ) : (
            participants.map(p => {
              const profile = p.profiles as unknown as { nombre_completo: string } | null
              return (
                <Card key={p.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.apodo}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.nombre_completo}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-700 hover:text-green-800 hover:bg-green-50 h-8 px-2"
                              onClick={() => updateStatus.mutate({ participantId: p.id, pollaId: pollaId!, status: 'authorized' })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-700 hover:text-red-800 hover:bg-red-50 h-8 px-2"
                              onClick={() => updateStatus.mutate({ participantId: p.id, pollaId: pollaId!, status: 'blocked' })}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Rechazar
                            </Button>
                          </>
                        )}
                        {p.status === 'authorized' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-700 hover:bg-red-50 h-8 px-2"
                            onClick={() => updateStatus.mutate({ participantId: p.id, pollaId: pollaId!, status: 'blocked' })}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Bloquear
                          </Button>
                        )}
                        {p.status === 'blocked' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-700 hover:bg-green-50 h-8 px-2"
                            onClick={() => updateStatus.mutate({ participantId: p.id, pollaId: pollaId!, status: 'authorized' })}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Autorizar
                          </Button>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            p.status === 'authorized' ? 'border-green-300 text-green-700' :
                            p.status === 'blocked' ? 'border-red-300 text-red-700' :
                            'border-yellow-300 text-yellow-700'
                          }
                        >
                          {p.status === 'pending' ? <Clock className="h-3 w-3" /> :
                           p.status === 'authorized' ? <CheckCircle className="h-3 w-3" /> :
                           <XCircle className="h-3 w-3" />}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* ===== PARTIDOS ===== */}
        <TabsContent value="partidos" className="space-y-4 mt-4">
          {/* Botones crear */}
          <div className="flex gap-2">
            <Dialog open={jornadaOpen} onOpenChange={setJornadaOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                  <Plus className="h-4 w-4 mr-1" /> Nueva jornada
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Crear jornada</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateJornada} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      placeholder="Jornada 1, Octavos de final..."
                      value={jornadaNombre}
                      onChange={e => setJornadaNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Puntos por acierto</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={jornadaPuntos}
                      onChange={e => setJornadaPuntos(Number(e.target.value))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createJornada.isPending}>
                    Crear jornada
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 bg-blue-700 hover:bg-blue-800" disabled={jornadas.length === 0}>
                  <Plus className="h-4 w-4 mr-1" /> Nuevo partido
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Crear partido</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateMatch} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Jornada</Label>
                    <Select value={matchJornadaId} onValueChange={setMatchJornadaId} required>
                      <SelectTrigger><SelectValue placeholder="Selecciona jornada" /></SelectTrigger>
                      <SelectContent>
                        {jornadas.map(j => (
                          <SelectItem key={j.id} value={j.id}>{j.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Equipo A</Label>
                      <Input placeholder="Colombia" value={matchEquipoA} onChange={e => setMatchEquipoA(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Equipo B</Label>
                      <Input placeholder="Brasil" value={matchEquipoB} onChange={e => setMatchEquipoB(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha y hora</Label>
                    <Input
                      type="datetime-local"
                      value={matchFechaHora}
                      onChange={e => setMatchFechaHora(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estadio (opcional)</Label>
                    <Input placeholder="MetLife Stadium" value={matchEstadio} onChange={e => setMatchEstadio(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMatch.isPending}>
                    Crear partido
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {jornadas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Crea primero una jornada para agregar partidos.
              </CardContent>
            </Card>
          ) : (
            jornadas.map(jornada => {
              const jornadaMatches = matches.filter(m => m.jornada_id === jornada.id)
              return (
                <div key={jornada.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{jornada.nombre}</h3>
                    <Badge variant="secondary" className="text-xs">{jornada.puntos_por_acierto} pts/acierto</Badge>
                  </div>
                  {jornadaMatches.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-2">Sin partidos en esta jornada.</p>
                  ) : (
                    jornadaMatches.map(match => {
                      const isPast = new Date(match.fecha_hora) <= new Date(Date.now() - 60_000)
                      return (
                        <Card key={match.id} className="text-sm">
                          <CardContent className="py-3 px-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{match.equipo_a} <span className="text-muted-foreground">vs</span> {match.equipo_b}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => { setEditMatch(match); setEditOpen(true) }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteMatch(match.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{format(new Date(match.fecha_hora), "d MMM yyyy, HH:mm", { locale: es })}</span>
                              {match.estadio && <span>{match.estadio}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={match.is_unlocked ? 'default' : 'outline'}
                                className={`h-7 text-xs ${match.is_unlocked ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                disabled={isPast}
                                onClick={() => toggleUnlock(match)}
                              >
                                {match.is_unlocked ? <><Unlock className="h-3 w-3 mr-1" />Abierto</> : <><Lock className="h-3 w-3 mr-1" />Cerrado</>}
                              </Button>
                              {match.resultado && (
                                <Badge variant="outline" className="text-xs">
                                  Resultado: {resultLabels[match.resultado]}
                                </Badge>
                              )}
                              {isPast && !match.resultado && (
                                <span className="text-xs text-orange-600">Partido pasado — falta resultado</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              )
            })
          )}
        </TabsContent>

        {/* ===== EXPORTAR ===== */}
        <TabsContent value="exportar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descargar predicciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => downloadCSV()}
                disabled={!predictionsExport || predictionsExport.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Todas las predicciones (CSV)
              </Button>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Por jornada:</p>
                {jornadas.map(j => (
                  <Button
                    key={j.id}
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCSV(j.id)}
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    {j.nombre}
                  </Button>
                ))}
                {jornadas.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay jornadas creadas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit match dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar partido</DialogTitle></DialogHeader>
          {editMatch && (
            <form onSubmit={handleUpdateMatch} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Equipo A</Label>
                  <Input
                    value={editMatch.equipo_a}
                    onChange={e => setEditMatch({ ...editMatch, equipo_a: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipo B</Label>
                  <Input
                    value={editMatch.equipo_b}
                    onChange={e => setEditMatch({ ...editMatch, equipo_b: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <Input
                  type="datetime-local"
                  value={editMatch.fecha_hora.slice(0, 16)}
                  onChange={e => setEditMatch({ ...editMatch, fecha_hora: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Estadio</Label>
                <Input
                  value={editMatch.estadio ?? ''}
                  onChange={e => setEditMatch({ ...editMatch, estadio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Select
                  value={editMatch.resultado ?? ''}
                  onValueChange={v => setEditMatch({ ...editMatch, resultado: (v || null) as MatchResult })}
                >
                  <SelectTrigger><SelectValue placeholder="Sin resultado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin resultado</SelectItem>
                    <SelectItem value="A_wins">Gana {editMatch.equipo_a}</SelectItem>
                    <SelectItem value="draw">Empate</SelectItem>
                    <SelectItem value="B_wins">Gana {editMatch.equipo_b}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updateMatch.isPending}>
                Guardar cambios
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
