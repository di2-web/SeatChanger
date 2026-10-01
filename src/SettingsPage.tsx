import { useState, useEffect } from 'react'
import { showToast } from './Toast'
import LayoutEditorModal from './LayoutEditorModal'
import { type SeatLayout, DEFAULT_LAYOUTS } from './types/layout'

interface Classmate {
  number: number
  name: string
  ruby: string
}

interface SettingsPageProps {
  authToken: string | null
  onRequireAuth: () => void
}

export default function SettingsPage({ authToken, onRequireAuth }: SettingsPageProps) {
  const [classmates, setClassmates] = useState<Classmate[]>([])
  const [frontRowStudents, setFrontRowStudents] = useState<number[]>([])
  const [layouts, setLayouts] = useState<SeatLayout[]>(DEFAULT_LAYOUTS)
  const [activeLayoutId, setActiveLayoutId] = useState<string>(DEFAULT_LAYOUTS[0].id)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const MAX_FRONT_ROW = 12

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsPromise = fetch('/.netlify/functions/getSettings')
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)

        const layoutsPromise = fetch('/.netlify/functions/getLayouts')
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)

        const [settingsData, layoutsData] = await Promise.all([settingsPromise, layoutsPromise])

        if (settingsData) {
          setClassmates(settingsData.classmates || [])
          setFrontRowStudents(settingsData.frontRowStudents || [])
        }

        if (layoutsData && Array.isArray(layoutsData.layouts) && layoutsData.layouts.length > 0) {
          setLayouts(layoutsData.layouts)
          if (layoutsData.activeLayoutId) {
            setActiveLayoutId(layoutsData.activeLayoutId)
          }
        }
      } catch (error) {
        console.error('設定の取得に失敗しました:', error)
        showToast('設定の取得に失敗しました', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleToggle = (studentNumber: number) => {
    setFrontRowStudents(prev => {
      if (prev.includes(studentNumber)) {
        return prev.filter(n => n !== studentNumber)
      }
      if (prev.length >= MAX_FRONT_ROW) {
        showToast(`前2列に固定できるのは最大${MAX_FRONT_ROW}人までです`, 'error')
        return prev
      }
      return [...prev, studentNumber]
    })
  }

  const handleSave = async () => {
    if (!authToken) {
      onRequireAuth()
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/.netlify/functions/saveSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ frontRowStudents }),
      })

      if (response.status === 401) {
        onRequireAuth()
        return
      }

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました')
      }

      showToast('設定を保存しました', 'success')
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      showToast('設定の保存に失敗しました', 'error')
    } finally {
      setSaving(false)
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
    <div className="page-container">
      <h1 className="page-title">設定</h1>

      {/* 座席配置パターン管理セクション */}
      <div className="settings-section" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 className="settings-subtitle" style={{ margin: 0 }}>
            座席配置パターン
            <span className="settings-counter">{layouts.length} パターン</span>
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (!authToken) {
                onRequireAuth()
                return
              }
              setShowLayoutModal(true)
            }}
          >
            配置パターンを編集・作成
          </button>
        </div>
        <p className="settings-description">
          教室の机の並び（列数・行数・通路・机の配置）を複数パターン作成・編集・切り替えできます
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}>
          {layouts.map(layout => {
            const isActive = layout.id === activeLayoutId
            const seatCount = layout.seats ? layout.seats.filter(Boolean).length : 0
            return (
              <div
                key={layout.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-bg)' : 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                    {layout.name}
                  </span>
                  {isActive && <span className="active-badge">適用中</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                  {layout.columns}列 × {layout.rows}行 ({seatCount}席)
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-subtitle">
          前2列に固定する生徒
          <span className="settings-counter">
            {frontRowStudents.length} / {MAX_FRONT_ROW}
          </span>
        </h2>
        <p className="settings-description">
          チェックした生徒は席替え時に前2列に優先配置されます
        </p>

        <div className="student-grid">
          {classmates.map(student => {
            const isChecked = frontRowStudents.includes(student.number)
            return (
              <label
                key={student.number}
                className={`student-checkbox ${isChecked ? 'checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(student.number)}
                />
                <span className="student-number">{student.number}</span>
                <span className="student-name">{student.name}</span>
              </label>
            )
          })}
        </div>

        <div className="settings-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      </div>

      <LayoutEditorModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        authToken={authToken}
        onRequireAuth={() => {
          setShowLayoutModal(false)
          onRequireAuth()
        }}
        activeLayoutId={activeLayoutId}
        currentLayouts={layouts}
        onLayoutsUpdated={(updatedLayouts, newActiveId) => {
          setLayouts(updatedLayouts)
          setActiveLayoutId(newActiveId)
        }}
        totalStudents={classmates.length || 40}
      />
    </div>
  )
}
