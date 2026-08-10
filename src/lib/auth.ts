import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * M28 — Google OAuth only, no self-registration: `signIn` rejects anyone
 * without an existing `User` row (created by an admin via `/settings/users`
 * or the `scripts/bootstrapAdmin.ts` bootstrap script — see
 * Docs/internal/feedback_backlog.md's M28 section for the full decided
 * shape). Database sessions, not JWT, so removing/demoting a `User` takes
 * effect immediately rather than waiting out a token's expiry.
 *
 * `allowDangerousEmailAccountLinking` is required for the allowlist model
 * itself to work: an admin-created `User` row has no linked `Account` until
 * its owner's first real sign-in, which is exactly the "link this OAuth
 * account to an existing email-matched User" case Auth.js otherwise blocks
 * by default. It's safe here specifically because there's only one
 * provider (no cross-provider identity-confusion risk), Google always
 * returns verified emails, and the `signIn` callback below already rejects
 * any email with no existing `User` row before linking is ever attempted.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return allowed !== null;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
});
