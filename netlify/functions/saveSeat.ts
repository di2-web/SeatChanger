import { getStore } from "@netlify/blobs";
import { verifyToken } from "./auth";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

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

    // Use strong consistency so reads immediately after write see fresh data
    const currentStore = getStore({ name: "seat-current", consistency: "strong" });
    await currentStore.set("current", JSON.stringify({
      seatMap,
      updatedAt: timestamp,
    }));

    const historyStore = getStore({ name: "seat-history", consistency: "strong" });
    const historyKey = `${now.getTime()}`;
    await historyStore.set(historyKey, JSON.stringify({
      seatMap,
      createdAt: timestamp,
      action: action || "save",
    }));

    // Limit history to 100 entries
    const allKeys = await historyStore.list();
    if (allKeys.blobs.length > 100) {
      const keysToDelete = allKeys.blobs
        .map(b => b.key)
        .sort()
        .slice(0, allKeys.blobs.length - 100);
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
