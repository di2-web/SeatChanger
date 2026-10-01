export interface SeatLayout {
  id: string;
  name: string;
  rows: number;
  columns: number;
  // seats: 各セル (index = r * columns + c) が座席(true)か通路(false)か
  seats: boolean[];
  isDefault?: boolean;
  // パターンごとの前2列固定生徒（出席番号リスト）
  frontRowStudents?: number[];
}

// デフォルトのレイアウトパターン（標準の1パターンのみ）
export const DEFAULT_LAYOUTS: SeatLayout[] = [
  {
    id: "default-7x6",
    name: "標準 (7列×6行)",
    rows: 6,
    columns: 7,
    // 6行×7列 = 42マス。最前列のインデックス3と6が通路(false)、残り40席
    seats: (() => {
      const arr = new Array(42).fill(true);
      arr[3] = false;
      arr[6] = false;
      return arr;
    })(),
    isDefault: true,
  },
];
