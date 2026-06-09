import { getStore } from "@netlify/blobs";

declare const process: {
  env: {
    ADMIN_PASSWORD?: string;
  };
};

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;

  const store = getStore("seat-settings");
  try {
    const tokens = await store.get("active-tokens", { type: "json" }) as Record<string, number> | null;
    if (!tokens) return false;
    const expiry = tokens[token];

    if (!expiry || Date.now() > expiry) {
      // Clean up expired token
      delete tokens[token];
      await store.set("active-tokens", JSON.stringify(tokens));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD || "seatchanger2026";

    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate and store token
    const token = generateToken();
    const store = getStore("seat-settings");

    let tokens: Record<string, number> = {};
    try {
      const data = await store.get("active-tokens", { type: "json" }) as Record<string, number> | null;
      if (data) {
        tokens = data;
      }
    } catch {
      // Start fresh
    }

    // Clean expired tokens
    const now = Date.now();
    for (const [t, exp] of Object.entries(tokens)) {
      if (now > exp) {
        delete tokens[t];
      }
    }

    tokens[token] = now + TOKEN_EXPIRY_MS;
    await store.set("active-tokens", JSON.stringify(tokens));

    return Response.json({ token });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
