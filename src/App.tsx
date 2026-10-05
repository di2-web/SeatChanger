import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import SeatMapping from './SeatComponents'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import { ToastContainer, showToast } from './Toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import LayoutEditorModal from './LayoutEditorModal'
import { type SeatLayout, DEFAULT_LAYOUTS } from './types/layout'
import {
  fetchSeatLayouts,
  saveSeatLayouts,
  fetchSeatHistory,
  saveSeatData,
  fetchCurrentSeat,
  fetchSettingsData,
  performShuffle,
  type SeatEntry,
} from './services/dataService'
import './App.css'

function SeatPage() {
  const [seatMap, setSeatMap] = useState<SeatEntry[]>([])
  const [layouts, setLayouts] = useState<SeatLayout[]>(DEFAULT_LAYOUTS)
  const [activeLayoutId, setActiveLayoutId] = useState<string>(DEFAULT_LAYOUTS[0].id)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [saving, setSaving] = useState(false)

  // Swap mode
  const [swapMode, setSwapMode] = useState(false)
  const [selectedSeatIdx, setSelectedSeatIdx] = useState<number | null>(null)

  const printAreaRef = useRef<HTMLDivElement>(null)

  // 初期データ取得 (Firestore / Local)
  useEffect(() => {
    let ignore = false

    const loadInitialData = async () => {
      try {
        const [layoutData, currentSeatData, historyData] = await Promise.all([
          fetchSeatLayouts(),
          fetchCurrentSeat(),
          fetchSeatHistory(),
        ])

        if (!ignore) {
          if (layoutData && Array.isArray(layoutData.layouts) && layoutData.layouts.length > 0) {
            setLayouts(layoutData.layouts)
            if (layoutData.activeLayoutId) {
              setActiveLayoutId(layoutData.activeLayoutId)
            }
          }

          if (currentSeatData && currentSeatData.length > 0) {
            setSeatMap(currentSeatData)
          } else if (historyData && Array.isArray(historyData) && historyData.length > 0) {
            setSeatMap(historyData[0].seatMap)
          }
        }
      } catch (error) {
        console.error('初回データの取得に失敗しました:', error)
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      ignore = true
    }
  }, [])

  const handleLayoutSelect = async (newId: string) => {
    setActiveLayoutId(newId)
    try {
      await saveSeatLayouts(layouts, newId)
    } catch (e) {
      console.error('アクティブレイアウトの保存に失敗しました:', e)
    }
  }

  const doShuffle = async () => {
    setShuffling(true)
    try {
      const settings = await fetchSettingsData()
      const currentActive =
        layouts.find(l => l.id === activeLayoutId) || layouts[0] || DEFAULT_LAYOUTS[0]
      const frontRowStudents =
        Array.isArray(currentActive.frontRowStudents)
          ? currentActive.frontRowStudents
          : (settings.frontRowStudents || [])

      const newSeatMap = performShuffle(
        settings.classmates,
        frontRowStudents,
        currentActive
      )

      setSeatMap(newSeatMap)
      setSwapMode(false)
      setSelectedSeatIdx(null)
      showToast('席替えを実行しました', 'success')
    } catch (error) {
      console.error('席替えデータの取得に失敗しました:', error)
      showToast('席替えに失敗しました', 'error')
    } finally {
      setShuffling(false)
    }
  }

  const doSave = async (currentSeatMap: SeatEntry[]) => {
    if (currentSeatMap.length === 0) {
      showToast('保存する座席データがありません', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await saveSeatData(currentSeatMap, 'save')
      const msg = res.firestore
        ? 'Firestoreデータベースと履歴に保存しました'
        : '履歴に保存しました'
      showToast(msg, 'success')
    } catch (error) {
      console.error('保存に失敗しました:', error)
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleShuffle = () => {
    if (shuffling) return
    doShuffle()
  }

  const handleSave = () => {
    if (saving) return
    doSave(seatMap)
  }

  // Swap mode handlers
  const toggleSwapMode = () => {
    setSwapMode(prev => !prev)
    setSelectedSeatIdx(null)
  }

  const handleSeatClick = useCallback((idx: number) => {
    if (selectedSeatIdx === null) {
      setSelectedSeatIdx(idx)
    } else if (selectedSeatIdx === idx) {
      setSelectedSeatIdx(null)
    } else {
      setSeatMap(prev => {
        const next = [...prev];
        [next[selectedSeatIdx], next[idx]] = [next[idx], next[selectedSeatIdx]]
        return next
      })
      setSelectedSeatIdx(null)
      showToast('席を交換しました', 'success')
    }
  }, [selectedSeatIdx])

  // Build canvas at full 1126px landscape width for share/export
  const getCanvas = async () => {
    if (!printAreaRef.current) return null
    return await html2canvas(printAreaRef.current, {
      scale: 4,
      useCORS: true,
      windowWidth: 1126,
      logging: false,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('print-target')
        if (el) {
          el.style.width = '1126px'
          el.style.boxSizing = 'border-box'
          el.style.setProperty('-webkit-font-smoothing', 'antialiased')
          el.style.setProperty('text-rendering', 'optimizeLegibility')
          el.style.setProperty('--bg', '#ffffff')
          el.style.setProperty('--text', '#1a1a1a')
          el.style.setProperty('--text-h', '#000000')
          el.style.setProperty('--border', '#a0a0a0')
          el.style.setProperty('--accent', '#8213e8')
          el.style.setProperty('--accent-bg', 'rgba(130, 19, 232, 0.05)')
        }
      }
    })
  }

  const downloadPDF = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) {
        showToast('画像の生成に失敗しました', 'error')
        return
      }

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
      let imgHeight = (canvas.height * imgWidth) / canvas.width

      // Ensure image fits within PDF page
      if (imgHeight > pdfHeight - margin * 2) {
        const scale = (pdfHeight - margin * 2) / imgHeight
        imgHeight = pdfHeight - margin * 2
        const adjustedWidth = imgWidth * scale
        const imgX = (pdfWidth - adjustedWidth) / 2
        const imgY = margin
        pdf.addImage(imgData, 'PNG', imgX, imgY, adjustedWidth, imgHeight, undefined, 'FAST')
      } else {
        const imgY = (pdfHeight - imgHeight) / 2
        pdf.addImage(imgData, 'PNG', margin, imgY, imgWidth, imgHeight, undefined, 'FAST')
      }

      pdf.save('seat-map.pdf')
      showToast('PDFをダウンロードしました', 'success')
    } catch (error) {
      console.error("PDFの出力に失敗しました:", error)
      showToast('PDFの出力に失敗しました', 'error')
    }
  }

  const shareImage = async () => {
    setSwapMode(false)
    setSelectedSeatIdx(null)
    await new Promise(r => setTimeout(r, 50))

    try {
      const canvas = await getCanvas()
      if (!canvas) { showToast('画像の生成に失敗しました', 'error'); return }

      if (navigator.share && navigator.canShare) {
        const blob = await new Promise<Blob | null>(resolve =>
          canvas.toBlob(resolve, 'image/png')
        )
        if (!blob) { showToast('画像の生成に失敗しました', 'error'); return }
        const file = new File([blob], 'seat-map.png', { type: 'image/png' })
        const shareData = { title: '座席表', text: '席替え結果', files: [file] }
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          showToast('共有しました', 'success')
          return
        }
      }

      // Fallback
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'seat-map.png'
      link.click()
      showToast('画像をダウンロードしました', 'info')
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('共有に失敗しました:', error)
        showToast('共有に失敗しました', 'error')
      }
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    )
  }

  const activeLayout = layouts.find(l => l.id === activeLayoutId) || layouts[0] || DEFAULT_LAYOUTS[0]

  return (
    <>
      <div className="action-bar">
        {/* 配置パターンの選択＆編集 */}
        <div className="action-group layout-selector-group">
          <label htmlFor="layout-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            配置パターン:
          </label>
          <select
            id="layout-select"
            className="layout-select"
            value={activeLayoutId}
            onChange={(e) => handleLayoutSelect(e.target.value)}
          >
            {layouts.map(l => {
              const seatCount = l.seats ? l.seats.filter(Boolean).length : 0
              return (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.columns}列×{l.rows}行 / {seatCount}席)
                </option>
              )
            })}
          </select>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowLayoutModal(true)}
            title="配置パターンを編集・作成"
          >
            配置編集
          </button>
        </div>

        {/* 席替え・手動交換・保存・出力アクション */}
        <div className="action-group">
          <button
            className="btn btn-primary"
            onClick={handleShuffle}
            disabled={shuffling}
          >
            {shuffling ? '処理中...' : '席替え'}
          </button>
          <button
            className={`btn ${swapMode ? 'btn-secondary' : 'btn-outline'}`}
            onClick={toggleSwapMode}
            disabled={seatMap.length === 0}
          >
            {swapMode ? '交換モード終了' : '手動交換'}
          </button>
          <button
            className="btn btn-outline"
            onClick={handleSave}
            disabled={saving || seatMap.length === 0}
          >
            {saving ? '保存中...' : '履歴に保存'}
          </button>
        </div>
        <div className="action-group">
          <button
            className="btn btn-outline"
            onClick={downloadPDF}
            disabled={seatMap.length === 0}
          >
            PDF
          </button>
          <button
            className="btn btn-outline"
            onClick={shareImage}
            disabled={seatMap.length === 0}
          >
            共有
          </button>
        </div>
      </div>

      {swapMode && (
        <div className="swap-status">
          {selectedSeatIdx !== null
            ? '交換相手の席をクリックしてください'
            : '交換したい席をクリックしてください'}
        </div>
      )}

      {seatMap.length > 0 ? (
        <div className="seat-scroll-container">
          <div
            id="print-target"
            ref={printAreaRef}
            style={{
              background: 'var(--bg)',
              padding: '32px',
              color: 'var(--text-h)',
              boxSizing: 'border-box',
            }}
          >
            <SeatMapping
              seatMap={seatMap}
              layout={activeLayout}
              onSeatClick={swapMode ? handleSeatClick : undefined}
              selectedSeatIdx={selectedSeatIdx}
              swapMode={swapMode}
            />
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>まだ席替えが行われていません</p>
          <p className="empty-state-sub">「席替え」ボタンを押して開始してください</p>
        </div>
      )}

      <LayoutEditorModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        activeLayoutId={activeLayoutId}
        currentLayouts={layouts}
        onLayoutsUpdated={(updatedLayouts, newActiveId) => {
          setLayouts(updatedLayouts)
          setActiveLayoutId(newActiveId)
        }}
        totalStudents={40}
      />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <h1 className="app-title">Seat Changer</h1>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            座席表
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            履歴
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            設定
          </NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<SeatPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
