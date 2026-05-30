import { useState, useEffect, useRef } from 'react'
import SeatMapping from './SeatComponents'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './App.css'

function App() {
  // 型定義に ruby: string を追加
  const [seatMap, setSeatMap] = useState<{ number: number, name: string, ruby: string }[]>([])
  const [loading, setLoading] = useState(true)

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

  const getCanvas = async () => {
    if (!printAreaRef.current) return null

    return await html2canvas(printAreaRef.current, {
      scale: 4,
      useCORS: true,
      windowWidth: 1126,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById('print-target')
        if (clonedElement) {
          clonedElement.style.width = '1126px'
          clonedElement.style.boxSizing = 'border-box'

          clonedElement.style.setProperty('-webkit-font-smoothing', 'antialiased')
          clonedElement.style.setProperty('-moz-osx-font-smoothing', 'grayscale')
          clonedElement.style.setProperty('text-rendering', 'optimizeLegibility')

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

  const downloadPDF = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) return

      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const margin = 15
      const imgWidth = pdfWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const imgY = (pdfHeight - imgHeight) / 2

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