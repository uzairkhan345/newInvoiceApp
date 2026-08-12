import { auth } from "@/lib/auth";
import { userService } from "@/services/userService";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { UserFormDialog } from "@/components/settings/UserFormDialog";
import { UserList } from "@/components/settings/UserList";

/**
 * M28 — admin-only (gated one level up, `(app)/settings/layout.tsx`). The
 * only UI path to adding a user besides `scripts/bootstrapAdmin.ts` — no
 * self-registration exists anywhere in the app.
 */
export default async function UsersSettingsPage() {
  const session = await auth();
  const users = await userService.list();

  return (
    <>
      <PageHeader
        eyebrow="Application settings"
        title="Users"
        subtitle="Who can sign in with Google and what they can do. No self-registration — every account is added here first."
        action={<UserFormDialog />}
      />
      <SettingsTabs active="users" />
      <UserList users={users} currentUserId={session!.user.id} />
    </>
  );
}
