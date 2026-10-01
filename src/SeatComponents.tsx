import { type SeatLayout, DEFAULT_LAYOUTS } from "./types/layout";

export interface SeatStudent {
  number: number;
  name: string;
  ruby: string;
}

interface SeatCardProps {
  number: number;
  name: string;
  ruby: string;
  seatMapIdx?: number;
  isSelected?: boolean;
  swapMode?: boolean;
  onSeatClick?: (seatMapIdx: number) => void;
}

function SeatCard({
  number,
  name,
  ruby,
  seatMapIdx = -1,
  isSelected = false,
  swapMode = false,
  onSeatClick,
}: SeatCardProps) {
  if (number === 0) {
    return (
      <div className="seat-card empty-seat">
        <p></p>
        <p></p>
      </div>
    );
  }

  const handleClick = () => {
    if (swapMode && onSeatClick && seatMapIdx >= 0) {
      onSeatClick(seatMapIdx);
    }
  };

  const dynamicStyle = {
    cursor: swapMode ? "pointer" : "default",
    backgroundColor: isSelected ? "var(--accent-bg)" : undefined,
    borderColor: isSelected ? "var(--accent)" : undefined,
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: "-1px",
  };

  return (
    <div style={dynamicStyle} className="seat-card" onClick={handleClick}>
      <p className="seat-number-text">{number}</p>
      <div className="seat-divider"></div>
      <p className="seat-name-container">
        <ruby style={{ rubyPosition: "over" }}>
          {name}
          <rt className="seat-ruby-text">
            {ruby}
          </rt>
        </ruby>
      </p>
    </div>
  );
}

interface SeatMappingProps {
  seatMap: SeatStudent[];
  layout?: SeatLayout | null;
  onSeatClick?: (seatMapIdx: number) => void;
  selectedSeatIdx?: number | null;
  swapMode?: boolean;
}

function SeatMapping({
  seatMap,
  layout,
  onSeatClick,
  selectedSeatIdx,
  swapMode = false,
}: SeatMappingProps) {
  // layout が指定されていない場合はデフォルトレイアウトを使用
  const currentLayout = layout || DEFAULT_LAYOUTS[0];

  // レイアウトのセル数
  const totalCells = currentLayout.rows * currentLayout.columns;

  // 各セルに割り当てる要素を構築
  let studentIdx = 0;
  const gridCells: {
    cellIndex: number;
    isSeat: boolean;
    student: SeatStudent | null;
    originalIdx: number;
  }[] = [];

  for (let i = 0; i < totalCells; i++) {
    const isSeat = currentLayout.seats ? currentLayout.seats[i] : true;
    if (isSeat) {
      if (studentIdx < seatMap.length) {
        gridCells.push({
          cellIndex: i,
          isSeat: true,
          student: seatMap[studentIdx],
          originalIdx: studentIdx,
        });
      } else {
        // 座席数が生徒数より多い場合の空席
        gridCells.push({
          cellIndex: i,
          isSeat: true,
          student: { number: 0, name: "", ruby: "" },
          originalIdx: -1,
        });
      }
      studentIdx++;
    } else {
      // 通路/空白セル
      gridCells.push({
        cellIndex: i,
        isSeat: false,
        student: { number: 0, name: "", ruby: "" },
        originalIdx: -1,
      });
    }
  }

  const gridStyle = {
    gridTemplateColumns: `repeat(${currentLayout.columns}, minmax(0, 1fr))`,
  };

  return (
    <>
      <div className="teachers-seat">
        <p className="teacher-seat-box">教卓</p>
      </div>
      <div className="seat-map-grid" style={gridStyle}>
        {gridCells.map((cell) => {
          const cardKey = `cell-${cell.cellIndex}`;
          return (
            <SeatCard
              key={cardKey}
              number={cell.student?.number || 0}
              name={cell.student?.name || ""}
              ruby={cell.student?.ruby || ""}
              seatMapIdx={cell.originalIdx}
              isSelected={cell.originalIdx >= 0 && selectedSeatIdx === cell.originalIdx}
              swapMode={swapMode && cell.originalIdx >= 0}
              onSeatClick={onSeatClick}
            />
          );
        })}
      </div>
    </>
  );
}

export default SeatMapping;