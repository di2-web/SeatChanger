function SeatCard(props: { number: number; name: string; }) {
  return (
    <div className="seat-card">
      <p>{props.number}</p>
      <p>{props.name}</p>
    </div>
  )
}

function SeatMap(props: { seatMap: { number: number; name: string; }[] }) {

  return (
    <div className="seat-map">
      {props.seatMap.map((seat) => (
        <SeatCard key={seat.number} number={seat.number} name={seat.name} />
      ))}
    </div>
  )
}