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

  // 共通の高画質キャプチャ設定
  const getCanvas = async () => {
    if (!printAreaRef.current) return null

    return await html2canvas(printAreaRef.current, {
      scale: 4,           // 画質向上のためスケールを「4」に引き上げます
      useCORS: true,      // 外部リソース解決用
      windowWidth: 1126,  // 仮想ブラウザの幅を1126pxに固定
      logging: false,     // コンソールログを抑制
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById('print-target')
        if (clonedElement) {
          clonedElement.style.width = '1126px'
          clonedElement.style.boxSizing = 'border-box'

          // TypeScriptのエラーを回避するため、setPropertyを使用してCSSプロパティをセットします
          clonedElement.style.setProperty('-webkit-font-smoothing', 'antialiased')
          clonedElement.style.setProperty('-moz-osx-font-smoothing', 'grayscale')
          clonedElement.style.setProperty('text-rendering', 'optimizeLegibility')

          // 印刷用に出力コントラストを改善
          clonedElement.style.setProperty('--bg', '#ffffff')
          clonedElement.style.setProperty('--text', '#1a1a1a')
          clonedElement.style.setProperty('--text-h', '#000000')
          clonedElement.style.setProperty('--border', '#a0a0a0')
          clonedElement.style.setProperty('--accent', '#8213e8')
          clonedElement.style.setProperty('--accent-bg', 'rgba(130, 19, 232, 0.05)')
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

      const pdf = new jsPDF({
        orientation: 'landscape', // A4横向きに設定
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()   // A4横幅: 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight() // A4縦幅: 210mm

      const margin = 15
      const imgWidth = pdfWidth - margin * 2 // 267mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width // アスペクト比を維持

      const imgY = (pdfHeight - imgHeight) / 2

      // PDFへの埋め込み時の品質（FAST または SLOW など）を設定して劣化を防ぎます
      pdf.addImage(imgData, 'PNG', margin, imgY, imgWidth, imgHeight, undefined, 'FAST')
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