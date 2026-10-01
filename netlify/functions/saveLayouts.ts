import { getStore } from "./blobs";
import { verifyToken } from "./auth";
import type { SeatLayout } from "./getLayouts";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!(await verifyToken(token))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { layouts, activeLayoutId } = body as {
      layouts?: SeatLayout[];
      activeLayoutId?: string;
    };

    if (!Array.isArray(layouts) || layouts.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid layouts data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 基本的なバリデーション
    for (const layout of layouts) {
      if (!layout.id || !layout.name || !layout.rows || !layout.columns || !Array.isArray(layout.seats)) {
        return new Response(JSON.stringify({ error: "Layout format invalid" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (layout.seats.length !== layout.rows * layout.columns) {
        return new Response(JSON.stringify({ error: "Layout seats length mismatch" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const store = getStore("seat-settings");
    await store.set(
      "seat-layouts",
      JSON.stringify({
        layouts,
        activeLayoutId: activeLayoutId || layouts[0].id,
      })
    );

    return Response.json({ success: true });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
