import { useState, useEffect } from 'react'
import SeatMapping from './SeatComponents'
import { showToast } from './Toast'

interface HistoryEntry {
  key: string
  seatMap: { number: number; name: string; ruby: string }[]
  createdAt: string
}

interface HistoryPageProps {
  authToken: string | null
  onRequireAuth: () => void
}

export default function HistoryPage({ authToken, onRequireAuth }: HistoryPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  useEffect(() => {
    // 関数を useEffect の中に直接定義します
    const fetchHistory = async () => {
      try {
        const response = await fetch('/.netlify/functions/getSeatHistory')
        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました')
        }
        const data = await response.json()
        setHistory(data)
      } catch (error) {
        console.error('履歴の取得に失敗しました:', error)
        showToast('履歴の取得に失敗しました', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const handleRestore = async (entry: HistoryEntry) => {
    if (!authToken) {
      onRequireAuth()
      return
    }

    try {
      const response = await fetch('/.netlify/functions/saveSeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          seatMap: entry.seatMap,
          action: 'restore',
        }),
      })

      if (response.status === 401) {
        onRequireAuth()
        return
      }

      if (!response.ok) {
        throw new Error('復元に失敗しました')
      }

      showToast('座席配置を復元しました', 'success')
    } catch (error) {
      console.error('復元に失敗しました:', error)
      showToast('復元に失敗しました', 'error')
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
      <h1 className="page-title">席替え履歴</h1>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>まだ履歴がありません</p>
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
                    >
                      この配置を復元
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
