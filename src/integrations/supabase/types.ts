export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_snapshots: {
        Row: {
          created_at: string;
          data: Json;
          owner_id: string;
          sequence: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data: Json;
          owner_id: string;
          sequence?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          owner_id?: string;
          sequence?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      astoreka_records: {
        Row: {
          created_at: string;
          data: Json;
          entity: string;
          owner_id: string;
          record_id: string;
          record_key: string;
          sync_token: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data: Json;
          entity: string;
          owner_id: string;
          record_id: string;
          record_key?: never;
          sync_token: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          data?: Json;
          entity?: string;
          owner_id?: string;
          record_id?: string;
          record_key?: never;
          sync_token?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          address: string | null;
          brand: string | null;
          category: string;
          client_id: string;
          created_at: string;
          id: string;
          installation_date: string | null;
          location: string | null;
          model: string | null;
          name: string;
          notes: string | null;
          owner_id: string;
          photo_url: string | null;
          serial: string | null;
          status: string;
          updated_at: string;
          warranty_until: string | null;
        };
        Insert: {
          address?: string | null;
          brand?: string | null;
          category: string;
          client_id: string;
          created_at?: string;
          id?: string;
          installation_date?: string | null;
          location?: string | null;
          model?: string | null;
          name: string;
          notes?: string | null;
          owner_id: string;
          photo_url?: string | null;
          serial?: string | null;
          status?: string;
          updated_at?: string;
          warranty_until?: string | null;
        };
        Update: {
          address?: string | null;
          brand?: string | null;
          category?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          installation_date?: string | null;
          location?: string | null;
          model?: string | null;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          photo_url?: string | null;
          serial?: string | null;
          status?: string;
          updated_at?: string;
          warranty_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assets_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          owner_id: string;
          pending_balance: number;
          phone: string | null;
          tags: string[];
          type: string;
          updated_at: string;
          zone: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          owner_id: string;
          pending_balance?: number;
          phone?: string | null;
          tags?: string[];
          type?: string;
          updated_at?: string;
          zone?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          pending_balance?: number;
          phone?: string | null;
          tags?: string[];
          type?: string;
          updated_at?: string;
          zone?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          created_at: string;
          id: string;
          invoice_number: string | null;
          issued_at: string | null;
          job_id: string | null;
          method: string;
          notes: string | null;
          owner_id: string;
          paid_at: string | null;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
          vat: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string | null;
          job_id?: string | null;
          method?: string;
          notes?: string | null;
          owner_id: string;
          paid_at?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          vat?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string | null;
          job_id?: string | null;
          method?: string;
          notes?: string | null;
          owner_id?: string;
          paid_at?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          vat?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_events: {
        Row: {
          created_at: string;
          event_type: string;
          from_status: string | null;
          id: string;
          job_id: string;
          note: string | null;
          owner_id: string;
          to_status: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          from_status?: string | null;
          id?: string;
          job_id: string;
          note?: string | null;
          owner_id: string;
          to_status?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          from_status?: string | null;
          id?: string;
          job_id?: string;
          note?: string | null;
          owner_id?: string;
          to_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_materials: {
        Row: {
          cost_total: number;
          created_at: string;
          id: string;
          job_id: string;
          kind: string;
          material_id: string | null;
          name: string;
          owner_id: string;
          qty: number;
          sale_price: number;
          sale_total: number;
          unit_cost: number;
        };
        Insert: {
          cost_total?: number;
          created_at?: string;
          id?: string;
          job_id: string;
          kind?: string;
          material_id?: string | null;
          name: string;
          owner_id: string;
          qty?: number;
          sale_price?: number;
          sale_total?: number;
          unit_cost?: number;
        };
        Update: {
          cost_total?: number;
          created_at?: string;
          id?: string;
          job_id?: string;
          kind?: string;
          material_id?: string | null;
          name?: string;
          owner_id?: string;
          qty?: number;
          sale_price?: number;
          sale_total?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "job_materials_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          actual_material_cost: number;
          actual_material_notes: string | null;
          asset_id: string | null;
          call_out: number;
          client_id: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          diagnosis: string | null;
          distance_km: number;
          estimated_hours: number;
          final_total: number;
          gross_margin: number;
          id: string;
          km_cost: number;
          labor: number;
          lessons: string | null;
          materials_cost: number;
          materials_sale: number;
          notes_client: string | null;
          notes_internal: string | null;
          origin: string;
          owner_id: string;
          priority: string;
          quoted_total: number;
          real_hours: number;
          scheduled_at: string | null;
          service_id: string | null;
          solution: string | null;
          status: string;
          subtotal: number;
          symptoms: string | null;
          technician: string | null;
          total: number;
          type: string | null;
          updated_at: string;
          urgent: boolean;
          vat: number;
          warranty_until: string | null;
        };
        Insert: {
          actual_material_cost?: number;
          actual_material_notes?: string | null;
          asset_id?: string | null;
          call_out?: number;
          client_id?: string | null;
          code: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          diagnosis?: string | null;
          distance_km?: number;
          estimated_hours?: number;
          final_total?: number;
          gross_margin?: number;
          id?: string;
          km_cost?: number;
          labor?: number;
          lessons?: string | null;
          materials_cost?: number;
          materials_sale?: number;
          notes_client?: string | null;
          notes_internal?: string | null;
          origin?: string;
          owner_id: string;
          priority?: string;
          quoted_total?: number;
          real_hours?: number;
          scheduled_at?: string | null;
          service_id?: string | null;
          solution?: string | null;
          status?: string;
          subtotal?: number;
          symptoms?: string | null;
          technician?: string | null;
          total?: number;
          type?: string | null;
          updated_at?: string;
          urgent?: boolean;
          vat?: number;
          warranty_until?: string | null;
        };
        Update: {
          actual_material_cost?: number;
          actual_material_notes?: string | null;
          asset_id?: string | null;
          call_out?: number;
          client_id?: string | null;
          code?: string;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          diagnosis?: string | null;
          distance_km?: number;
          estimated_hours?: number;
          final_total?: number;
          gross_margin?: number;
          id?: string;
          km_cost?: number;
          labor?: number;
          lessons?: string | null;
          materials_cost?: number;
          materials_sale?: number;
          notes_client?: string | null;
          notes_internal?: string | null;
          origin?: string;
          owner_id?: string;
          priority?: string;
          quoted_total?: number;
          real_hours?: number;
          scheduled_at?: string | null;
          service_id?: string | null;
          solution?: string | null;
          status?: string;
          subtotal?: number;
          symptoms?: string | null;
          technician?: string | null;
          total?: number;
          type?: string | null;
          updated_at?: string;
          urgent?: boolean;
          vat?: number;
          warranty_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_base: {
        Row: {
          brand: string | null;
          category: string | null;
          confidence: string | null;
          created_at: string;
          id: string;
          model: string | null;
          notes: string | null;
          owner_id: string;
          parts_used: string | null;
          probable_cause: string | null;
          solution: string | null;
          source_job_id: string | null;
          symptom: string | null;
          updated_at: string;
        };
        Insert: {
          brand?: string | null;
          category?: string | null;
          confidence?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          notes?: string | null;
          owner_id: string;
          parts_used?: string | null;
          probable_cause?: string | null;
          solution?: string | null;
          source_job_id?: string | null;
          symptom?: string | null;
          updated_at?: string;
        };
        Update: {
          brand?: string | null;
          category?: string | null;
          confidence?: string | null;
          created_at?: string;
          id?: string;
          model?: string | null;
          notes?: string | null;
          owner_id?: string;
          parts_used?: string | null;
          probable_cause?: string | null;
          solution?: string | null;
          source_job_id?: string | null;
          symptom?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_base_source_job_id_fkey";
            columns: ["source_job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          asset_id: string | null;
          bucket: string;
          caption: string | null;
          created_at: string;
          id: string;
          job_id: string | null;
          owner_id: string;
          path: string;
        };
        Insert: {
          asset_id?: string | null;
          bucket?: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          owner_id: string;
          path: string;
        };
        Update: {
          asset_id?: string | null;
          bucket?: string;
          caption?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string | null;
          owner_id?: string;
          path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          company_name: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "oficina" | "tecnico" | "solo_lectura";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "oficina", "tecnico", "solo_lectura"],
    },
  },
} as const;
