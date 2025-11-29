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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          is_hidden: boolean | null
          name: string
          tier: string
          xp_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id?: string
          is_hidden?: boolean | null
          name: string
          tier: string
          xp_reward: number
        }
        Update: {
          category?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean | null
          name?: string
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_at: string | null
          banned_by: string
          email: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_by: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_by?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_recurring: boolean | null
          parent_event_id: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          parent_event_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      group_achievement_unlocks: {
        Row: {
          achievement_id: string
          group_id: string
          id: string
          unlocked_at: string | null
        }
        Insert: {
          achievement_id: string
          group_id: string
          id?: string
          unlocked_at?: string | null
        }
        Update: {
          achievement_id?: string
          group_id?: string
          id?: string
          unlocked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_achievement_unlocks_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "group_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_achievement_unlocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_achievements: {
        Row: {
          achievement_key: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Insert: {
          achievement_key: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Update: {
          achievement_key?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
        }
        Relationships: []
      }
      group_challenge_completions: {
        Row: {
          challenge_type: string
          completed_date: string
          created_at: string | null
          goal_hours: number
          group_id: string
          hours_achieved: number
          id: string
        }
        Insert: {
          challenge_type: string
          completed_date: string
          created_at?: string | null
          goal_hours: number
          group_id: string
          hours_achieved: number
          id?: string
        }
        Update: {
          challenge_type?: string
          completed_date?: string
          created_at?: string | null
          goal_hours?: number
          group_id?: string
          hours_achieved?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_challenge_completions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_challenges: {
        Row: {
          created_at: string | null
          daily_hours_goal: number
          group_id: string
          id: string
          monthly_hours_goal: number | null
          updated_at: string | null
          weekly_hours_goal: number | null
        }
        Insert: {
          created_at?: string | null
          daily_hours_goal?: number
          group_id: string
          id?: string
          monthly_hours_goal?: number | null
          updated_at?: string | null
          weekly_hours_goal?: number | null
        }
        Update: {
          created_at?: string | null
          daily_hours_goal?: number
          group_id?: string
          id?: string
          monthly_hours_goal?: number | null
          updated_at?: string | null
          weekly_hours_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          last_active: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          last_active?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          last_active?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_pinned: boolean | null
          message: string
          message_type: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_pinned?: boolean | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_pinned?: boolean | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_resources: {
        Row: {
          created_at: string
          description: string | null
          file_path: string | null
          group_id: string
          id: string
          likes_count: number | null
          resource_type: string
          title: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          group_id: string
          id?: string
          likes_count?: number | null
          resource_type: string
          title: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          group_id?: string
          id?: string
          likes_count?: number | null
          resource_type?: string
          title?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      homeworks: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string
          duration: number | null
          id: string
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date: string
          duration?: number | null
          id?: string
          subject: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string
          duration?: number | null
          id?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_grants: {
        Row: {
          created_at: string
          expires_at: string
          grant_type: string
          id: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          grant_type?: string
          id?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          grant_type?: string
          id?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          level: number | null
          title: string | null
          total_xp: number | null
          updated_at: string | null
          xp_to_next_level: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          level?: number | null
          title?: string | null
          total_xp?: number | null
          updated_at?: string | null
          xp_to_next_level?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          level?: number | null
          title?: string | null
          total_xp?: number | null
          updated_at?: string | null
          xp_to_next_level?: number | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          referral_code_id: string
          referred_user_id: string
          validation_reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          referral_code_id: string
          referred_user_id: string
          validation_reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          referral_code_id?: string
          referred_user_id?: string
          validation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_analytics: {
        Row: {
          average_focus_score: number | null
          created_at: string
          date: string
          id: string
          sessions_completed: number
          sessions_skipped: number
          subjects_studied: Json | null
          total_actual_minutes: number
          total_planned_minutes: number
          user_id: string
        }
        Insert: {
          average_focus_score?: number | null
          created_at?: string
          date: string
          id?: string
          sessions_completed?: number
          sessions_skipped?: number
          subjects_studied?: Json | null
          total_actual_minutes?: number
          total_planned_minutes?: number
          user_id: string
        }
        Update: {
          average_focus_score?: number | null
          created_at?: string
          date?: string
          id?: string
          sessions_completed?: number
          sessions_skipped?: number
          subjects_studied?: Json | null
          total_actual_minutes?: number
          total_planned_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      session_resources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          session_id: string
          subject: string | null
          timetable_id: string
          title: string
          topic: string | null
          type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          session_id: string
          subject?: string | null
          timetable_id: string
          title: string
          topic?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          session_id?: string
          subject?: string | null
          timetable_id?: string
          title?: string
          topic?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_resources_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_timetables: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          is_public: boolean | null
          shared_by: string
          timetable_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          shared_by: string
          timetable_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          shared_by?: string
          timetable_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_timetables_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_timetables_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          join_code: string | null
          max_members: number | null
          name: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          join_code?: string | null
          max_members?: number | null
          name: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          join_code?: string | null
          max_members?: number | null
          name?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      study_insights: {
        Row: {
          created_at: string
          id: string
          insights_data: Json
          timetable_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insights_data?: Json
          timetable_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insights_data?: Json
          timetable_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_insights_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      study_preferences: {
        Row: {
          before_school_end: string | null
          before_school_start: string | null
          break_duration: number | null
          created_at: string | null
          daily_study_hours: number | null
          day_time_slots: Json | null
          id: string
          lunch_end: string | null
          lunch_start: string | null
          preferred_end_time: string | null
          preferred_start_time: string | null
          school_end_time: string | null
          school_start_time: string | null
          session_duration: number | null
          study_before_school: boolean | null
          study_days: Json | null
          study_during_free_periods: boolean | null
          study_during_lunch: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          before_school_end?: string | null
          before_school_start?: string | null
          break_duration?: number | null
          created_at?: string | null
          daily_study_hours?: number | null
          day_time_slots?: Json | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          school_end_time?: string | null
          school_start_time?: string | null
          session_duration?: number | null
          study_before_school?: boolean | null
          study_days?: Json | null
          study_during_free_periods?: boolean | null
          study_during_lunch?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          before_school_end?: string | null
          before_school_start?: string | null
          break_duration?: number | null
          created_at?: string | null
          daily_study_hours?: number | null
          day_time_slots?: Json | null
          id?: string
          lunch_end?: string | null
          lunch_start?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          school_end_time?: string | null
          school_start_time?: string | null
          session_duration?: number | null
          study_before_school?: boolean | null
          study_days?: Json | null
          study_during_free_periods?: boolean | null
          study_during_lunch?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_duration_minutes: number | null
          actual_end: string | null
          actual_start: string | null
          created_at: string
          focus_score: number | null
          id: string
          notes: string | null
          pause_time: number | null
          planned_duration_minutes: number
          planned_end: string
          planned_start: string
          session_type: string
          status: string
          subject: string
          timetable_id: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          focus_score?: number | null
          id?: string
          notes?: string | null
          pause_time?: number | null
          planned_duration_minutes: number
          planned_end: string
          planned_start: string
          session_type: string
          status?: string
          subject: string
          timetable_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_duration_minutes?: number | null
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          focus_score?: number | null
          id?: string
          notes?: string | null
          pause_time?: number | null
          planned_duration_minutes?: number
          planned_end?: string
          planned_start?: string
          session_type?: string
          status?: string
          subject?: string
          timetable_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          created_at: string
          date: string
          id: string
          minutes_studied: number
          sessions_completed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          minutes_studied?: number
          sessions_completed?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          minutes_studied?: number
          sessions_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string | null
          exam_board: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exam_board?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exam_board?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      test_dates: {
        Row: {
          created_at: string | null
          id: string
          subject_id: string
          test_date: string
          test_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          subject_id: string
          test_date: string
          test_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          subject_id?: string
          test_date?: string
          test_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_dates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scores: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          marks_obtained: number
          percentage: number
          questions_correct: Json
          questions_incorrect: Json
          recommendations: string[] | null
          strengths: string[] | null
          subject: string
          test_date: string
          test_date_id: string
          test_type: string
          total_marks: number
          updated_at: string
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          marks_obtained: number
          percentage: number
          questions_correct?: Json
          questions_incorrect?: Json
          recommendations?: string[] | null
          strengths?: string[] | null
          subject: string
          test_date: string
          test_date_id: string
          test_type: string
          total_marks: number
          updated_at?: string
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          marks_obtained?: number
          percentage?: number
          questions_correct?: Json
          questions_incorrect?: Json
          recommendations?: string[] | null
          strengths?: string[] | null
          subject?: string
          test_date?: string
          test_date_id?: string
          test_type?: string
          total_marks?: number
          updated_at?: string
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "test_scores_test_date_id_fkey"
            columns: ["test_date_id"]
            isOneToOne: false
            referencedRelation: "test_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_history: {
        Row: {
          change_description: string | null
          created_at: string
          end_date: string
          id: string
          name: string
          preferences: Json | null
          schedule: Json
          start_date: string
          subjects: Json | null
          test_dates: Json | null
          timetable_id: string
          topics: Json | null
          user_id: string
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          end_date: string
          id?: string
          name: string
          preferences?: Json | null
          schedule: Json
          start_date: string
          subjects?: Json | null
          test_dates?: Json | null
          timetable_id: string
          topics?: Json | null
          user_id: string
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          preferences?: Json | null
          schedule?: Json
          start_date?: string
          subjects?: Json | null
          test_dates?: Json | null
          timetable_id?: string
          topics?: Json | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_history_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          preferences: Json | null
          schedule: Json
          start_date: string
          subjects: Json | null
          test_dates: Json | null
          topics: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          preferences?: Json | null
          schedule: Json
          start_date: string
          subjects?: Json | null
          test_dates?: Json | null
          topics?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          preferences?: Json | null
          schedule?: Json
          start_date?: string
          subjects?: Json | null
          test_dates?: Json | null
          topics?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      topic_progress: {
        Row: {
          created_at: string
          id: string
          last_reviewed_at: string | null
          mastery_level: string
          next_review_date: string | null
          progress_percentage: number
          subject_id: string
          successful_sessions_count: number
          topic_id: string
          total_sessions_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: string
          next_review_date?: string | null
          progress_percentage?: number
          subject_id: string
          successful_sessions_count?: number
          topic_id: string
          total_sessions_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          mastery_level?: string
          next_review_date?: string | null
          progress_percentage?: number
          subject_id?: string
          successful_sessions_count?: number
          topic_id?: string
          total_sessions_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topic_reflections: {
        Row: {
          created_at: string
          id: string
          reflection_data: Json
          session_date: string
          session_index: number
          subject: string
          timetable_id: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reflection_data?: Json
          session_date: string
          session_index: number
          subject: string
          timetable_id: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reflection_data?: Json
          session_date?: string
          session_index?: number
          subject?: string
          timetable_id?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_reflections_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          ai_insights_generations: number
          created_at: string | null
          daily_insights_used: boolean
          id: string
          last_reset_date: string
          timetable_creations: number
          timetable_regenerations: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_insights_generations?: number
          created_at?: string | null
          daily_insights_used?: boolean
          id?: string
          last_reset_date?: string
          timetable_creations?: number
          timetable_regenerations?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_insights_generations?: number
          created_at?: string | null
          daily_insights_used?: boolean
          id?: string
          last_reset_date?: string
          timetable_creations?: number
          timetable_regenerations?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          is_new: boolean | null
          progress: number | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          is_new?: boolean | null
          progress?: number | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          is_new?: boolean | null
          progress?: number | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          created_at: string
          current_hours: number
          id: string
          target_hours: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          current_hours?: number
          id?: string
          target_hours: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          current_hours?: number
          id?: string
          target_hours?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_timetable: { Args: { _user_id: string }; Returns: boolean }
      can_generate_ai_insights: { Args: { _user_id: string }; Returns: boolean }
      can_regenerate_timetable: { Args: { _user_id: string }; Returns: boolean }
      can_use_daily_insights: { Args: { _user_id: string }; Returns: boolean }
      check_and_grant_referral_premium: {
        Args: { _user_id: string }
        Returns: boolean
      }
      cleanup_expired_verifications: { Args: never; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      get_referral_rewards_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_premium_grant: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage: {
        Args: { _action: string; _user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      reset_daily_limits: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "paid" | "free"
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
      app_role: ["paid", "free"],
    },
  },
} as const
