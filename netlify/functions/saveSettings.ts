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
    const { frontRowStudents } = body;

    if (!Array.isArray(frontRowStudents)) {
      return new Response(JSON.stringify({ error: "Invalid data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate max 12 students
    if (frontRowStudents.length > 12) {
      return new Response(JSON.stringify({ error: "前2列に固定できるのは最大12人までです" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const store = getStore("seat-settings");
    await store.set("front-row-students", JSON.stringify({
      studentNumbers: frontRowStudents,
    }));

    return Response.json({ success: true });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
