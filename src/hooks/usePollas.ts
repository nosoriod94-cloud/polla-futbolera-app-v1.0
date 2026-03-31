import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function useMyPollas() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['pollas', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollas')
        .select('*')
        .eq('admin_user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMyParticipatingPollas() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['pollas_participando', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polla_participants')
        .select('polla_id, status, apodo, pollas(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreatePolla() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ nombre, licenseCode }: { nombre: string; licenseCode: string }) => {
      // 1. Verificar que la licencia existe y está disponible
      const { data: license, error: licErr } = await supabase
        .from('licenses')
        .select('id, used_at')
        .eq('code', licenseCode.trim().toUpperCase())
        .maybeSingle()

      if (licErr) throw new Error('Error al verificar la licencia.')
      if (!license) throw new Error('Clave de licencia inválida. Verifica que esté escrita correctamente.')
      if (license.used_at) throw new Error('Esta clave de licencia ya fue utilizada.')

      // 2. Crear la polla (el invite_code se genera automáticamente via trigger)
      const { data: polla, error: pollaErr } = await supabase
        .from('pollas')
        .insert({ nombre, admin_user_id: user!.id })
        .select()
        .single()
      if (pollaErr) throw pollaErr

      // 3. Marcar la licencia como usada (via función security definer)
      const { error: redeemErr } = await supabase
        .rpc('redeem_license', { p_license_code: licenseCode.trim().toUpperCase(), p_polla_id: polla.id })
      if (redeemErr) {
        // Si falla el redeem, eliminar la polla creada para mantener consistencia
        await supabase.from('pollas').delete().eq('id', polla.id)
        throw new Error(redeemErr.message)
      }

      return polla
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pollas', user?.id] })
    },
  })
}

export function usePolla(pollaId: string | undefined) {
  return useQuery({
    queryKey: ['polla', pollaId],
    enabled: !!pollaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollas')
        .select('*')
        .eq('id', pollaId!)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function usePollaByInviteCode(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ['polla_invite', inviteCode],
    enabled: !!inviteCode && inviteCode.length >= 6,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollas')
        .select('id, nombre, is_active')
        .eq('invite_code', inviteCode!.trim().toUpperCase())
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Solo para super-admin
export function useAllPollas() {
  return useQuery({
    queryKey: ['all_pollas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pollas')
        .select('*, licenses(code, used_at)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAllLicenses() {
  return useQuery({
    queryKey: ['licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licenses')
        .select('*, pollas(nombre)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateLicense() {
  const qc = useQueryClient()
  const superadminId = import.meta.env.VITE_SUPERADMIN_USER_ID
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('create_license', { p_superadmin_id: superadminId })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['licenses'] })
    },
  })
}
