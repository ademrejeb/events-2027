export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountStatus = "active" | "suspended" | "banned";
export type OrganizerStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "banned";
export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "suspended"
  | "banned";
export type OrganizationType =
  | "club"
  | "ngo"
  | "government"
  | "association"
  | "charity"
  | "individual"
  | "other";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "individual" | "organization" | "government";
          avatar_url: string | null;
          bio: string | null;
          account_status: AccountStatus;
          organizer_status: OrganizerStatus;
          is_admin: boolean;
          suspended_at: string | null;
          status_reason: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role: "individual" | "organization" | "government";
          avatar_url?: string | null;
          bio?: string | null;
          account_status?: AccountStatus;
          organizer_status?: OrganizerStatus;
          is_admin?: boolean;
          suspended_at?: string | null;
          status_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "individual" | "organization" | "government";
          avatar_url?: string | null;
          bio?: string | null;
          account_status?: AccountStatus;
          organizer_status?: OrganizerStatus;
          is_admin?: boolean;
          suspended_at?: string | null;
          status_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["owner_id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          type: OrganizationType;
          description: string | null;
          city: string | null;
          logo_url: string | null;
          verified: boolean;
          status: ApplicationStatus;
          public_email: string | null;
          public_phone: string | null;
          website: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          updated_at: string;
          rib_holder: string | null;
          bank_name: string | null;
          rib: string | null;
          donation_instructions: string | null;
          donation_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          type: OrganizationType;
          description?: string | null;
          city?: string | null;
          logo_url?: string | null;
          verified?: boolean;
          status?: ApplicationStatus;
          public_email?: string | null;
          public_phone?: string | null;
          website?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          updated_at?: string;
          rib_holder?: string | null;
          bank_name?: string | null;
          rib?: string | null;
          donation_instructions?: string | null;
          donation_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          type?: OrganizationType;
          description?: string | null;
          city?: string | null;
          logo_url?: string | null;
          verified?: boolean;
          status?: ApplicationStatus;
          public_email?: string | null;
          public_phone?: string | null;
          website?: string | null;
          facebook_url?: string | null;
          instagram_url?: string | null;
          updated_at?: string;
          rib_holder?: string | null;
          bank_name?: string | null;
          rib?: string | null;
          donation_instructions?: string | null;
          donation_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          org_id: string;
          profile_id: string;
          role_in_org: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          org_id: string;
          profile_id: string;
          role_in_org?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          org_id?: string;
          profile_id?: string;
          role_in_org?: "admin" | "member";
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      event_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          org_id: string;
          category_id: string;
          title: string;
          description: string | null;
          location: string | null;
          city: string | null;
          start_at: string;
          end_at: string | null;
          max_volunteers: number | null;
          status: "draft" | "published" | "cancelled" | "completed";
          image_url: string | null;
          before_images: string[];
          after_images: string[];
          gallery_urls: string[] | null;
          locations: { label?: string; lat: number; lng: number }[];
          lat: number | null;
          lng: number | null;
          search_vector: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          category_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          city?: string | null;
          start_at: string;
          end_at?: string | null;
          max_volunteers?: number | null;
          status?: "draft" | "published" | "cancelled" | "completed";
          image_url?: string | null;
          before_images?: string[];
          after_images?: string[];
          gallery_urls?: string[] | null;
          locations?: { label?: string; lat: number; lng: number }[];
          lat?: number | null;
          lng?: number | null;
          search_vector?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          category_id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          city?: string | null;
          start_at?: string;
          end_at?: string | null;
          max_volunteers?: number | null;
          status?: "draft" | "published" | "cancelled" | "completed";
          image_url?: string | null;
          before_images?: string[];
          after_images?: string[];
          gallery_urls?: string[] | null;
          locations?: { label?: string; lat: number; lng: number }[];
          lat?: number | null;
          lng?: number | null;
          search_vector?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "event_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      volunteers: {
        Row: {
          event_id: string;
          profile_id: string;
          joined_at: string;
        };
        Insert: {
          event_id: string;
          profile_id: string;
          joined_at?: string;
        };
        Update: {
          event_id?: string;
          profile_id?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "volunteers_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volunteers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "event_joined" | "event_created" | "volunteer_joined" | "org_invite";
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "event_joined" | "event_created" | "volunteer_joined" | "org_invite";
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "event_joined" | "event_created" | "volunteer_joined" | "org_invite";
          title?: string;
          body?: string | null;
          link?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_badges: {
        Row: {
          profile_id: string;
          badge_id: string;
          awarded_at: string;
        };
        Insert: {
          profile_id: string;
          badge_id: string;
          awarded_at?: string;
        };
        Update: {
          profile_id?: string;
          badge_id?: string;
          awarded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_badges_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string | null;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          participants_count: number;
          skills: string | null;
          message: string | null;
          status: string;
          email_hash: string | null;
          ip_hash: string | null;
          privacy_accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          profile_id?: string | null;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          participants_count?: number;
          skills?: string | null;
          message?: string | null;
          status?: string;
          email_hash?: string | null;
          ip_hash?: string | null;
          privacy_accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          profile_id?: string | null;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          participants_count?: number;
          skills?: string | null;
          message?: string | null;
          status?: string;
          email_hash?: string | null;
          ip_hash?: string | null;
          privacy_accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      organizer_applications: {
        Row: {
          id: string;
          applicant_id: string | null;
          name: string;
          kind: OrganizationType;
          contact_name: string | null;
          email: string;
          phone: string | null;
          city: string | null;
          description: string | null;
          links: string | null;
          verification_note: string | null;
          status: ApplicationStatus;
          review_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          applicant_id?: string | null;
          name: string;
          kind: OrganizationType;
          contact_name?: string | null;
          email: string;
          phone?: string | null;
          city?: string | null;
          description?: string | null;
          links?: string | null;
          verification_note?: string | null;
          status?: ApplicationStatus;
          review_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          applicant_id?: string | null;
          name?: string;
          kind?: OrganizationType;
          contact_name?: string | null;
          email?: string;
          phone?: string | null;
          city?: string | null;
          description?: string | null;
          links?: string | null;
          verification_note?: string | null;
          status?: ApplicationStatus;
          review_note?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          type: "improvement" | "bug" | "data" | "other";
          subject: string;
          message: string;
          contact_email: string | null;
          user_id: string | null;
          status: "open" | "in_review" | "resolved" | "dismissed";
          admin_note: string | null;
          ip_hash: string | null;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          type?: "improvement" | "bug" | "data" | "other";
          subject: string;
          message: string;
          contact_email?: string | null;
          user_id?: string | null;
          status?: "open" | "in_review" | "resolved" | "dismissed";
          admin_note?: string | null;
          ip_hash?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          type?: "improvement" | "bug" | "data" | "other";
          subject?: string;
          message?: string;
          contact_email?: string | null;
          user_id?: string | null;
          status?: "open" | "in_review" | "resolved" | "dismissed";
          admin_note?: string | null;
          ip_hash?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [];
      };
      organization_social_accounts: {
        Row: {
          id: string;
          org_id: string;
          platform: "facebook" | "instagram";
          account_id: string;
          account_name: string | null;
          access_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          platform: "facebook" | "instagram";
          account_id: string;
          account_name?: string | null;
          access_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          platform?: "facebook" | "instagram";
          account_id?: string;
          account_name?: string | null;
          access_token?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_social_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      social_posts: {
        Row: {
          id: string;
          org_id: string;
          author_id: string | null;
          caption: string | null;
          image_url: string | null;
          link_url: string | null;
          platforms: string[];
          results: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          author_id?: string | null;
          caption?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          platforms?: string[];
          results?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          author_id?: string | null;
          caption?: string | null;
          image_url?: string | null;
          link_url?: string | null;
          platforms?: string[];
          results?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_posts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      nearby_events: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_km?: number;
          p_limit?: number;
        };
        Returns: {
          id: string;
          title: string;
          description: string | null;
          city: string | null;
          location: string | null;
          start_at: string;
          image_url: string | null;
          distance_km: number;
        }[];
      };
      refresh_stats: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: "individual" | "organization" | "government";
      organization_type: OrganizationType;
      org_member_role: "admin" | "member";
      event_status: "draft" | "published" | "cancelled" | "completed";
      notification_type: "event_joined" | "event_created" | "volunteer_joined" | "org_invite";
      account_status: AccountStatus;
      organizer_status: OrganizerStatus;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
