import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useMyPollas, useCreatePolla, useMyParticipatingPollas, usePollaByInviteCode, useLicense } from '@/hooks/usePollas'
import { useJoinPolla } from '@/hooks/useParticipants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Shield, Users, Clock, Lock, AlertTriangle } from 'lucide-react'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente de aprobación', color: 'bg-yellow-100 text-yellow-800' },
  authorized: { label: 'Autorizado', color: 'bg-green-100 text-green-800' },
  blocked: { label: 'Bloqueado', color: 'bg-red-100 text-red-800' },
}

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: adminPollas = [], isLoading: loadingAdmin } = useMyPollas()
  const { data: participatingPollas = [], isLoading: loadingPart } = useMyParticipatingPollas()
  const { data: license } = useLicense()
  const createPolla = useCreatePolla()
  const joinPolla = useJoinPolla()

  // Crear polla
  const [newPollaName, setNewPollaName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Unirse a polla
  const [joinCode, setJoinCode] = useState('')
  const [joinApodo, setJoinApodo] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)

  const { data: pollaEncontrada } = usePollaByInviteCode(joinCode)

  async function handleCreatePolla(e: React.FormEvent) {
    e.preventDefault()
    if (!newPollaName.trim()) return
    try {
      const polla = await createPolla.mutateAsync(newPollaName.trim())
      toast({ title: 'Polla creada', description: `"${polla.nombre}" está lista para configurar.` })
      setCreateOpen(false)
      setNewPollaName('')
      navigate(`/admin/${polla.id}`)
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function handleJoinPolla(e: React.FormEvent) {
    e.preventDefault()
    if (!pollaEncontrada || !joinApodo.trim()) return
    try {
      await joinPolla.mutateAsync({ pollaId: pollaEncontrada.id, apodo: joinApodo.trim() })
      toast({ title: 'Solicitud enviada', description: 'El admin debe aprobarte para participar.' })
      setJoinOpen(false)
      setJoinCode('')
      setJoinApodo('')
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  const isSuspended = license !== undefined && license !== null && !license.isActive

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold">⚽ Polla Mundialista</h1>
          <p className="text-sm text-muted-foreground">FIFA 2026</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          Salir
        </Button>
      </div>

      {/* Banner: cuenta suspendida */}
      {isSuspended && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Cuenta suspendida</p>
            <p className="text-xs text-red-600 mt-0.5">
              Tu cuenta ha sido suspendida. Contacta a{' '}
              <strong>hola@pollafutbolera.online</strong> para resolver la situación.
            </p>
          </div>
        </div>
      )}

      {/* Mis pollas como admin */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Mis pollas (admin)
            </h2>
            {license && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {license.pollasCreated} de {license.pollasLimit} pollas usadas
              </p>
            )}
          </div>

          {/* Solo mostrar botón si tiene licencia activa y puede crear */}
          {license?.canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-700 hover:bg-blue-800">
                  <Plus className="h-4 w-4 mr-1" /> Nueva
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear nueva polla</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePolla} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nombre de la polla</Label>
                    <Input
                      placeholder="Polla del trabajo, familia Osorio..."
                      value={newPollaName}
                      onChange={e => setNewPollaName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createPolla.isPending}>
                    {createPolla.isPending ? 'Creando...' : 'Crear polla'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loadingAdmin ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
        ) : adminPollas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {isSuspended ? (
                <p className="text-sm text-red-600">Cuenta suspendida.</p>
              ) : license?.canCreate ? (
                <>
                  <p className="text-sm">No has creado ninguna polla todavía.</p>
                  <p className="text-xs mt-1">Haz clic en "Nueva" para comenzar.</p>
                </>
              ) : license && !license.canCreate ? (
                <>
                  <Lock className="h-5 w-5 mx-auto mb-1 opacity-40" />
                  <p className="text-sm font-medium">Límite alcanzado</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Usaste las {license.pollasLimit} pollas de tu licencia.
                  </p>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mx-auto mb-1 opacity-40" />
                  <p className="text-sm">No tienes una licencia activa.</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Contacta a <strong>hola@pollafutbolera.online</strong> para adquirir una.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {adminPollas.map(polla => (
              <Card
                key={polla.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/${polla.id}`)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{polla.nombre}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${polla.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {polla.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {polla.invite_code && (
                    <CardDescription className="text-xs mt-1">
                      Código de invitación: <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold text-foreground">{polla.invite_code}</code>
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}

            {/* Mostrar mensaje si llegó al límite */}
            {license && !license.canCreate && !isSuspended && (
              <p className="text-xs text-center text-muted-foreground py-2">
                Límite alcanzado ({license.pollasCreated}/{license.pollasLimit} pollas).
                Contacta a <strong>hola@pollafutbolera.online</strong> para ampliar tu plan.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Pollas donde participo */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-green-600" />
            Pollas donde participo
          </h2>
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Unirme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unirme a una polla</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinPolla} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Código de invitación</Label>
                  <Input
                    placeholder="OSORIO26"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest text-center text-lg"
                    maxLength={8}
                  />
                  {joinCode.length >= 6 && (
                    <div className={`text-xs rounded-lg px-3 py-2 ${pollaEncontrada ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {pollaEncontrada
                        ? `✓ Polla encontrada: "${pollaEncontrada.nombre}"`
                        : '✗ No se encontró ninguna polla con ese código'}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tu apodo en esta polla</Label>
                  <Input
                    placeholder="ElProfe, TioChucho..."
                    value={joinApodo}
                    onChange={e => setJoinApodo(e.target.value)}
                    disabled={!pollaEncontrada}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!pollaEncontrada || !joinApodo.trim() || joinPolla.isPending}
                >
                  {joinPolla.isPending ? 'Enviando solicitud...' : 'Solicitar unirme'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingPart ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
        ) : participatingPollas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No estás participando en ninguna polla.</p>
              <p className="text-xs mt-1">Pide el código de invitación al admin.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {participatingPollas.map(pp => {
              const polla = pp.pollas as unknown as { id: string; nombre: string } | null
              if (!polla) return null
              const statusInfo = statusLabels[pp.status] ?? statusLabels.pending
              return (
                <Card
                  key={pp.polla_id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${pp.status !== 'authorized' ? 'opacity-75' : ''}`}
                  onClick={() => pp.status === 'authorized' && navigate(`/polla/${pp.polla_id}`)}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{polla.nombre}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Apodo: <strong>{pp.apodo}</strong></p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
                        {pp.status === 'pending' && <Clock className="inline h-3 w-3 mr-1" />}
                        {statusInfo.label}
                      </span>
                    </div>
                    {pp.status === 'pending' && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 rounded p-2 mt-1">
                        Tu solicitud está pendiente. El admin debe aprobarte.
                      </p>
                    )}
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
