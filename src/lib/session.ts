import { getIronSession, type IronSession } from "iron-session";

export interface SessionData {
  userId?: string;
  role?: "USER" | "ADMIN";
}

export async function getSession(req: any, res: any): Promise<IronSession<SessionData>> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 chars");
  return getIronSession<SessionData>(req, res, { cookieName: "hatm_session", password: secret, cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 } });
}
