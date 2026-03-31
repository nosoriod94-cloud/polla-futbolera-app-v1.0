import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { User, LogOut } from 'lucide-react'

export default function Perfil() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('nombre_completo')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nombre_completo) setNombreCompleto(data.nombre_completo)
      })
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ nombre_completo: nombreCompleto.trim() })
      .eq('user_id', user.id)
    setSaving(false)
    if (error) {
      toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Perfil actualizado' })
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-4 flex items-center gap-2">
        <User className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">Mi perfil</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Correo</Label>
            <p className="text-sm font-medium">{user?.email}</p>
          </div>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={nombreCompleto}
                onChange={e => setNombreCompleto(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Cerrar sesión
      </Button>
    </div>
  )
}
