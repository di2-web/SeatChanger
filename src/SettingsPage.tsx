import { useState, useEffect } from 'react'
import { showToast } from './Toast'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const MAX_FRONT_ROW = 12

  useEffect(() => {
    // 関数を useEffect の中に直接定義します
    const fetchSettings = async () => {
      try {
        const response = await fetch('/.netlify/functions/getSettings')
        if (!response.ok) {
          throw new Error('設定の取得に失敗しました')
        }
        const data = await response.json()
        setClassmates(data.classmates)
        setFrontRowStudents(data.frontRowStudents || [])
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

      <div className="settings-section">
        <h2 className="settings-subtitle">
          前2列に固定する生徒
          <span className="settings-counter">
            {frontRowStudents.length} / {MAX_FRONT_ROW}
          </span>
        </h2>
        <p className="settings-description">
          チェックした生徒は席替え時に前2列（最前列5席 + 2列目7席）に配置されます
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
    </div>
  )
}
