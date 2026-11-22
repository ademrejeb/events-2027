import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "./supabase/api";
import { adminClient } from "./supabase/admin";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "individual" | "organization" | "government";
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  account_status?: "active" | "suspended" | "banned";
  organizer_status?:
    | "none"
    | "pending"
    | "approved"
    | "rejected"
    | "suspended"
    | "banned";
  is_admin?: boolean;
  suspended_at?: string | null;
  status_reason?: string | null;
};

export type AuthContext = {
  user: { id: string; email?: string } | null;
  profile: ProfileRow | null;
};

const RESTRICTED = new Set(["suspended", "banned"]);

/**
 * Loads the caller's auth user + profile using the service role so status
 * fields (which are not self-readable) are always accurate. Never trust
 * status/role/admin values supplied by the client.
 */
export async function getAuthContext(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthContext> {
  const { user } = await getAuthUser(req, res);
  if (!user) return { user: null, profile: null };

  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user: { id: user.id, email: user.email ?? undefined }, profile: profile as ProfileRow | null };
}

/** Returns true only for an account in good standing. */
export function isAccountActive(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return !RESTRICTED.has(profile.account_status ?? "active");
}

export function isApprovedOrganizer(profile: ProfileRow | null): boolean {
  if (!profile) return false;
  return profile.organizer_status === "approved" && isAccountActive(profile);
}

export function isAdmin(profile: ProfileRow | null): boolean {
  return !!profile?.is_admin && isAccountActive(profile);
}

/** 403 unless the caller is an approved organizer (or admin). */
export async function requireOrganizer(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) {
    res.status(401).json({ error: "Authentification requise" });
    return null;
  }
  if (!isAccountActive(ctx.profile)) {
    res.status(403).json({ error: "Compte suspendu ou banni" });
    return null;
  }
  if (!isApprovedOrganizer(ctx.profile) && !isAdmin(ctx.profile)) {
    res.status(403).json({ error: "Compte organisateur non approuvé" });
    return null;
  }
  return ctx;
}

/** 403 unless the caller is an active administrator. */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<AuthContext | null> {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) {
    res.status(401).json({ error: "Authentification requise" });
    return null;
  }
  if (!isAdmin(ctx.profile)) {
    res.status(403).json({ error: "Accès réservé aux administrateurs" });
    return null;
  }
  return ctx;
}

/** True when the user owns or is a member of the organization. */
export async function isOrgMember(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const admin = adminClient();
  const { data } = await admin
    .from("organization_members")
    .select("profile_id")
    .eq("org_id", orgId)
    .eq("profile_id", userId)
    .maybeSingle();
  return !!data;
}

/** True when the user is an org owner/member of the event's organization. */
export async function canManageEvent(
  userId: string,
  eventId: string,
  orgId?: string,
): Promise<boolean> {
  const admin = adminClient();
  if (!orgId) {
    const { data: ev } = await admin
      .from("events")
      .select("org_id")
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) return false;
    orgId = ev.org_id;
  }
  return isOrgMember(userId, orgId);
}

// ---------------------------------------------------------------
// Audit trail — append-only, service-role only.
// Never log secrets, tokens, passwords, or unnecessary PII.
// ---------------------------------------------------------------
export type AuditAction =
  | "organizer.application.approve"
  | "organizer.application.reject"
  | "organizer.application.request_info"
  | "organizer.suspend"
  | "organizer.reinstate"
  | "organizer.ban"
  | "organizer.update"
  | "organizer.delete"
  | "admin.grant"
  | "admin.revoke"
  | "event.moderate"
  | "feedback.update"
  | "account.status.change"
  | "social.account.connect"
  | "social.account.disconnect"
  | "social.publish"
  | "social.crosspost";

export async function recordAudit(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = adminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch (err) {
    // Auditing must never break the primary operation; log server-side only.
    console.error("[audit] failed to record", input.action, (err as Error).message);
  }
}
