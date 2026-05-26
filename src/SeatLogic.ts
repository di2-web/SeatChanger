import classmates from './classmates.json'

function shuffle(array: any[]) {
  let copyArray = [...array]
  let newArray = []
  let randomIndex = 0
  while (copyArray.length > 0) {
    randomIndex = Math.floor(Math.random() * copyArray.length)
    newArray.push(copyArray[randomIndex])
    copyArray.splice(randomIndex, 1)
  }
  return newArray
}

function changeSeat() {
  return shuffle(classmates)
}

export default changeSeat