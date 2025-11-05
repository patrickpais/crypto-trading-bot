import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Simple in-memory user store for simple auth
const simpleAuthUsers: Record<string, { username: string; name: string; email: string; role: "user" | "admin" }> = {
  admin: { username: "admin", name: "Admin User", email: "admin@example.com", role: "admin" },
  patrick: { username: "patrick", name: "Patrick Pais", email: "patrick@example.com", role: "user" },
};

async function ensureSimpleAuthUsersExist() {
  try {
    // Check if database is available
    const database = await db.getDb();
    if (!database) {
      console.warn("[Auth] Database not available, skipping user sync");
      return;
    }

    for (const [username, userData] of Object.entries(simpleAuthUsers)) {
      try {
        const existingUser = await db.getUserByOpenId(username);
        if (!existingUser) {
          await db.upsertUser({
            openId: username,
            name: userData.name,
            email: userData.email,
            loginMethod: "simple",
            role: userData.role,
          });
        }
      } catch (userError) {
        console.warn(`[Auth] Failed to sync user ${username}:`, userError);
        // Continue with other users even if one fails
      }
    }
  } catch (error) {
    console.warn("[Auth] Failed to ensure simple auth users exist:", error);
  }
}

function parseSimpleAuthCookie(cookieHeader: string | undefined): { id?: number; username?: string } | null {
  if (!cookieHeader) return null;

  try {
    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    
    if (!sessionCookie) return null;

    // Try to parse as JSON (simple auth)
    try {
      const session = JSON.parse(sessionCookie);
      return { id: session.id, username: session.username };
    } catch {
      // If it's not JSON, it might be a JWT token from OAuth
      return null;
    }
  } catch (error) {
    console.warn("[Auth] Failed to parse cookie:", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Ensure simple auth users exist in database (non-blocking)
  ensureSimpleAuthUsersExist().catch(err => {
    console.error("[Auth] Error in ensureSimpleAuthUsersExist:", err);
  });

  // Try simple auth first
  const sessionData = parseSimpleAuthCookie(opts.req.headers.cookie);
  if (sessionData?.username) {
    try {
      const database = await db.getDb();
      if (database) {
        const dbUser = await db.getUserByOpenId(sessionData.username);
        user = dbUser || null;
      } else {
        // Database not available, create a minimal user object from simple auth
        const simpleUser = simpleAuthUsers[sessionData.username];
        if (simpleUser) {
          user = {
            id: sessionData.id || 1,
            openId: sessionData.username,
            name: simpleUser.name,
            email: simpleUser.email,
            loginMethod: "simple",
            role: simpleUser.role,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          } as User;
        }
      }
    } catch (error) {
      console.error("[Auth] Failed to get user from database:", error);
      // If database fails, create a minimal user object from simple auth
      const simpleUser = simpleAuthUsers[sessionData.username];
      if (simpleUser) {
        user = {
          id: sessionData.id || 1,
          openId: sessionData.username,
          name: simpleUser.name,
          email: simpleUser.email,
          loginMethod: "simple",
          role: simpleUser.role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
