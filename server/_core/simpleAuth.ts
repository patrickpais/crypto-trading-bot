import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import * as crypto from "crypto";
import * as db from "../db";

// Default users with hashed passwords
const DEFAULT_USERS = {
  admin: { password: "admin123", name: "Admin User" },
  patrick: { password: "Gabi2205", name: "Patrick Pais" },
};

// Initialize default users in database
export async function ensureSimpleAuthUsersExist() {
  try {
    for (const [username, userData] of Object.entries(DEFAULT_USERS)) {
      const existingUser = await db.getUserByOpenId(username);
      if (!existingUser) {
        const passwordHash = crypto
          .createHash("sha256")
          .update(userData.password)
          .digest("hex");
        
        await db.upsertUser({
          openId: username,
          name: userData.name,
          email: `${username}@example.com`,
          passwordHash,
          loginMethod: "simple",
        });
      }
    }
  } catch (error) {
    console.warn("[SimpleAuth] Failed to ensure users exist:", error);
  }
}

export function registerSimpleAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    console.log("[SimpleAuth] Login attempt", req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("[SimpleAuth] Missing username or password");
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    try {
      console.log(`[SimpleAuth] Looking for user: ${username}`);
      // Get user from database
      const user = await db.getUserByOpenId(username);
      if (!user) {
        console.log(`[SimpleAuth] User not found: ${username}`);
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      
      console.log(`[SimpleAuth] User found: ${user.openId}, has passwordHash: ${!!user.passwordHash}`);

      // Verify password
      const passwordHash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
      
      console.log(`[SimpleAuth] Password hash comparison:`);
      console.log(`  Provided: ${passwordHash}`);
      console.log(`  Stored:   ${user.passwordHash}`);
      console.log(`  Match:    ${passwordHash === user.passwordHash}`);
      
      if (passwordHash !== user.passwordHash) {
        console.log(`[SimpleAuth] Password mismatch for user: ${username}`);
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      
      console.log(`[SimpleAuth] Password verified successfully for user: ${username}`);

      // Create a simple session token
      const sessionToken = JSON.stringify({
        id: user.id,
        username: user.openId,
        name: user.name,
        email: user.email,
        timestamp: Date.now(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        user: { id: user.id, username: user.openId, name: user.name, email: user.email },
      });
    } catch (error) {
      console.error("[SimpleAuth] Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current user
  app.get("/api/auth/me", (req: Request, res: Response) => {
    const cookie = req.cookies[COOKIE_NAME];
    if (!cookie) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const session = JSON.parse(cookie);
      res.json({
        id: session.id,
        username: session.username,
        name: session.name,
        email: session.email,
        role: "user",
      });
    } catch {
      res.status(401).json({ error: "Invalid session" });
    }
  });
}
