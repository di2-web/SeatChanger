import { useState, useEffect } from 'react'
import SeatMapping from './SeatComponents'
import { showToast } from './Toast'
import { fetchSeatHistory, saveSeatData, type HistoryEntry } from './services/dataService'

interface HistoryPageProps {
  authToken: string | null
  onRequireAuth: () => void
}

export default function HistoryPage({ authToken, onRequireAuth }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [restoringKey, setRestoringKey] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false

    const loadHistory = async () => {
      try {
        const data = await fetchSeatHistory()
        if (!ignore) {
          setHistory(data)
        }
      } catch (error) {
        console.error('履歴の取得に失敗しました:', error)
        if (!ignore) {
          showToast('履歴の取得に失敗しました', 'error')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadHistory()

    return () => {
      ignore = true
    }
  }, [])

  const handleRestore = async (entry: HistoryEntry) => {
    if (!authToken) {
      onRequireAuth()
      return
    }

    setRestoringKey(entry.key)
    try {
      const res = await saveSeatData(entry.seatMap, 'restore', authToken)
      const msg = res.firestore
        ? '座席配置をFirestoreに保存・復元しました'
        : '座席配置を復元しました'
      showToast(msg, 'success')
    } catch (error) {
      console.error('復元に失敗しました:', error)
      showToast('復元に失敗しました', 'error')
    } finally {
      setRestoringKey(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>席替え履歴</h1>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>まだ履歴がありません</p>
          <p className="empty-state-sub">
            席替え後に「履歴に保存」を実行するとFirestoreに自動保存されます
          </p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.key} className="history-card">
              <div
                className="history-header"
                onClick={() => setExpandedKey(expandedKey === entry.key ? null : entry.key)}
              >
                <div className="history-date">
                  {formatDate(entry.createdAt)}
                  {entry.action === 'restore' && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text)', opacity: 0.8 }}>
                      (復元)
                    </span>
                  )}
                </div>
                <span className={`history-expand-icon ${expandedKey === entry.key ? 'expanded' : ''}`}>
                  ▸
                </span>
              </div>

              {expandedKey === entry.key && (
                <div className="history-detail">
                  <div className="history-seat-preview">
                    <SeatMapping seatMap={entry.seatMap} />
                  </div>
                  <div className="history-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRestore(entry)}
                      disabled={restoringKey === entry.key}
                    >
                      {restoringKey === entry.key ? '復元中...' : 'この配置を復元'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
