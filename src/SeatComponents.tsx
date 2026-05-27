const CardBorder = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "center" as const
};

const CardLongUnderLine = {
  textDecoration: "underline",
  textDecorationThickness: "2px",
  textUnderlineOffset: "4px"
}

function SeatCard(props: { number: number, name: string; }) {
  if (props.number == 0) {
    return <div style={CardBorder} className="seat-card empty-seat">
      <p></p>
      <p></p>
    </div>
  } else {
    return (
      <div style={CardBorder} className="seat-card">
        <p style={CardLongUnderLine}>{props.number}</p>
        <p>{props.name}</p>
      </div>
    )
  }
}

function SeatMapping(props: { seatMap: { number: number, name: string; }[] }) {

  const seatMapStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "10px"
  }

  const map = [...props.seatMap]

  if (props.seatMap.length == 40) {
    map.splice(3, 0, { number: 0, name: "" })
    map.splice(6, 0, { number: 0, name: "" })

    return (
      <div className="seat-map" style={seatMapStyle}>
        {map.map((seat, index) => {
          const cardKey = seat.number === 0 ? `empty-${index}` : seat.number;

          return (
            <SeatCard number={seat.number} name={seat.name} key={cardKey} />
          );
        })}
      </div>
    )
  } else {
    return (
      <div className="seat-map">
        <p>shuffle系のロジックに誤りがあります</p>
      </div>
    )
  }
}

export default SeatMapping;