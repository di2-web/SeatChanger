import classmates from './classmates.json'

let classmatesArray: { number: number; name: string }[] = classmates

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function changeSeat() {
  return shuffleArray(classmatesArray);
}
export default changeSeat