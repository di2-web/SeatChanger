import { useState, useEffect, useRef } from 'react'
import SeatMapping from './SeatComponents'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './App.css'

function App() {
  const [seatMap, setSeatMap] = useState<{ number: number, name: string }[]>([])
  const [loading, setLoading] = useState(true)

  // 印刷・保存対象のDOM要素を参照するためのRef
  const printAreaRef = useRef<HTMLDivElement>(null)

  const handleShuffle = async () => {
    try {
      const response = await fetch('/.netlify/functions/changeSeat')
      const data = await response.json()
      setSeatMap(data)
    } catch (error) {
      console.error("席替えデータの取得に失敗しました:", error)
    }
  }

  useEffect(() => {
    let ignore = false
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
      ignore = true
    }
  }, [])

  // 端末サイズに依存しない、統一されたデスクトップ幅(1126px)の canvas を生成する共通関数
  const getCanvas = async () => {
    if (!printAreaRef.current) return null

    return await html2canvas(printAreaRef.current, {
      scale: 2,           // 高画質化（解像度2倍）
      useCORS: true,      // 外部リソース解決用
      windowWidth: 1126,  // キャプチャ時の仮想ウィンドウ幅をデスクトップ用（1126px）に固定
      onclone: (clonedDoc) => {
        // クローンされたDOMの中から、キャプチャ対象の要素を見つけます
        const clonedElement = clonedDoc.getElementById('print-target')
        if (clonedElement) {
          // モバイル表示であっても、強制的にデスクトップ時の幅に固定します
          clonedElement.style.width = '1126px'
          clonedElement.style.boxSizing = 'border-box'

          // 【インク節約設定】
          // ダークモード中に保存した際、真っ黒な背景で出力されないよう
          // 保存用データのみ一時的にライトモード用のカラー設定に差し替えます
          // （画面でダークモードのままキャプチャしたい場合は、以下の style.setProperty 群を削除してください）
          clonedElement.style.setProperty('--bg', '#ffffff')
          clonedElement.style.setProperty('--text', '#6b6375')
          clonedElement.style.setProperty('--text-h', '#08060d')
          clonedElement.style.setProperty('--border', '#e5e4e7')
          clonedElement.style.setProperty('--accent', '#aa3bff')
          clonedElement.style.setProperty('--accent-bg', 'rgba(170, 59, 255, 0.1)')
          clonedElement.style.setProperty('--accent-border', 'rgba(170, 59, 255, 0.5)')
        }
      }
    })
  }

  // 1. PNGとして画像ダウンロードする関数
  const downloadPNG = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) return

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'seat-map.png'
      link.click()
    } catch (error) {
      console.error("PNGの出力に失敗しました:", error)
    }
  }

  // 2. A4横サイズのPDFとしてダウンロードする関数
  const downloadPDF = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) return

      const imgData = canvas.toDataURL('image/png')

      // A4横（Landscape）のドキュメントを作成
      const pdf = new jsPDF({
        orientation: 'landscape', // A4横向きに設定
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()   // A4横幅: 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // A4縦幅: 210mm

      // 余白（マージン）の設定（左右15mm）
      const margin = 15
      const imgWidth = pdfWidth - margin * 2 // 267mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width // アスペクト比を維持

      // 画像の高さがA4用紙内に収まる場合、縦方向の中央にくるようにY位置を計算
      const imgY = (pdfHeight - imgHeight) / 2

      pdf.addImage(imgData, 'PNG', margin, imgY, imgWidth, imgHeight)
      pdf.save('seat-map.pdf')
    } catch (error) {
      console.error("PDFの出力に失敗しました:", error)
    }
  }

  if (loading) {
    return <div>読み込み中...</div>
  }

  return (
    <>
      <header>Seat Changer</header>
      <main>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
          <button onClick={handleShuffle}>席替え</button>
          <button onClick={downloadPNG}>PNGで保存</button>
          <button onClick={downloadPDF}>PDFで保存(A4横)</button>
        </div>

        {/* キャプチャ時に対象を特定できるよう、id="print-target" を付与します */}
        <div
          id="print-target"
          ref={printAreaRef}
          style={{
            background: 'var(--bg)',
            padding: '32px',
            borderRadius: '8px',
            color: 'var(--text-h)',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <SeatMapping seatMap={seatMap} />
        </div>
      </main>
    </>
  )
}

export default App