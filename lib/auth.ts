import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";
import { invitation } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

async function findUsableInvitation(email: string) {
  const rows = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.email, email.toLowerCase()),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const inv = await findUsableInvitation(user.email);
          if (!inv) {
            throw new APIError("FORBIDDEN", { message: "email_not_allowed" });
          }
          return { data: { ...user, role: inv.role } };
        },
        after: async (user) => {
          const inv = await findUsableInvitation(user.email);
          if (!inv) return;
          await db
            .update(invitation)
            .set({
              status: "accepted",
              acceptedAt: new Date(),
              acceptedBy: user.id,
            })
            .where(eq(invitation.id, inv.id));
        },
      },
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
});
