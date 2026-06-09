import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import SeatMapping from './SeatComponents'
import AuthModal from './AuthModal'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import { ToastContainer, showToast } from './Toast'
import html2canvas from 'html2canvas'
import './App.css'

function SeatPage() {
  const [seatMap, setSeatMap] = useState<{ number: number, name: string, ruby: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [shuffling, setShuffling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const printAreaRef = useRef<HTMLDivElement>(null)

  // Fetch initial data (no auth required for viewing)
  useEffect(() => {
    let ignore = false
    const fetchInitialData = async () => {
      try {
        // Try to load current saved seat from database
        const response = await fetch('/.netlify/functions/getSeatHistory')
        if (response.ok) {
          const history = await response.json()
          if (!ignore && history.length > 0) {
            setSeatMap(history[0].seatMap)
            setLoading(false)
            return
          }
        }
        // Fallback: no history, show empty state
        if (!ignore) {
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

  const requireAuth = useCallback((action: string) => {
    setPendingAction(action)
    setShowAuthModal(true)
  }, [])

  const doShuffle = async (token: string) => {
    setShuffling(true)
    try {
      const response = await fetch('/.netlify/functions/changeSeat', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        setAuthToken(null)
        requireAuth('shuffle')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      setSeatMap(data)
      showToast('席替えを実行しました', 'success')
    } catch (error) {
      console.error("席替えデータの取得に失敗しました:", error)
      showToast('席替えに失敗しました', 'error')
    } finally {
      setShuffling(false)
    }
  }

  const doSave = async (token: string) => {
    if (seatMap.length === 0) {
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
        body: JSON.stringify({ seatMap }),
      })

      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        setAuthToken(null)
        requireAuth('save')
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      showToast('座席配置を保存しました', 'success')
    } catch (error) {
      console.error("保存に失敗しました:", error)
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAuthenticated = useCallback((token: string) => {
    setAuthToken(token)
    setShowAuthModal(false)
    // Execute pending action
    if (pendingAction === 'shuffle') {
      doShuffle(token)
    } else if (pendingAction === 'save') {
      doSave(token)
    }
    setPendingAction(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, seatMap])

  const handleShuffle = () => {
    if (shuffling) return
    if (!authToken) {
      requireAuth('shuffle')
      return
    }
    doShuffle(authToken)
  }

  const handleSave = () => {
    if (saving) return
    if (!authToken) {
      requireAuth('save')
      return
    }
    doSave(authToken)
  }

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
      if (!canvas) {
        showToast('画像の生成に失敗しました', 'error')
        return
      }

      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'seat-map.png'
      link.click()
      showToast('PNGをダウンロードしました', 'success')
    } catch (error) {
      console.error("PNGの出力に失敗しました:", error)
      showToast('PNGの出力に失敗しました', 'error')
    }
  }

  const shareImage = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) {
        showToast('画像の生成に失敗しました', 'error')
        return
      }

      // Try Web Share API first
      if (navigator.share && navigator.canShare) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        )
        if (!blob) {
          showToast('画像の生成に失敗しました', 'error')
          return
        }

        const file = new File([blob], 'seat-map.png', { type: 'image/png' })
        const shareData = {
          title: '座席表',
          text: '席替え結果',
          files: [file],
        }

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
          showToast('共有しました', 'success')
          return
        }
      }

      // Fallback: Download image and open LINE share
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'seat-map.png'
      link.click()

      // Open LINE share (text only, user attaches downloaded image)
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent('席替え結果を共有します！画像を添付してください。')}`
      window.open(lineUrl, '_blank')
      showToast('画像をダウンロードしました。LINEで共有してください。', 'info')
    } catch (error) {
      // User may have cancelled the share dialog
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("共有に失敗しました:", error)
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
        <div className="action-group">
          <button
            className="btn btn-primary"
            onClick={handleShuffle}
            disabled={shuffling}
          >
            {shuffling ? '処理中...' : '席替え'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSave}
            disabled={saving || seatMap.length === 0}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        <div className="action-group">
          <button
            className="btn btn-outline"
            onClick={downloadPNG}
            disabled={seatMap.length === 0}
          >
            PNG
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

      {seatMap.length > 0 ? (
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
      ) : (
        <div className="empty-state">
          <p>まだ席替えが行われていません</p>
          <p className="empty-state-sub">「席替え」ボタンを押して開始してください</p>
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
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem('auth_token')
  )
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleRequireAuth = () => {
    setShowAuthModal(true)
  }

  const handleAuthenticated = (token: string) => {
    setAuthToken(token)
    setShowAuthModal(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setAuthToken(null)
    showToast('ログアウトしました', 'info')
  }

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
        <div className="auth-status">
          {authToken ? (
            <button className="btn btn-ghost" onClick={handleLogout}>
              ログアウト
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleRequireAuth}>
              ログイン
            </button>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<SeatPage />} />
          <Route
            path="/history"
            element={
              <HistoryPage
                authToken={authToken}
                onRequireAuth={handleRequireAuth}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                authToken={authToken}
                onRequireAuth={handleRequireAuth}
              />
            }
          />
        </Routes>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
      />
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App