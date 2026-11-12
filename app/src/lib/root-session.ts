import { createIsomorphicFn } from "@tanstack/react-start";
import { getSessionFn } from "../server/functions/session";
import type { AdminSessionUser } from "../server/functions/session-utils";

export type RootSessionResult = { session: AdminSessionUser | null };

/**
 * Client root session after SPA navigations (including OTP sign-in).
 *
 * Better-auth session cookies are httpOnly, so `document.cookie` is empty even
 * when the browser stores a session. Always ask the server; the Cookie header
 * on that request includes httpOnly cookies. The anonymous homepage skip lives
 * only in the server branch below, which reads the request Cookie header.
 */
export async function resolveBrowserRootSession(
  getSession: () => Promise<AdminSessionUser | null>,
): Promise<RootSessionResult> {
  return { session: await getSession() };
}

export const resolveRootSession = createIsomorphicFn()
  .client(() => resolveBrowserRootSession(getSessionFn))
  .server(async (): Promise<RootSessionResult> => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { hasAuthSessionCookie } = await import("./public-document-cache");
    if (!hasAuthSessionCookie(getRequestHeader("cookie") ?? null)) {
      return { session: null };
    }
    return { session: await getSessionFn() };
  });
