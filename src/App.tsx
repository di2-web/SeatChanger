import { useState } from 'react'
import changeSeat from './SeatLogic'
import SeatMapping from './SeatComponents'
import './App.css'


function App() {

  return (
    <>
      <header>Seat Changer</header>
      <main>
        <SeatMapping seatMap={changeSeat()} />
      </main>

    </>
  )
}

export default App
