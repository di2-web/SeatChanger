import { getStore } from "@netlify/blobs";

export interface SeatLayout {
  id: string;
  name: string;
  rows: number;
  columns: number;
  seats: boolean[];
  isDefault?: boolean;
}

export const DEFAULT_LAYOUTS: SeatLayout[] = [
  {
    id: "default-7x6",
    name: "標準 (7列×6行)",
    rows: 6,
    columns: 7,
    seats: (() => {
      const arr = new Array(42).fill(true);
      arr[3] = false;
      arr[6] = false;
      return arr;
    })(),
    isDefault: true,
  },
];

export default async () => {
  try {
    const store = getStore("seat-settings");
    let layouts: SeatLayout[] = DEFAULT_LAYOUTS;
    let activeLayoutId: string = "default-7x6";

    try {
      const saved = await store.get("seat-layouts", { type: "json" }) as {
        layouts?: SeatLayout[];
        activeLayoutId?: string;
      } | null;

      if (saved && Array.isArray(saved.layouts) && saved.layouts.length > 0) {
        layouts = saved.layouts;
        if (saved.activeLayoutId) {
          activeLayoutId = saved.activeLayoutId;
        }
      }
    } catch {
      // 未保存の場合はデフォルトを使用
    }

    // activeLayoutId が存在しない場合は先頭を選択
    if (!layouts.some((l) => l.id === activeLayoutId)) {
      activeLayoutId = layouts[0]?.id || "default-7x6";
    }

    return Response.json({
      layouts,
      activeLayoutId,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
