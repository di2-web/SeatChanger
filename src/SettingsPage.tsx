import { useState, useEffect } from 'react'
import { showToast } from './Toast'
import LayoutEditorModal from './LayoutEditorModal'
import { type SeatLayout, DEFAULT_LAYOUTS } from './types/layout'
import {
  fetchSettingsData,
  fetchSeatLayouts,
  saveSeatLayouts,
  saveSettingsData,
  type Classmate,
} from './services/dataService'

export default function SettingsPage() {
  const [classmates, setClassmates] = useState<Classmate[]>([])
  const [layouts, setLayouts] = useState<SeatLayout[]>(DEFAULT_LAYOUTS)
  const [activeLayoutId, setActiveLayoutId] = useState<string>(DEFAULT_LAYOUTS[0].id)
  const [selectedPatternId, setSelectedPatternId] = useState<string>(DEFAULT_LAYOUTS[0].id)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let ignore = false

    const loadAllSettings = async () => {
      try {
        const [settingsResult, layoutsResult] = await Promise.all([
          fetchSettingsData(),
          fetchSeatLayouts(),
        ])

        if (!ignore) {
          setClassmates(settingsResult.classmates)

          if (layoutsResult.layouts && layoutsResult.layouts.length > 0) {
            // パターンごとの frontRowStudents が未初期化の場合は全体設定から補完
            const populatedLayouts = layoutsResult.layouts.map(l => ({
              ...l,
              frontRowStudents: Array.isArray(l.frontRowStudents)
                ? l.frontRowStudents
                : [...(settingsResult.frontRowStudents || [])],
            }))

            setLayouts(populatedLayouts)
            setActiveLayoutId(layoutsResult.activeLayoutId)

            // 選択中のパターンIDを有効なものに設定
            const targetId = populatedLayouts.some(l => l.id === layoutsResult.activeLayoutId)
              ? layoutsResult.activeLayoutId
              : populatedLayouts[0].id
            setSelectedPatternId(targetId)
          }
        }
      } catch (error) {
        console.error('設定の取得に失敗しました:', error)
        if (!ignore) {
          showToast('設定の取得に失敗しました', 'error')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadAllSettings()

    return () => {
      ignore = true
    }
  }, [])

  // 現在選択中のレイアウトオブジェクト
  const selectedLayout = layouts.find(l => l.id === selectedPatternId) || layouts[0] || DEFAULT_LAYOUTS[0]

  // 選択中パターンの前2列座席数を計算
  const maxFrontRowForSelected = (() => {
    if (!selectedLayout || !selectedLayout.seats) return 12
    const maxRowToCheck = Math.min(2, selectedLayout.rows)
    let count = 0
    for (let r = 0; r < maxRowToCheck; r++) {
      for (let c = 0; c < selectedLayout.columns; c++) {
        if (selectedLayout.seats[r * selectedLayout.columns + c]) {
          count++
        }
      }
    }
    return count > 0 ? count : 12
  })()

  // 選択中パターンの固定生徒番号リスト
  const currentFrontRowStudents = selectedLayout.frontRowStudents || []

  // 生徒のチェック切り替え
  const handleToggle = (studentNumber: number) => {
    setLayouts(prev =>
      prev.map(l => {
        if (l.id !== selectedPatternId) return l

        const current = l.frontRowStudents || []
        if (current.includes(studentNumber)) {
          return { ...l, frontRowStudents: current.filter(n => n !== studentNumber) }
        }

        if (current.length >= maxFrontRowForSelected) {
          showToast(`「${l.name}」の前2列に固定できるのは最大${maxFrontRowForSelected}人までです`, 'error')
          return l
        }

        return { ...l, frontRowStudents: [...current, studentNumber] }
      })
    )
  }

  // 現在選択中のパターンの固定生徒を全解除
  const handleClearCurrentPattern = () => {
    if (currentFrontRowStudents.length === 0) return
    setLayouts(prev =>
      prev.map(l =>
        l.id === selectedPatternId ? { ...l, frontRowStudents: [] } : l
      )
    )
    showToast(`「${selectedLayout.name}」の固定生徒を解除しました`, 'info')
  }

  // 現在のパターンの固定生徒を他の全パターンへコピー
  const handleCopyToAllPatterns = () => {
    if (layouts.length <= 1) return
    setLayouts(prev =>
      prev.map(l => ({
        ...l,
        frontRowStudents: [...currentFrontRowStudents],
      }))
    )
    showToast(`「${selectedLayout.name}」の固定生徒設定をすべての配置パターンに反映しました`, 'success')
  }

  // 保存処理 (Firestoreの /settings/layouts にパターン情報・固定生徒をまるごと保存)
  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. 各レイアウトに紐付く frontRowStudents を含めて保存
      const layoutRes = await saveSeatLayouts(layouts, activeLayoutId)

      // 2. 互換性のためにアクティブパターンの固定生徒を全体設定にも同期
      const activeLayout = layouts.find(l => l.id === activeLayoutId)
      if (activeLayout) {
        await saveSettingsData(activeLayout.frontRowStudents || [])
      }

      const msg = layoutRes.firestore
        ? 'パターンごとの固定設定をFirestoreに保存しました'
        : 'パターンごとの固定設定を保存しました'
      showToast(msg, 'success')
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

      {/* 座席配置パターン一覧セクション */}
      <div className="settings-section" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 className="settings-subtitle" style={{ margin: 0 }}>
            座席配置パターン
            <span className="settings-counter">{layouts.length} パターン</span>
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowLayoutModal(true)}
          >
            配置パターンを編集・作成
          </button>
        </div>
        <p className="settings-description">
          教室の机の並び（列数・行数・通路・机の配置）を複数パターン作成・編集・切り替えできます（Firestoreに自動保存されます）
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
          marginTop: '16px',
        }}>
          {layouts.map(layout => {
            const isActive = layout.id === activeLayoutId
            const isSelected = layout.id === selectedPatternId
            const seatCount = layout.seats ? layout.seats.filter(Boolean).length : 0
            const fixedCount = (layout.frontRowStudents || []).length

            return (
              <div
                key={layout.id}
                onClick={() => setSelectedPatternId(layout.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isSelected
                    ? '2px solid var(--accent)'
                    : isActive
                    ? '1.5px solid #22c55e'
                    : '1px solid var(--border)',
                  background: isSelected
                    ? 'var(--accent-bg)'
                    : isActive
                    ? 'rgba(34, 197, 94, 0.04)'
                    : 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="クリックしてこのパターンの固定設定を表示"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
                    {layout.name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isActive && <span className="active-badge" style={{ background: '#22c55e', color: '#fff' }}>適用中</span>}
                    {isSelected && <span className="active-badge">編集中</span>}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{layout.columns}列 × {layout.rows}行 ({seatCount}席)</span>
                  <span style={{ fontWeight: 600, color: fixedCount > 0 ? 'var(--accent)' : 'var(--text)' }}>
                    前列固定: {fixedCount}人
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* パターンごとの前2列固定生徒セクション */}
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <div>
            <h2 className="settings-subtitle" style={{ margin: 0 }}>
              パターンごとの前2列固定生徒
            </h2>
            <p className="settings-description" style={{ margin: '4px 0 0' }}>
              配置パターンごとに、視力や配慮が必要な生徒を前2列に優先配置する設定を行えます
            </p>
          </div>

          {/* パターン切り替えセレクター */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="pattern-setting-select" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              設定対象:
            </label>
            <select
              id="pattern-setting-select"
              className="layout-select"
              value={selectedPatternId}
              onChange={(e) => setSelectedPatternId(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              {layouts.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.id === activeLayoutId ? '（適用中）' : ''} (固定: {(l.frontRowStudents || []).length}人)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* パターン選択タブ（視覚的な切り替えタブ） */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            margin: '16px 0',
            padding: '4px',
            background: 'rgba(0,0,0,0.03)',
            borderRadius: '8px',
          }}
        >
          {layouts.map(layout => {
            const isSelected = layout.id === selectedPatternId
            const count = (layout.frontRowStudents || []).length
            return (
              <button
                key={layout.id}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedPatternId(layout.id)}
                style={{
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                }}
              >
                <span>{layout.name}</span>
                {layout.id === activeLayoutId && (
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>[適用中]</span>
                )}
                <span
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {count}人
                </span>
              </button>
            )
          })}
        </div>

        {/* 選択中パターンのステータス情報バー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--accent-bg)',
            border: '1px solid rgba(130, 19, 232, 0.2)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-h)' }}>
              「{selectedLayout.name}」の設定中
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--text)',
                background: 'var(--bg)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
              }}
            >
              前2列の座席数: 最大 <strong>{maxFrontRowForSelected}</strong> 席
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: currentFrontRowStudents.length > maxFrontRowForSelected ? '#dc2626' : 'var(--accent)',
              }}
            >
              固定生徒: {currentFrontRowStudents.length} / {maxFrontRowForSelected} 人
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {layouts.length > 1 && (
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={handleCopyToAllPatterns}
                title="このパターンの固定生徒を他の全パターンにも反映します"
              >
                全パターンへコピー
              </button>
            )}
            {currentFrontRowStudents.length > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={handleClearCurrentPattern}
                style={{ color: '#ef4444' }}
              >
                固定をクリア
              </button>
            )}
          </div>
        </div>

        {/* 生徒一覧チェックボックス */}
        <div className="student-grid">
          {classmates.map(student => {
            const isChecked = currentFrontRowStudents.includes(student.number)
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

        <div className="settings-actions" style={{ marginTop: '24px' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '設定を保存 (Firestore)'}
          </button>
        </div>
      </div>

      <LayoutEditorModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        activeLayoutId={activeLayoutId}
        currentLayouts={layouts}
        onLayoutsUpdated={(updatedLayouts, newActiveId) => {
          setLayouts(updatedLayouts)
          setActiveLayoutId(newActiveId)
          if (!updatedLayouts.some(l => l.id === selectedPatternId)) {
            setSelectedPatternId(newActiveId)
          }
        }}
        totalStudents={classmates.length || 40}
      />
    </div>
  )
}
