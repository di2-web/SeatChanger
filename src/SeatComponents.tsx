const CardBorder = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "center" as const,
  transition: "border-color 0.15s, background-color 0.15s",
};

const CardLongUnderLine = {
  margin: "auto auto",
  width: "100%",
  height: "0px",
  borderBottom: "1px solid #ccc",
};

const teacherSeatStyle = {
  border: "1px solid #ccc",
  margin: "0 auto 10px auto",
  textAlign: "center" as const,
  padding: "10px",
  width: "150px",
};

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
      <div style={CardBorder} className="seat-card empty-seat">
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
    ...CardBorder,
    cursor: swapMode ? "pointer" : "default",
    backgroundColor: isSelected ? "var(--accent-bg)" : undefined,
    borderColor: isSelected ? "var(--accent)" : "#ccc",
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: "-1px",
  };

  return (
    <div style={dynamicStyle} className="seat-card" onClick={handleClick}>
      <p>{number}</p>
      <div style={CardLongUnderLine}></div>
      <p style={{ margin: "8px 0 0 0", lineHeight: "1.2" }}>
        <ruby style={{ rubyPosition: "over" }}>
          {name}
          <rt style={{ fontSize: "10px", color: "gray", letterSpacing: "0.5px" }}>
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
  const seatMapStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "10px",
  };

  if (seatMap.length !== 40) {
    return (
      <div className="seat-map">
        <p>shuffle系のロジックに誤りがあります</p>
      </div>
    );
  }

  // Annotate each seat with its original seatMap index
  const annotated = seatMap.map((seat, idx) => ({ ...seat, originalIdx: idx }));
  // Insert display-only empty seats
  annotated.splice(3, 0, { number: 0, name: "", ruby: "", originalIdx: -1 });
  annotated.splice(6, 0, { number: 0, name: "", ruby: "", originalIdx: -1 });

  return (
    <>
      <div className="teachers-seat">
        <p style={teacherSeatStyle}>教卓</p>
      </div>
      <div className="seat-map" style={seatMapStyle}>
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
