import { useState, useEffect } from 'react'
import SeatMapping from './SeatComponents'
import './App.css'

function App() {
  const [seatMap, setSeatMap] = useState<{ number: number, name: string }[]>([])
  const [loading, setLoading] = useState(true)

  // 1. ボタンをクリックした時の「手動席替え」用イベントハンドラ（useEffectの外で使われます）
  const handleShuffle = async () => {
    try {
      const response = await fetch('/.netlify/functions/changeSeat')
      const data = await response.json()
      setSeatMap(data)
    } catch (error) {
      console.error("席替えデータの取得に失敗しました:", error)
    }
  }

  // 2. 初回ロード時に1回だけ席替えデータを「非同期に取得する」ためのEffect
  useEffect(() => {
    let ignore = false; // クリーンアップ用のフラグ（競合状態を防ぐReact公式推奨パターン）

    const fetchInitialData = async () => {
      try {
        const response = await fetch('/.netlify/functions/changeSeat')
        const data = await response.json()
        if (!ignore) {
          setSeatMap(data)
          setLoading(false)
        }
      } catch (error) {
        console.error("初回データの取得に失敗しました:", error)
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchInitialData()

    return () => {
      ignore = true; // コンポーネントが破棄されたら処理をキャンセルする
    }
  }, []) // 依存配列は空なので、初回マウント時のみ1度実行されます

  if (loading) {
    return <div>読み込み中...</div>
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