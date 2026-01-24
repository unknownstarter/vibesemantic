export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      csv_datasets: {
        Row: {
          id: string
          project_id: string
          name: string
          status: Database["public"]["Enums"]["csv_dataset_status"]
          mapping_id: string | null
          created_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          status?: Database["public"]["Enums"]["csv_dataset_status"]
          mapping_id?: string | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          status?: Database["public"]["Enums"]["csv_dataset_status"]
          mapping_id?: string | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csv_datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_datasets_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "source_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_files: {
        Row: {
          id: string
          project_id: string
          dataset_id: string
          original_filename: string
          storage_path: string
          file_size_bytes: number | null
          row_count: number | null
          column_count: number | null
          headers: Json
          sample_rows: Json
          sheet_name: string | null
          status: Database["public"]["Enums"]["csv_file_status"]
          is_active: boolean
          uploaded_by: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          dataset_id: string
          original_filename: string
          storage_path: string
          file_size_bytes?: number | null
          row_count?: number | null
          column_count?: number | null
          headers?: Json
          sample_rows?: Json
          sheet_name?: string | null
          status?: Database["public"]["Enums"]["csv_file_status"]
          is_active?: boolean
          uploaded_by: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          dataset_id?: string
          original_filename?: string
          storage_path?: string
          file_size_bytes?: number | null
          row_count?: number | null
          column_count?: number | null
          headers?: Json
          sample_rows?: Json
          sheet_name?: string | null
          status?: Database["public"]["Enums"]["csv_file_status"]
          is_active?: boolean
          uploaded_by?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csv_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_files_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "csv_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      source_mappings: {
        Row: {
          id: string
          project_id: string
          status: Database["public"]["Enums"]["source_mapping_status"]
          date_column: string | null
          metric_columns: Json
          dimension_columns: Json
          aggregation_rules: Json
          llm_questions: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["source_mapping_status"]
          date_column?: string | null
          metric_columns?: Json
          dimension_columns?: Json
          aggregation_rules?: Json
          llm_questions?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["source_mapping_status"]
          date_column?: string | null
          metric_columns?: Json
          dimension_columns?: Json
          aggregation_rules?: Json
          llm_questions?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_csv_daily_metrics: {
        Row: {
          id: string
          project_id: string
          dataset_id: string
          date: string
          metric_name: string
          metric_value: number | null
          dimension_key: string | null
          dimension_value: string | null
          dimensions: Record<string, string> | null
          raw_data: Record<string, unknown> | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          dataset_id: string
          date: string
          metric_name: string
          metric_value?: number | null
          dimension_key?: string | null
          dimension_value?: string | null
          dimensions?: Record<string, string> | null
          raw_data?: Record<string, unknown> | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          dataset_id?: string
          date?: string
          metric_name?: string
          metric_value?: number | null
          dimension_key?: string | null
          dimension_value?: string | null
          dimensions?: Record<string, string> | null
          raw_data?: Record<string, unknown> | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_csv_daily_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mart_csv_daily_metrics_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "csv_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_ga4_metrics: {
        Row: {
          id: string
          project_id: string
          date: string
          metric_name: string
          metric_value: number | null
          dimensions: Record<string, string> | null
          source_report: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          date: string
          metric_name: string
          metric_value?: number | null
          dimensions?: Record<string, string> | null
          source_report?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          date?: string
          metric_name?: string
          metric_value?: number | null
          dimensions?: Record<string, string> | null
          source_report?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_ga4_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_threads: {
        Row: {
          created_at: string | null
          id: string
          last_range: Database["public"]["Enums"]["report_range"] | null
          last_snapshot_at: string | null
          thread_id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_range?: Database["public"]["Enums"]["report_range"] | null
          last_snapshot_at?: string | null
          thread_id: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_range?: Database["public"]["Enums"]["report_range"] | null
          last_snapshot_at?: string | null
          thread_id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          data_accessed: string[] | null
          id: string
          ip_address: unknown
          llm_payload_summary: Json | null
          project_id: string | null
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          data_accessed?: string[] | null
          id?: string
          ip_address?: unknown
          llm_payload_summary?: Json | null
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          data_accessed?: string[] | null
          id?: string
          ip_address?: unknown
          llm_payload_summary?: Json | null
          project_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["chat_role"]
          thread_id: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["chat_role"]
          thread_id: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["chat_role"]
          thread_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_connections: {
        Row: {
          access_token_enc: string
          created_at: string | null
          google_user_email: string
          id: string
          project_id: string
          refresh_token_enc: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token_enc: string
          created_at?: string | null
          google_user_email: string
          id?: string
          project_id: string
          refresh_token_enc: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token_enc?: string
          created_at?: string | null
          google_user_email?: string
          id?: string
          project_id?: string
          refresh_token_enc?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ga4_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_properties: {
        Row: {
          created_at: string | null
          id: string
          is_selected: boolean | null
          project_id: string
          property_id: string
          property_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_selected?: boolean | null
          project_id: string
          property_id: string
          property_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_selected?: boolean | null
          project_id?: string
          property_id?: string
          property_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga4_properties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_ga4_channel_daily: {
        Row: {
          active_users: number | null
          channel_group: string
          created_at: string | null
          date: string
          engaged_sessions: number | null
          id: string
          new_users: number | null
          project_id: string
          sessions: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          channel_group: string
          created_at?: string | null
          date: string
          engaged_sessions?: number | null
          id?: string
          new_users?: number | null
          project_id: string
          sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          channel_group?: string
          created_at?: string | null
          date?: string
          engaged_sessions?: number | null
          id?: string
          new_users?: number | null
          project_id?: string
          sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_ga4_channel_daily_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_ga4_daily_kpis: {
        Row: {
          active_users: number | null
          avg_session_duration: number | null
          bounce_rate: number | null
          created_at: string | null
          date: string
          engaged_sessions: number | null
          engagement_rate: number | null
          id: string
          new_users: number | null
          project_id: string
          sessions: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date: string
          engaged_sessions?: number | null
          engagement_rate?: number | null
          id?: string
          new_users?: number | null
          project_id: string
          sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string | null
          date?: string
          engaged_sessions?: number | null
          engagement_rate?: number | null
          id?: string
          new_users?: number | null
          project_id?: string
          sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_ga4_daily_kpis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mart_ga4_top_pages_daily: {
        Row: {
          active_users: number | null
          created_at: string | null
          date: string
          engagement_rate: number | null
          id: string
          page_path: string
          page_title: string | null
          project_id: string
          screen_page_views: number | null
          sessions: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          date: string
          engagement_rate?: number | null
          id?: string
          page_path: string
          page_title?: string | null
          project_id: string
          screen_page_views?: number | null
          sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          date?: string
          engagement_rate?: number | null
          id?: string
          page_path?: string
          page_title?: string | null
          project_id?: string
          screen_page_views?: number | null
          sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mart_ga4_top_pages_daily_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string
          data_refreshed_at: string | null
          id: string
          name: string
          profile: Json | null
          setup_status:
            | Database["public"]["Enums"]["project_setup_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          data_refreshed_at?: string | null
          id?: string
          name: string
          profile?: Json | null
          setup_status?:
            | Database["public"]["Enums"]["project_setup_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          data_refreshed_at?: string | null
          id?: string
          name?: string
          profile?: Json | null
          setup_status?:
            | Database["public"]["Enums"]["project_setup_status"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          range: Database["public"]["Enums"]["report_range"]
          report_markdown: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          range: Database["public"]["Enums"]["report_range"]
          report_markdown: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          range?: Database["public"]["Enums"]["report_range"]
          report_markdown?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          agent_config: Json | null
          created_at: string | null
          id: string
          name: string
          project_id: string
          purpose: Database["public"]["Enums"]["workspace_purpose"]
          status: Database["public"]["Enums"]["workspace_status"]
          updated_at: string | null
        }
        Insert: {
          agent_config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          purpose?: Database["public"]["Enums"]["workspace_purpose"]
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string | null
        }
        Update: {
          agent_config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          purpose?: Database["public"]["Enums"]["workspace_purpose"]
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_workspace_project_id: {
        Args: { w_id: string }
        Returns: string
      }
      is_project_member: { Args: { p_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_id: string }; Returns: boolean }
    }
    Enums: {
      chat_role: "user" | "assistant"
      csv_dataset_status: "draft" | "probing" | "confirmed" | "ingested" | "error"
      csv_file_status: "uploaded" | "processing" | "ready" | "error"
      member_role: "owner" | "member"
      member_status: "active" | "invited" | "suspended"
      project_setup_status: "draft" | "profile_ready" | "ga4_ready" | "ready"
      report_range: "7d" | "30d"
      source_mapping_status: "draft" | "confirmed"
      workspace_purpose: "product" | "marketing" | "biz" | "sales"
      workspace_status: "draft" | "ready" | "error"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Convenience exports
export type Project = Tables<'projects'>
export type ProjectMember = Tables<'project_members'>
export type Workspace = Tables<'workspaces'>
export type GA4Connection = Tables<'ga4_connections'>
export type GA4Property = Tables<'ga4_properties'>
export type ChatMessage = Tables<'chat_messages'>
export type Report = Tables<'reports'>
export type AnalysisThread = Tables<'analysis_threads'>
export type AuditLog = Tables<'audit_logs'>
export type MartDailyKPIs = Tables<'mart_ga4_daily_kpis'>
export type MartChannelDaily = Tables<'mart_ga4_channel_daily'>
export type MartTopPagesDaily = Tables<'mart_ga4_top_pages_daily'>

// CSV-related types
export type CsvDataset = Tables<'csv_datasets'>
export type CsvFile = Tables<'csv_files'>
export type SourceMapping = Tables<'source_mappings'>
export type MartCsvDailyMetrics = Tables<'mart_csv_daily_metrics'>

export type ProjectSetupStatus = Enums<'project_setup_status'>
export type WorkspaceStatus = Enums<'workspace_status'>
export type WorkspacePurpose = Enums<'workspace_purpose'>
export type MemberRole = Enums<'member_role'>
export type MemberStatus = Enums<'member_status'>
export type ChatRole = Enums<'chat_role'>
export type ReportRange = Enums<'report_range'>
export type CsvDatasetStatus = Enums<'csv_dataset_status'>
export type CsvFileStatus = Enums<'csv_file_status'>
export type SourceMappingStatus = Enums<'source_mapping_status'>

// Project profile schema
export interface ProjectProfile {
  serviceName?: string
  serviceDescription?: string
  targetAudience?: string
  industry?: string
  goals?: string[]
  kpis?: string[]
}

// Agent config schema
export interface AgentConfig {
  focusAreas?: string[]
  customInstructions?: string
  language?: 'ko' | 'en'
}

// Project with role (for dashboard)
export interface ProjectWithRole extends Project {
  role: MemberRole
}

// Source Mapping Schema interfaces
export interface MetricColumn {
  name: string
  displayName?: string
  type: 'number' | 'currency' | 'percentage'
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface DimensionColumn {
  name: string
  displayName?: string
  type: 'string' | 'date' | 'category'
}

export interface SourceMappingConfig {
  dateColumn: string | null
  metricColumns: MetricColumn[]
  dimensionColumns: DimensionColumn[]
  aggregationRules: Record<string, string>
}

export interface QuickReply {
  label: string
  value: string
  action?: 'set_date_column' | 'add_metric' | 'add_dimension' | 'remove_metric' | 'remove_dimension' | string
}

export interface LLMQuestion {
  id: string
  question: string
  quickReplies: QuickReply[]
}
