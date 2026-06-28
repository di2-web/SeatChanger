import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import SeatMapping from './SeatComponents'
import AuthModal from './AuthModal'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import { ToastContainer, showToast } from './Toast'
import html2canvas from 'html2canvas'
import './App.css'

interface SeatEntry {
  number: number
  name: string
  ruby: string
}

interface SeatPageProps {
  authToken: string | null
  onAuthChange: (token: string | null) => void
}

function SeatPage({ authToken, onAuthChange }: SeatPageProps) {
  const [seatMap, setSeatMap] = useState<SeatEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Swap mode
  const [swapMode, setSwapMode] = useState(false)
  const [selectedSeatIdx, setSelectedSeatIdx] = useState<number | null>(null)

  const printAreaRef = useRef<HTMLDivElement>(null)

  // Fetch latest seat from history on mount
  useEffect(() => {
    let ignore = false
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/.netlify/functions/getSeatHistory')
        if (response.ok) {
          const history = await response.json()
          if (!ignore && history.length > 0) {
            setSeatMap(history[0].seatMap)
            setLoading(false)
            return
          }
        }
        if (!ignore) setLoading(false)
      } catch (error) {
        console.error('初回データの取得に失敗しました:', error)
        if (!ignore) setLoading(false)
      }
    }
    fetchInitialData()
    return () => { ignore = true }
  }, [])

  const requireAuth = useCallback((action: string) => {
    setPendingAction(action)
    setShowAuthModal(true)
  }, [])

  const doShuffle = async (token: string) => {
    setShuffling(true)
    try {
      const response = await fetch('/.netlify/functions/changeSeat', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        onAuthChange(null)
        requireAuth('shuffle')
        return
      }
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      const data = await response.json()
      setSeatMap(data)
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

  const doSave = async (token: string, currentSeatMap: SeatEntry[]) => {
    if (currentSeatMap.length === 0) {
      showToast('保存する座席データがありません', 'error')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/.netlify/functions/saveSeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ seatMap: currentSeatMap }),
      })
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        onAuthChange(null)
        requireAuth('save')
        return
      }
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      showToast('履歴に保存しました', 'success')
    } catch (error) {
      console.error('保存に失敗しました:', error)
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  // seatMap is explicitly passed to doSave to avoid stale closure issues
  const handleAuthenticated = useCallback((token: string) => {
    onAuthChange(token)
    setShowAuthModal(false)
    if (pendingAction === 'shuffle') {
      doShuffle(token)
    } else if (pendingAction === 'save') {
      doSave(token, seatMap)
    }
    setPendingAction(null)
  // doShuffle is stable (no closure over seatMap), doSave receives seatMap as arg
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, seatMap, onAuthChange])

  const handleShuffle = () => {
    if (shuffling) return
    if (!authToken) { requireAuth('shuffle'); return }
    doShuffle(authToken)
  }

  const handleSave = () => {
    if (saving) return
    if (!authToken) { requireAuth('save'); return }
    doSave(authToken, seatMap)
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

  const shareImage = async () => {
    // Reset swap UI before capturing
    setSwapMode(false)
    setSelectedSeatIdx(null)
    // Small delay to let React re-render without selection state
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

      // Fallback: download
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

  return (
    <>
      <div className="action-bar">
        {authToken ? (
          <>
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
                onClick={shareImage}
                disabled={seatMap.length === 0}
              >
                共有
              </button>
            </div>
          </>
        ) : (
          <div className="action-group">
            {/* 未ログイン時は表示・共有機能のみに制限 */}
            <button
              className="btn btn-outline"
              onClick={shareImage}
              disabled={seatMap.length === 0}
            >
              共有
            </button>
          </div>
        )}
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
              onSeatClick={swapMode ? handleSeatClick : undefined}
              selectedSeatIdx={selectedSeatIdx}
              swapMode={swapMode}
            />
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>まだ席替えが行われていません</p>
          {authToken ? (
            <p className="empty-state-sub">「席替え」ボタンを押して開始してください</p>
          ) : (
            <p className="empty-state-sub">管理者がログインして席替えを行うとここに表示されます</p>
          )}
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setPendingAction(null)
        }}
        onAuthenticated={handleAuthenticated}
      />
    </>
  )
}

function App() {
  // Single source of truth for auth state
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleAuthChange = useCallback((token: string | null) => {
    setAuthToken(token)
    if (!token) localStorage.removeItem('auth_token')
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setAuthToken(null)
    showToast('ログアウトしました', 'info')
  }

  // Header login button authenticated: just update state, no pending action
  const handleHeaderAuthenticated = (token: string) => {
    setAuthToken(token)
    setShowAuthModal(false)
  }

  return (
    <BrowserRouter>
      <header className="app-header">
        <h1 className="app-title">Seat Changer</h1>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            座席表
          </NavLink>
          {/* ログイン中のみメニューを表示 */}
          {authToken && (
            <>
              <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                履歴
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                設定
              </NavLink>
            </>
          )}
        </nav>
        <div className="auth-status">
          {authToken ? (
            <button className="btn btn-ghost" onClick={handleLogout}>
              ログアウト
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setShowAuthModal(true)}>
              ログイン
            </button>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={<SeatPage authToken={authToken} onAuthChange={handleAuthChange} />}
          />
          {/* 未ログイン時はルートガードでトップページへ強制リダイレクト */}
          <Route
            path="/history"
            element={
              authToken ? (
                <HistoryPage
                  authToken={authToken}
                  onRequireAuth={() => setShowAuthModal(true)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              authToken ? (
                <SettingsPage
                  authToken={authToken}
                  onRequireAuth={() => setShowAuthModal(true)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          {/* 存在しないURLや未対応のパスにアクセスした場合はトップにリダイレクト */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Header-level auth modal (no pending action) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleHeaderAuthenticated}
      />
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App