import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "diet-assistant-secret-key";

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  userId?: number;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // 1. Try Clerk session auth first (cookie-based from browser)
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      const clerkId = auth.userId;
      // Look up or create internal user
      let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
      if (!user) {
        // Create a new user record for this Clerk user
        const email = `${clerkId}@clerk.user`;
        const name = "NutriAI User";
        const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
        if (existing.length > 0) {
          [user] = await db.update(usersTable).set({ clerkId }).where(eq(usersTable.email, email)).returning();
        } else {
          [user] = await db.insert(usersTable).values({ clerkId, email, name, passwordHash: "" }).returning();
        }
      }
      req.userId = user.id;
      next();
      return;
    }
  } catch {
    // Clerk not available or not signed in via Clerk — fall through to JWT
  }

  // 2. Fall back to JWT Bearer token auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      next();
      return;
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}
