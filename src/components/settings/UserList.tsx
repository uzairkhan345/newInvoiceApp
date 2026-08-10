import { UserRow } from "@/components/settings/UserRow";
import type { User } from "@/generated/prisma/client";

export function UserList({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => (
        <UserRow key={user.id} user={user} isSelf={user.id === currentUserId} />
      ))}
    </div>
  );
}
