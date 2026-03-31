export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ParticipantStatus = 'pending' | 'authorized' | 'blocked'
export type Pick = 'A_wins' | 'draw' | 'B_wins'
export type MatchResult = 'A_wins' | 'draw' | 'B_wins' | null

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          nombre_completo: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nombre_completo: string
          created_at?: string
        }
        Update: {
          nombre_completo?: string
        }
      }
      pollas: {
        Row: {
          id: string
          nombre: string
          admin_user_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          admin_user_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          nombre?: string
          is_active?: boolean
        }
      }
      polla_participants: {
        Row: {
          id: string
          polla_id: string
          user_id: string
          apodo: string
          status: ParticipantStatus
          created_at: string
        }
        Insert: {
          id?: string
          polla_id: string
          user_id: string
          apodo: string
          status?: ParticipantStatus
          created_at?: string
        }
        Update: {
          apodo?: string
          status?: ParticipantStatus
        }
      }
      jornadas: {
        Row: {
          id: string
          polla_id: string
          nombre: string
          orden: number
          puntos_por_acierto: number
          created_at: string
        }
        Insert: {
          id?: string
          polla_id: string
          nombre: string
          orden: number
          puntos_por_acierto?: number
          created_at?: string
        }
        Update: {
          nombre?: string
          orden?: number
          puntos_por_acierto?: number
        }
      }
      matches: {
        Row: {
          id: string
          polla_id: string
          jornada_id: string
          equipo_a: string
          equipo_b: string
          fecha_hora: string
          estadio: string | null
          is_unlocked: boolean
          resultado: MatchResult
          created_at: string
        }
        Insert: {
          id?: string
          polla_id: string
          jornada_id: string
          equipo_a: string
          equipo_b: string
          fecha_hora: string
          estadio?: string | null
          is_unlocked?: boolean
          resultado?: MatchResult
          created_at?: string
        }
        Update: {
          equipo_a?: string
          equipo_b?: string
          fecha_hora?: string
          estadio?: string | null
          is_unlocked?: boolean
          resultado?: MatchResult
        }
      }
      predictions: {
        Row: {
          id: string
          polla_id: string
          match_id: string
          participant_id: string
          pick: Pick
          is_default: boolean
          submitted_at: string
        }
        Insert: {
          id?: string
          polla_id: string
          match_id: string
          participant_id: string
          pick: Pick
          is_default?: boolean
          submitted_at?: string
        }
        Update: {
          pick?: Pick
          is_default?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      participant_status: ParticipantStatus
      pick_type: Pick
      match_result: MatchResult
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Polla = Database['public']['Tables']['pollas']['Row']
export type PollaParticipant = Database['public']['Tables']['polla_participants']['Row']
export type Jornada = Database['public']['Tables']['jornadas']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
