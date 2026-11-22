import type { GetServerSideProps } from "next";
import { requireAdminPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import AdminShell from "@/components/AdminShell";
import AdminSocial from "@/components/AdminSocial";

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireAdminPage(ctx);

export default function AdminSocialPage() {
  return (
    <AdminShell
      title="Réseaux sociaux"
      description="Page Facebook et compte Instagram centraux, publications de la plateforme et repartage automatique des organisations."
    >
      <AdminSocial />
    </AdminShell>
  );
}
