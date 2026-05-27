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

// 引数の (req, context) を完全に省略することで、ESLintのエラーを回避します
export default async () => {
  const shuffledData = shuffle(classmates);
  return Response.json(shuffledData);
};