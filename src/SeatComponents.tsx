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
  width: "150px",
}

// 引数に ruby: string を追加
function SeatCard(props: { number: number; name: string; ruby: string }) {
  if (props.number === 0) {
    return (
      <div style={CardBorder} className="seat-card empty-seat">
        <p></p>
        <p></p>
      </div>
    )
  } else {
    return (
      <div style={CardBorder} className="seat-card">
        <p>{props.number}</p>
        <div style={CardLongUnderLine}></div>
        {/* ルビ表示用に ruby タグと rt タグを使用します */}
        <p style={{ margin: "8px 0 0 0", lineHeight: "1.2" }}>
          <ruby style={{ rubyPosition: "over" }}>
            {props.name}
            <rt style={{ fontSize: "10px", color: "gray", letterSpacing: "0.5px" }}>
              {props.ruby}
            </rt>
          </ruby>
        </p>
      </div>
    )
  }
}

// 引数と内部データのオブジェクト型に ruby: string を追加
function SeatMapping(props: { seatMap: { number: number; name: string; ruby: string }[] }) {

  const seatMapStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "10px"
  }

  const map = [...props.seatMap]

  if (props.seatMap.length === 40) {
    // 挿入する空白座席データにも ruby: "" を指定して型を合わせます
    map.splice(3, 0, { number: 0, name: "", ruby: "" })
    map.splice(6, 0, { number: 0, name: "", ruby: "" })

    return (
      <>
        <div className="teachers-seat"><p style={teacherSeatStyle}>教卓</p></div>
        <div className="seat-map" style={seatMapStyle}>
          {map.map((seat, index) => {
            const cardKey = seat.number === 0 ? `empty-${index}` : seat.number;

            return (
              <SeatCard
                number={seat.number}
                name={seat.name}
                ruby={seat.ruby}
                key={cardKey}
              />
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