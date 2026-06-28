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
  seatMap: { number: number; name: string; ruby: string }[];
  onSeatClick?: (seatMapIdx: number) => void;
  selectedSeatIdx?: number | null;
  swapMode?: boolean;
}

function SeatMapping({
  seatMap,
  onSeatClick,
  selectedSeatIdx,
  swapMode = false,
}: SeatMappingProps) {
  if (seatMap.length !== 40) {
    return (
      <div className="seat-map-error">
        <p>shuffle系のロジックに誤りがあります</p>
      </div>
    );
  }

  // 各席に元のインデックスを付与
  const annotated = seatMap.map((seat, idx) => ({ ...seat, originalIdx: idx }));
  // 表示用の空席を特定位置に挿入
  annotated.splice(3, 0, { number: 0, name: "", ruby: "", originalIdx: -1 });
  annotated.splice(6, 0, { number: 0, name: "", ruby: "", originalIdx: -1 });

  return (
    <>
      <div className="teachers-seat">
        <p className="teacher-seat-box">教卓</p>
      </div>
      <div className="seat-map-grid">
        {annotated.map((seat, index) => {
          const cardKey = seat.number === 0 ? `empty-${index}` : seat.number;
          return (
            <SeatCard
              key={cardKey}
              number={seat.number}
              name={seat.name}
              ruby={seat.ruby}
              seatMapIdx={seat.originalIdx}
              isSelected={seat.originalIdx >= 0 && selectedSeatIdx === seat.originalIdx}
              swapMode={swapMode}
              onSeatClick={onSeatClick}
            />
          );
        })}
      </div>
    </>
  );
}

export default SeatMapping;