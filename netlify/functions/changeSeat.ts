import classmates from "./classmates.json";

function shuffle<T>(array: T[]): T[] {
  const copyArray = [...array];
  const newArray: T[] = [];
  while (copyArray.length > 0) {
    const randomIndex = Math.floor(Math.random() * copyArray.length);
    newArray.push(copyArray[randomIndex]);
    copyArray.splice(randomIndex, 1);
  }
  return newArray;
}

export default async () => {
  const shuffledData = shuffle(classmates);
  return Response.json(shuffledData);
};