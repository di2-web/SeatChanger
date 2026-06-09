import { getStore } from "@netlify/blobs";
import { verifyToken } from "./auth";
import classmates from "./classmates.json";

function shuffle<T>(array: T[]): T[] {
  const copyArray = [...array];
  const newArray: T[] = [];
  while (copyArray.length > 0) {
    const randomIndex = Math.floor(Math.random() * copyArray.length);
    newArray.push(copyArray[randomIndex]);
    copyArray.splice(randomIndex, 1);
  }
  return newArray;
}

export default async (request: Request) => {
  // Verify auth - only authenticated users can shuffle
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!await verifyToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get front-row-fixed students from settings
    const store = getStore("seat-settings");
    let frontRowStudentNumbers: number[] = [];

    try {
      const data = await store.get("front-row-students", { type: "json" }) as { studentNumbers?: number[] } | null;
      if (data) {
        frontRowStudentNumbers = data.studentNumbers || [];
      }
    } catch {
      // No settings, proceed without constraints
    }

    const FRONT_ROW_SEATS = 12; // 前2列の座席数（行1: 5席 + 行2: 7席）

    if (frontRowStudentNumbers.length > 0) {
      // Constrained shuffle
      const frontStudents = classmates.filter(s =>
        frontRowStudentNumbers.includes(s.number)
      );
      const otherStudents = classmates.filter(s =>
        !frontRowStudentNumbers.includes(s.number)
      );

      // Shuffle front-row students within front seats
      const shuffledFront = shuffle(frontStudents);
      const shuffledOther = shuffle(otherStudents);

      // Fill front rows: fixed students first, then fill remaining front seats from others
      const frontSeats = [
        ...shuffledFront,
        ...shuffledOther.slice(0, FRONT_ROW_SEATS - shuffledFront.length),
      ];
      const backSeats = shuffledOther.slice(FRONT_ROW_SEATS - shuffledFront.length);

      // Shuffle within each group for fairness
      const result = [...shuffle(frontSeats), ...shuffle(backSeats)];
      return Response.json(result);
    } else {
      // No constraints, normal shuffle
      const shuffledData = shuffle(classmates);
      return Response.json(shuffledData);
    }
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};