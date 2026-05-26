function SeatCard(props: { number: number, name: string; }) {
  return (
    <div className="seat-card">
      <p>{props.number}</p>
      <p>{props.name}</p>
    </div>
  )
}

function SeatMapping(props: { seatMap: { number: number, name: string; }[] }) {

  const seatMapStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "10px"
  }

  if (props.seatMap.length == 40){
    props.seatMap.splice(3, 0, { number: NaN, name: "" })
    props.seatMap.splice(6, 0, { number: NaN, name: "" })

  return (
    <div className="seat-map" style={seatMapStyle}>
      {props.seatMap.map((seat) => (
        <SeatCard number={seat.number} name={seat.name} key={seat.number} />
      ))}
    </div>
  )} else {
    return (
      <div className="seat-map">
        <p>shuffle系のロジックに誤りがあります</p>
      </div>
    )
  }
}

export default SeatMapping;