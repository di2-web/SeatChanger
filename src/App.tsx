import { useState } from 'react'
import changeSeat from './SeatLogic'
import SeatMapping from './SeatComponents'
import './App.css'


function App() {

  const [seatMap, setSeatMap] = useState(changeSeat())

  const handleShuffle = () => {
    setSeatMap(changeSeat())
  }

  return (
    <>
      <header>Seat Changer</header>
      <main>
        <button onClick={handleShuffle}>席替え</button>
        <SeatMapping seatMap={seatMap} />
      </main>

    </>
  )
}

export default App
