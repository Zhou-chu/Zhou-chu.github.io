import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const SESSION_COOKIE = "admin_session";
const LOGIN_PATH = "/admin/login";

// ─── HMAC session token utilities ────────────────────────────────────

async function hmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacVerify(
  message: string,
  sigHex: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacHex(message, secret);
  if (expected.length !== sigHex.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ sigHex.charCodeAt(i);
  }
  return result === 0;
}

function isStandaloneMode(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

/**
 * In standalone Workers deploy (no OpenAI Sites), read + validate the
 * session cookie signed with ADMIN_PASSWORD. Returns null if missing,
 * expired, or tampered.
 */
async function getStandaloneSessionUser(): Promise<ChatGPTUser | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE);
  if (!cookie?.value) return null;

  const lastDot = cookie.value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const timestamp = cookie.value.slice(0, lastDot);
  const signature = cookie.value.slice(lastDot + 1);

  const valid = await hmacVerify(timestamp, signature, password);
  if (!valid) return null;

  const email = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0] || "admin@localhost";

  return { displayName: email, email, fullName: null };
}

// ─── Public API ──────────────────────────────────────────────────────

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  // Local development bypass: use a hardcoded dev user
  if (process.env.NODE_ENV !== "production") {
    return {
      displayName: "dev",
      email: "dev@localhost",
      fullName: "Dev User",
    };
  }

  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);

  // ChatGPT auth (OpenAI Sites deployment)
  if (email) {
    const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
    const fullName =
      encodedFullName &&
      requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
        ? safeDecodeURIComponent(encodedFullName)
        : null;

    return {
      displayName: fullName ?? email,
      email,
      fullName,
    };
  }

  // Standalone Workers deploy: HMAC-signed session cookie
  if (isStandaloneMode()) {
    return getStandaloneSessionUser();
  }

  return null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  if (isStandaloneMode()) {
    redirect(`${LOGIN_PATH}?return_to=${encodeURIComponent(returnTo)}`);
  }
  redirect(chatGPTSignInPath(returnTo));
}

/**
 * Return the signed-in user only when their email is explicitly allowlisted.
 * Production fails closed when ADMIN_EMAILS is missing or empty.
 */
export async function getAdminUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (process.env.NODE_ENV !== "production") return user;

  const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(user.email.trim().toLowerCase()) ? user : null;
}

export async function requireAdminUser(returnTo: string): Promise<ChatGPTUser> {
  const signedInUser = await getChatGPTUser();
  if (!signedInUser) {
    // Standalone mode → custom login page
    if (isStandaloneMode()) {
      redirect(`${LOGIN_PATH}?return_to=${encodeURIComponent(returnTo)}`);
    }
    // OpenAI Sites → ChatGPT sign-in
    redirect(chatGPTSignInPath(returnTo));
  }

  const admin = await getAdminUser();
  if (admin) return admin;

  redirect("/");
}

// ─── Session cookie helpers (used by login / logout API routes) ──────

/**
 * Sign a timestamp and set the admin_session cookie.
 * Called by the login API route.
 */
export async function signSessionCookie(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD not configured");

  const timestamp = Date.now().toString();
  const signature = await hmacHex(timestamp, password);
  const token = `${timestamp}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear the admin_session cookie.
 * Called by the logout API route.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

// ─── ChatGPT sign-in / sign-out paths (OpenAI Sites only) ────────────

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
