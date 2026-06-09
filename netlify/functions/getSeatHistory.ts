import { getStore } from "@netlify/blobs";

// 保存されている履歴オブジェクトの型を明確に定義します
interface SavedHistoryEntry {
  seatMap: { number: number; name: string; ruby: string }[];
  createdAt: string;
}

export default async () => {
  try {
    const historyStore = getStore("seat-history");
    const allKeys = await historyStore.list();

    const entries = [];
    // Sort keys descending (newest first)
    const sortedKeys = allKeys.blobs
      .map(b => b.key)
      .sort()
      .reverse();

    for (const key of sortedKeys) {
      // Record<string, any> ではなく、上記で宣言したインターフェースでキャストします
      const data = await historyStore.get(key, { type: "json" }) as SavedHistoryEntry | null;
      if (data) {
        entries.push({
          key,
          ...data,
        });
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