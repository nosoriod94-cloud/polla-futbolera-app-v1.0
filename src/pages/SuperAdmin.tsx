import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useAllLicenses, useCreateLicense, useAllPollas } from '@/hooks/usePollas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Copy, CheckCircle, Clock, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const SUPERADMIN_ID = import.meta.env.VITE_SUPERADMIN_USER_ID

export default function SuperAdmin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: licenses = [], isLoading: loadingLicenses } = useAllLicenses()
  const { data: allPollas = [], isLoading: loadingPollas } = useAllPollas()
  const createLicense = useCreateLicense()

  // Bloquear acceso si no es el superadmin
  if (!SUPERADMIN_ID || user?.id !== SUPERADMIN_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h1 className="text-xl font-bold mb-2">Acceso restringido</h1>
          <p className="text-muted-foreground text-sm mb-4">Esta sección es solo para el administrador del sistema.</p>
          <Button variant="outline" onClick={() => navigate('/')}>Volver al inicio</Button>
        </div>
      </div>
    )
  }

  async function handleCreateLicense() {
    try {
      const code = await createLicense.mutateAsync()
      toast({
        title: 'Licencia generada',
        description: code,
      })
    } catch (err: unknown) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    toast({ title: 'Copiado', description: `"${code}" copiado al portapapeles.` })
  }

  const available = licenses.filter(l => !l.used_at)
  const used = licenses.filter(l => l.used_at)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" /> Super Admin
          </h1>
          <p className="text-xs text-muted-foreground">Panel privado del sistema</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>← Inicio</Button>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{allPollas.length}</p>
              <p className="text-xs text-muted-foreground">Pollas activas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{available.length}</p>
              <p className="text-xs text-muted-foreground">Licencias disponibles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{used.length}</p>
              <p className="text-xs text-muted-foreground">Licencias usadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Generar licencia */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Licencias</h2>
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-800"
              onClick={handleCreateLicense}
              disabled={createLicense.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              {createLicense.isPending ? 'Generando...' : 'Generar licencia'}
            </Button>
          </div>

          {loadingLicenses ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          ) : licenses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No hay licencias generadas aún.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {/* Disponibles primero */}
              {available.map(l => (
                <Card key={l.id} className="border-green-200 bg-green-50/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600 shrink-0" />
                        <code className="font-mono font-bold text-sm tracking-widest text-green-800">{l.code}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-green-400 text-green-700 text-xs">Disponible</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-700 hover:bg-green-100"
                          onClick={() => copyCode(l.code)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 pl-6">
                      Generada: {format(new Date(l.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Usadas */}
              {used.map(l => {
                const polla = l.pollas as unknown as { nombre: string } | null
                return (
                  <Card key={l.id} className="opacity-60">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                          <code className="font-mono text-sm tracking-widest line-through text-muted-foreground">{l.code}</code>
                        </div>
                        <Badge variant="secondary" className="text-xs">Usada</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-6">
                        {polla ? `Polla: "${polla.nombre}"` : ''}
                        {l.used_at ? ` · ${format(new Date(l.used_at), "d MMM yyyy", { locale: es })}` : ''}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Todas las pollas */}
        <section>
          <h2 className="font-semibold mb-3">Todas las pollas</h2>
          {loadingPollas ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          ) : allPollas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No hay pollas creadas aún.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {allPollas.map(polla => (
                <Card key={polla.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{polla.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Código: <code className="font-mono">{polla.invite_code ?? '—'}</code>
                          {' · '}Creada: {format(new Date(polla.created_at), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <Badge variant={polla.is_active ? 'default' : 'secondary'} className="text-xs">
                        {polla.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
