export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      aceptaciones: {
        Row: {
          fecha: string
          id: string
          usuario_id: string
          version: string
        }
        Insert: {
          fecha?: string
          id: string
          usuario_id: string
          version: string
        }
        Update: {
          fecha?: string
          id?: string
          usuario_id?: string
          version?: string
        }
        Relationships: []
      }
      bitacora: {
        Row: {
          accion: string
          actor: string
          detalle: string
          fecha: string
          id: string
        }
        Insert: {
          accion?: string
          actor?: string
          detalle?: string
          fecha?: string
          id: string
        }
        Update: {
          accion?: string
          actor?: string
          detalle?: string
          fecha?: string
          id?: string
        }
        Relationships: []
      }
      catalogos: {
        Row: {
          id: string
          tipo: string
          valor: string
        }
        Insert: {
          id: string
          tipo: string
          valor: string
        }
        Update: {
          id?: string
          tipo?: string
          valor?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          id: number
          tope_sin_comprobante: number
          version_reglas: string
        }
        Insert: {
          id?: number
          tope_sin_comprobante?: number
          version_reglas?: string
        }
        Update: {
          id?: number
          tope_sin_comprobante?: number
          version_reglas?: string
        }
        Relationships: []
      }
      delegaciones: {
        Row: {
          de_id: string | null
          estatus: string
          fecha_fin: string
          fecha_inicio: string
          folio: string
          motivo: string
          para_id: string | null
        }
        Insert: {
          de_id?: string | null
          estatus?: string
          fecha_fin: string
          fecha_inicio: string
          folio: string
          motivo?: string
          para_id?: string | null
        }
        Update: {
          de_id?: string | null
          estatus?: string
          fecha_fin?: string
          fecha_inicio?: string
          folio?: string
          motivo?: string
          para_id?: string | null
        }
        Relationships: []
      }
      eventos: {
        Row: {
          clave: string
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          sede: string
        }
        Insert: {
          clave?: string
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id: string
          nombre: string
          sede?: string
        }
        Update: {
          clave?: string
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          sede?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          archivos: Json
          comisionado_id: string | null
          creado_en: string
          destino_ciudad: string
          destino_pais: string
          dictaminador_id: string | null
          escalas: Json
          estatus: string
          evento_id: string
          folio_delegacion: string | null
          ia_extraccion: Json
          id: string
          justificacion: string
          moneda: string
          monto: number
          monto_mxn: number
          motivo_rechazo: string | null
          observaciones: string
          origen_ciudad: string
          origen_pais: string
          participantes_ids: string[]
          proveedor: string
          revisor_id: string | null
          rubro: string
          sin_cfdi: boolean
          tipo_cambio: number
        }
        Insert: {
          archivos?: Json
          comisionado_id?: string | null
          creado_en?: string
          destino_ciudad?: string
          destino_pais?: string
          dictaminador_id?: string | null
          escalas?: Json
          estatus?: string
          evento_id: string
          folio_delegacion?: string | null
          ia_extraccion?: Json
          id: string
          justificacion?: string
          moneda?: string
          monto?: number
          monto_mxn?: number
          motivo_rechazo?: string | null
          observaciones?: string
          origen_ciudad?: string
          origen_pais?: string
          participantes_ids?: string[]
          proveedor?: string
          revisor_id?: string | null
          rubro: string
          sin_cfdi?: boolean
          tipo_cambio?: number
        }
        Update: {
          archivos?: Json
          comisionado_id?: string | null
          creado_en?: string
          destino_ciudad?: string
          destino_pais?: string
          dictaminador_id?: string | null
          escalas?: Json
          estatus?: string
          evento_id?: string
          folio_delegacion?: string | null
          ia_extraccion?: Json
          id?: string
          justificacion?: string
          moneda?: string
          monto?: number
          monto_mxn?: number
          motivo_rechazo?: string | null
          observaciones?: string
          origen_ciudad?: string
          origen_pais?: string
          participantes_ids?: string[]
          proveedor?: string
          revisor_id?: string | null
          rubro?: string
          sin_cfdi?: boolean
          tipo_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "gastos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes: {
        Row: {
          evento_id: string
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          evento_id: string
          id: string
          nombre: string
          tipo?: string
        }
        Update: {
          evento_id?: string
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          evento_id: string
          id: string
          monto: number
          responsable_id: string | null
          rubro: string
        }
        Insert: {
          evento_id: string
          id: string
          monto?: number
          responsable_id?: string | null
          rubro: string
        }
        Update: {
          evento_id?: string
          id?: string
          monto?: number
          responsable_id?: string | null
          rubro?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          creado_en: string
          email: string
          estatus: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          email?: string
          estatus?: string
          id: string
          nombre?: string
        }
        Update: {
          creado_en?: string
          email?: string
          estatus?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_contralor: { Args: never; Returns: boolean }
      esta_aprobado: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tiene_delegacion_vigente: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "Contralor" | "Revisor" | "Director" | "Comisionado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Contralor", "Revisor", "Director", "Comisionado"],
    },
  },
} as const
