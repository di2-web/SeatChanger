import classmates from './classmates.json'

const classmatesArrayNumber: number[] = classmates.map((classmate) => classmate.number)

const shuffleArray = (array: number[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function changeSeat() {
  return shuffleArray([...classmatesArrayNumber]);
}
export default changeSeat