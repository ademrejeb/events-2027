import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { withApiLog } from "@/lib/api-log";

/** Platform KPIs for the admin dashboard. */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = adminClient();
  const head = { count: "exact" as const, head: true };

  const [
    pending,
    approvedOrgs,
    rejected,
    suspended,
    eventsPublished,
    eventsDraft,
    registrations,
    users,
    recentApplications,
    recentAudit,
  ] = await Promise.all([
    admin.from("organizer_applications").select("id", head).eq("status", "pending"),
    admin.from("organizations").select("id", head).eq("status", "approved"),
    admin.from("organizer_applications").select("id", head).eq("status", "rejected"),
    admin.from("profiles").select("id", head).in("account_status", ["suspended", "banned"]),
    admin.from("events").select("id", head).eq("status", "published"),
    admin.from("events").select("id", head).eq("status", "draft"),
    admin.from("event_participants").select("id", head),
    admin.from("profiles").select("id", head),
    admin
      .from("organizer_applications")
      .select("id, name, kind, email, city, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("admin_audit_log")
      .select("id, actor_email, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    kpis: {
      pending_applications: pending.count ?? 0,
      approved_organizations: approvedOrgs.count ?? 0,
      rejected_applications: rejected.count ?? 0,
      restricted_accounts: suspended.count ?? 0,
      published_events: eventsPublished.count ?? 0,
      draft_events: eventsDraft.count ?? 0,
      volunteer_registrations: registrations.count ?? 0,
      total_accounts: users.count ?? 0,
    },
    recent_applications: recentApplications.data ?? [],
    recent_audit: recentAudit.data ?? [],
  });
}

export default withApiLog(handler);
