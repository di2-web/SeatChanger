import { useState } from 'react'
import changeSeat from './SeatLogic'
import classmates from './classmates.json'
import './App.css'


function App() {

  const classmatesArray: { number: number; name: string }[] = classmates

  const [seats, setSeats] = useState<number[]>(changeSeat())



  return (
    <>
      <header>Seat Changer</header>

    </>
  )
}

export default App
