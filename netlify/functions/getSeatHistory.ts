import { getStore } from "@netlify/blobs";

interface SavedHistoryEntry {
  seatMap: { number: number; name: string; ruby: string }[];
  createdAt: string;
}

export default async () => {
  try {
    // Strong consistency ensures newly saved entries are visible immediately
    const historyStore = getStore({ name: "seat-history", consistency: "strong" });
    const allKeys = await historyStore.list();

    const sortedKeys = allKeys.blobs
      .map(b => b.key)
      .sort()
      .reverse();

    const entries = [];
    for (const key of sortedKeys) {
      const data = await historyStore.get(key, { type: "json" }) as SavedHistoryEntry | null;
      if (data) {
        entries.push({ key, ...data });
      }
    }

    return Response.json(entries);
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
