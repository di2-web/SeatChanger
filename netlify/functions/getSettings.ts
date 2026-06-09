import { getStore } from "@netlify/blobs";
import classmates from "./classmates.json";

export default async () => {
  try {
    const store = getStore("seat-settings");
    let frontRowStudents: number[] = [];

    try {
      const data = await store.get("front-row-students", { type: "json" }) as { studentNumbers?: number[] } | null;
      if (data) {
        frontRowStudents = data.studentNumbers || [];
      }
    } catch {
      // No settings saved yet
    }

    return Response.json({
      classmates,
      frontRowStudents,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
