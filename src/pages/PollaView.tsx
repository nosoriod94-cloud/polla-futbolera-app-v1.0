import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePolla } from '@/hooks/usePollas'
import { useAuth } from '@/context/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'
import Predicciones from './Predicciones'
import Posiciones from './Posiciones'
import Transparencia from './Transparencia'

export default function PollaView() {
  const { pollaId } = useParams<{ pollaId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: polla } = usePolla(pollaId)
  const isAdmin = polla?.admin_user_id === user?.id

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{polla?.nombre ?? 'Polla'}</h1>
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/${pollaId}`)}>
            <Shield className="h-4 w-4 mr-1" /> Admin
          </Button>
        )}
      </div>

      <Tabs defaultValue="predicciones" className="w-full">
        <div className="px-4 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="predicciones" className="flex-1 text-xs">Predicciones</TabsTrigger>
            <TabsTrigger value="posiciones" className="flex-1 text-xs">Posiciones</TabsTrigger>
            <TabsTrigger value="transparencia" className="flex-1 text-xs">Ver todos</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="predicciones">
          <Predicciones />
        </TabsContent>
        <TabsContent value="posiciones">
          <Posiciones />
        </TabsContent>
        <TabsContent value="transparencia">
          <Transparencia />
        </TabsContent>
      </Tabs>
    </div>
  )
}
