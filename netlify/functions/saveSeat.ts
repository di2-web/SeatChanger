import { getStore } from "@netlify/blobs";
import { verifyToken } from "./auth";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify auth
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!await verifyToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { seatMap, action } = body;

    if (!seatMap || !Array.isArray(seatMap)) {
      return new Response(JSON.stringify({ error: "Invalid seat map" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const timestamp = now.toISOString();

    // Save as current seat arrangement
    const currentStore = getStore("seat-current");
    await currentStore.set("current", JSON.stringify({
      seatMap,
      updatedAt: timestamp,
    }));

    // Add to history
    const historyStore = getStore("seat-history");
    const historyKey = `${now.getTime()}`;
    await historyStore.set(historyKey, JSON.stringify({
      seatMap,
      createdAt: timestamp,
      action: action || "save",
    }));

    // Limit history to 100 entries
    const allKeys = await historyStore.list();
    if (allKeys.blobs.length > 100) {
      const sortedKeys = allKeys.blobs
        .map(b => b.key)
        .sort();
      const keysToDelete = sortedKeys.slice(0, sortedKeys.length - 100);
      for (const key of keysToDelete) {
        await historyStore.delete(key);
      }
    }

    return Response.json({ success: true, timestamp });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
