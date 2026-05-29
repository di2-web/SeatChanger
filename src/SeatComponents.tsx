const CardBorder = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "center" as const
};

const CardLongUnderLine = {
  margin: "auto auto",
  width: "100%",
  height: "0px",
  borderBottom: "1px solid #ccc"
}

const teacherSeatStyle = {
  border: "1px solid #ccc",
  margin: "0 auto 10px auto",
  textAlign: "center" as const,
  padding: "10px",
}

const teacherSeatEmptyStyle = {

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
        <p>{props.number}</p>
        <div style={CardLongUnderLine}></div>
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
      <>
        <div className="teachers-seat"><p style={teacherSeatStyle}>教卓</p></div>
        <div className="seat-map" style={seatMapStyle}>
          {map.map((seat, index) => {
            const cardKey = seat.number === 0 ? `empty-${index}` : seat.number;

            return (
              <SeatCard number={seat.number} name={seat.name} key={cardKey} />
            );
          })}
        </div>
      </>
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