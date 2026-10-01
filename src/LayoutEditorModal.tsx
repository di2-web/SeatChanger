import { useState } from 'react'
import { type SeatLayout, DEFAULT_LAYOUTS } from './types/layout'
import { showToast } from './Toast'
import { saveSeatLayouts } from './services/dataService'

interface LayoutEditorModalProps {
  isOpen: boolean
  onClose: () => void
  authToken: string | null
  onRequireAuth?: () => void
  activeLayoutId: string
  currentLayouts: SeatLayout[]
  onLayoutsUpdated: (layouts: SeatLayout[], newActiveId: string) => void
  totalStudents?: number
}

interface LayoutEditorContentProps {
  onClose: () => void
  authToken: string | null
  onRequireAuth?: () => void
  activeLayoutId: string
  currentLayouts: SeatLayout[]
  onLayoutsUpdated: (layouts: SeatLayout[], newActiveId: string) => void
  totalStudents: number
}

function LayoutEditorContent({
  onClose,
  authToken,
  onRequireAuth,
  activeLayoutId,
  currentLayouts,
  onLayoutsUpdated,
  totalStudents,
}: LayoutEditorContentProps) {
  const baseLayouts = currentLayouts.length > 0 ? currentLayouts : DEFAULT_LAYOUTS
  const initialTargetId = activeLayoutId && baseLayouts.some(l => l.id === activeLayoutId)
    ? activeLayoutId
    : baseLayouts[0]?.id || DEFAULT_LAYOUTS[0].id
  const initialCurrent = baseLayouts.find(l => l.id === initialTargetId) || baseLayouts[0]

  const [layouts, setLayouts] = useState<SeatLayout[]>(baseLayouts)
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(initialTargetId)
  const [editingName, setEditingName] = useState(initialCurrent?.name || '')
  const [editingRows, setEditingRows] = useState(initialCurrent?.rows || 6)
  const [editingCols, setEditingCols] = useState(initialCurrent?.columns || 7)
  const [editingSeats, setEditingSeats] = useState<boolean[]>(
    initialCurrent?.seats ? [...initialCurrent.seats] : []
  )
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [dragMode, setDragMode] = useState<boolean | null>(null) // true: 座席にする, false: 通路にする
  const [saving, setSaving] = useState(false)

  // 選択されたレイアウトが変わったとき、編集フィールドを初期化
  const handleSelectLayout = (id: string) => {
    const target = layouts.find(l => l.id === id)
    if (target) {
      setSelectedLayoutId(id)
      setEditingName(target.name)
      setEditingRows(target.rows)
      setEditingCols(target.columns)
      setEditingSeats([...target.seats])
    }
  }

  // 行数・列数の変更
  const handleChangeDimensions = (newRows: number, newCols: number) => {
    const clampedRows = Math.max(2, Math.min(12, newRows))
    const clampedCols = Math.max(2, Math.min(12, newCols))

    const newSeats = new Array(clampedRows * clampedCols).fill(true)

    // 既存のセルの状態を可能な限り引き継ぐ
    for (let r = 0; r < Math.min(editingRows, clampedRows); r++) {
      for (let c = 0; c < Math.min(editingCols, clampedCols); c++) {
        const oldIndex = r * editingCols + c
        const newIndex = r * clampedCols + c
        if (oldIndex < editingSeats.length) {
          newSeats[newIndex] = editingSeats[oldIndex]
        }
      }
    }

    setEditingRows(clampedRows)
    setEditingCols(clampedCols)
    setEditingSeats(newSeats)

    // layouts 配列内も同期
    setLayouts(prev =>
      prev.map(l =>
        l.id === selectedLayoutId
          ? { ...l, rows: clampedRows, columns: clampedCols, seats: newSeats }
          : l
      )
    )
  }

  // セルのトグル処理
  const toggleCell = (index: number, mode?: boolean) => {
    setEditingSeats(prev => {
      const next = [...prev]
      const targetState = mode !== undefined ? mode : !next[index]
      next[index] = targetState

      setLayouts(pLayouts =>
        pLayouts.map(l =>
          l.id === selectedLayoutId
            ? { ...l, seats: next }
            : l
        )
      )

      return next
    })
  }

  const handleCellMouseDown = (index: number) => {
    setIsMouseDown(true)
    const nextState = !editingSeats[index]
    setDragMode(nextState)
    toggleCell(index, nextState)
  }

  const handleCellMouseEnter = (index: number) => {
    if (isMouseDown && dragMode !== null) {
      toggleCell(index, dragMode)
    }
  }

  const handleMouseUp = () => {
    setIsMouseDown(false)
    setDragMode(null)
  }

  // パターン名変更
  const handleNameChange = (name: string) => {
    setEditingName(name)
    setLayouts(prev =>
      prev.map(l =>
        l.id === selectedLayoutId
          ? { ...l, name }
          : l
      )
    )
  }

  // 新規パターン追加
  const handleAddNewPattern = () => {
    const newId = `layout-${Date.now()}`
    const defaultCols = 7
    const defaultRows = 6
    const newSeats = new Array(defaultRows * defaultCols).fill(true)
    // 40席になるよう2席をあらかじめ空席に
    newSeats[3] = false
    newSeats[6] = false

    const newLayout: SeatLayout = {
      id: newId,
      name: `新しい配置パターン ${layouts.length + 1}`,
      rows: defaultRows,
      columns: defaultCols,
      seats: newSeats,
    }

    const nextLayouts = [...layouts, newLayout]
    setLayouts(nextLayouts)
    setSelectedLayoutId(newId)
    setEditingName(newLayout.name)
    setEditingRows(defaultRows)
    setEditingCols(defaultCols)
    setEditingSeats(newSeats)
    showToast('新しい配置パターンを追加しました', 'info')
  }

  // パターンの複製
  const handleDuplicatePattern = () => {
    const current = layouts.find(l => l.id === selectedLayoutId)
    if (!current) return

    const newId = `layout-${Date.now()}`
    const newLayout: SeatLayout = {
      ...current,
      id: newId,
      name: `${current.name} (コピー)`,
      seats: [...editingSeats],
      isDefault: false,
      frontRowStudents: current.frontRowStudents ? [...current.frontRowStudents] : [],
    }

    const nextLayouts = [...layouts, newLayout]
    setLayouts(nextLayouts)
    setSelectedLayoutId(newId)
    setEditingName(newLayout.name)
    setEditingRows(newLayout.rows)
    setEditingCols(newLayout.columns)
    setEditingSeats([...newLayout.seats])
    showToast('配置パターンを複製しました', 'info')
  }

  // パターンの削除
  const handleDeletePattern = (id: string) => {
    if (layouts.length <= 1) {
      showToast('少なくとも1つのパターンが必要です', 'error')
      return
    }

    const nextLayouts = layouts.filter(l => l.id !== id)
    setLayouts(nextLayouts)

    const nextSelectedId = id === selectedLayoutId ? nextLayouts[0].id : selectedLayoutId
    setSelectedLayoutId(nextSelectedId)

    const nextCurrent = nextLayouts.find(l => l.id === nextSelectedId) || nextLayouts[0]
    setEditingName(nextCurrent.name)
    setEditingRows(nextCurrent.rows)
    setEditingCols(nextCurrent.columns)
    setEditingSeats([...nextCurrent.seats])
    showToast('パターンを削除しました', 'info')
  }

  // 全席を座席にリセット
  const handleFillAll = () => {
    const next = new Array(editingRows * editingCols).fill(true)
    setEditingSeats(next)
    setLayouts(prev =>
      prev.map(l =>
        l.id === selectedLayoutId
          ? { ...l, seats: next }
          : l
      )
    )
  }

  // 保存処理
  const handleSave = async (applyNow: boolean = false) => {
    const finalLayouts = layouts.map(l => {
      if (l.id === selectedLayoutId) {
        return {
          ...l,
          name: editingName.trim() || '無題のパターン',
          rows: editingRows,
          columns: editingCols,
          seats: editingSeats,
        }
      }
      return l
    })

    const finalActiveId = applyNow ? selectedLayoutId : activeLayoutId

    if (!authToken) {
      if (onRequireAuth) {
        onRequireAuth()
      } else {
        showToast('保存するには管理者ログインが必要です', 'error')
      }
      return
    }

    setSaving(true)
    try {
      const res = await saveSeatLayouts(finalLayouts, finalActiveId, authToken)
      onLayoutsUpdated(finalLayouts, finalActiveId)
      const msg = res.firestore
        ? (applyNow ? '配置パターンをFirestoreに保存し、適用しました' : '配置パターンをFirestoreに保存しました')
        : (applyNow ? '配置パターンを保存し、適用しました' : '配置パターンを保存しました')
      showToast(msg, 'success')
      onClose()
    } catch (error) {
      console.error('配置パターンの保存に失敗しました:', error)
      showToast('配置パターンの保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 座席数のカウント
  const activeSeatCount = editingSeats.filter(Boolean).length
  const seatDiff = activeSeatCount - totalStudents

  return (
    <div className="modal-overlay" onClick={onClose} onMouseUp={handleMouseUp}>
      <div
        className="modal-content layout-editor-modal"
        onClick={e => e.stopPropagation()}
        onMouseUp={handleMouseUp}
      >
        <div className="modal-header">
          <h2 className="modal-title">座席配置パターンの編集</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="layout-editor-body">
          {/* 左サイドバー: パターン一覧 */}
          <div className="layout-sidebar">
            <div className="layout-sidebar-header">
              <span className="layout-sidebar-title">登録パターン一覧</span>
              <button
                className="btn btn-outline btn-xs"
                onClick={handleAddNewPattern}
                title="新しいパターンを追加"
              >
                + 新規
              </button>
            </div>

            <div className="layout-pattern-list">
              {layouts.map(layout => {
                const isSelected = layout.id === selectedLayoutId
                const isActive = layout.id === activeLayoutId
                const seatCount = layout.seats ? layout.seats.filter(Boolean).length : 0

                return (
                  <div
                    key={layout.id}
                    className={`layout-pattern-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectLayout(layout.id)}
                  >
                    <div className="layout-pattern-info">
                      <div className="layout-pattern-title-row">
                        <span className="layout-pattern-name">{layout.name}</span>
                        {isActive && <span className="active-badge">使用中</span>}
                      </div>
                      <div className="layout-pattern-meta">
                        {layout.columns}列 × {layout.rows}行 ({seatCount}席)
                      </div>
                    </div>
                    {layouts.length > 1 && (
                      <button
                        className="layout-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePattern(layout.id)
                        }}
                        title="このパターンを削除"
                      >
                        削除
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="layout-sidebar-footer">
              <button
                className="btn btn-outline btn-sm w-100"
                onClick={handleDuplicatePattern}
              >
                現在のパターンを複製
              </button>
            </div>
          </div>

          {/* 右メインエリア: グリッドエディタ */}
          <div className="layout-editor-main">
            {/* パターン基本設定バー */}
            <div className="layout-controls-bar">
              <div className="control-field">
                <label className="control-label">パターン名</label>
                <input
                  type="text"
                  className="input-text pattern-name-input"
                  value={editingName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="パターン名を入力"
                />
              </div>

              <div className="dimension-controls">
                <div className="control-field">
                  <label className="control-label">横 (列)</label>
                  <div className="number-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => handleChangeDimensions(editingRows, editingCols - 1)}
                      disabled={editingCols <= 2}
                    >
                      -
                    </button>
                    <span className="stepper-val">{editingCols}</span>
                    <button
                      className="stepper-btn"
                      onClick={() => handleChangeDimensions(editingRows, editingCols + 1)}
                      disabled={editingCols >= 12}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="control-field">
                  <label className="control-label">縦 (行)</label>
                  <div className="number-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => handleChangeDimensions(editingRows - 1, editingCols)}
                      disabled={editingRows <= 2}
                    >
                      -
                    </button>
                    <span className="stepper-val">{editingRows}</span>
                    <button
                      className="stepper-btn"
                      onClick={() => handleChangeDimensions(editingRows + 1, editingCols)}
                      disabled={editingRows >= 12}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleFillAll}
                  title="すべてのマスを机（座席）にする"
                >
                  全席配置
                </button>
              </div>
            </div>

            {/* 座席数ステータスバー */}
            <div className="layout-status-bar">
              <div className="seat-count-badge-group">
                <span className="seat-count-label">配置可能な机:</span>
                <span className="seat-count-number">{activeSeatCount} 席</span>
                <span className="seat-count-target">/ 生徒 {totalStudents} 名</span>
              </div>
              <div className="seat-count-message">
                {seatDiff === 0 ? (
                  <span className="status-badge status-ok">生徒数とぴったり一致しています</span>
                ) : seatDiff > 0 ? (
                  <span className="status-badge status-warn">
                    {seatDiff} 席の余りがあります（席替え時に空席となります）
                  </span>
                ) : (
                  <span className="status-badge status-error">
                    {Math.abs(seatDiff)} 席不足しています（{Math.abs(seatDiff)} 名が座れません）
                  </span>
                )}
              </div>
            </div>

            <div className="layout-helper-hint">
              マスをクリックまたはドラッグすると「机（座席）」と「通路（空白）」を切り替えられます
            </div>

            {/* グリッド編集領域 */}
            <div className="layout-grid-canvas-container" onMouseLeave={handleMouseUp}>
              <div className="editor-teacher-desk">教卓 (前方)</div>
              <div
                className="layout-interactive-grid"
                style={{
                  gridTemplateColumns: `repeat(${editingCols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: editingRows * editingCols }).map((_, idx) => {
                  const isSeat = editingSeats[idx] ?? true
                  const rowIdx = Math.floor(idx / editingCols) + 1
                  const colIdx = (idx % editingCols) + 1

                  return (
                    <div
                      key={idx}
                      className={`grid-editor-cell ${isSeat ? 'is-seat' : 'is-aisle'}`}
                      onMouseDown={() => handleCellMouseDown(idx)}
                      onMouseEnter={() => handleCellMouseEnter(idx)}
                    >
                      {isSeat ? (
                        <div className="seat-inner-box">
                          <span className="seat-cell-coord">
                            {rowIdx}-{colIdx}
                          </span>
                        </div>
                      ) : (
                        <div className="aisle-inner-box">
                          <span className="aisle-label">通路</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="modal-footer layout-editor-footer">
          <div className="footer-left">
            <span className="footer-tip">
              ※編集した配置パターンはサーバーに保存され、席替えや座席表に反映されます
            </span>
          </div>
          <div className="footer-right">
            <button className="btn btn-outline" onClick={onClose} disabled={saving}>
              キャンセル
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存のみ'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSave(true)}
              disabled={saving || activeSeatCount < totalStudents}
              title={activeSeatCount < totalStudents ? '生徒数以上の座席が必要です' : ''}
            >
              {saving ? '適用中...' : '保存してこの配置を適用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LayoutEditorModal({
  isOpen,
  onClose,
  authToken,
  onRequireAuth,
  activeLayoutId,
  currentLayouts,
  onLayoutsUpdated,
  totalStudents = 40,
}: LayoutEditorModalProps) {
  if (!isOpen) return null

  return (
    <LayoutEditorContent
      onClose={onClose}
      authToken={authToken}
      onRequireAuth={onRequireAuth}
      activeLayoutId={activeLayoutId}
      currentLayouts={currentLayouts}
      onLayoutsUpdated={onLayoutsUpdated}
      totalStudents={totalStudents}
    />
  )
}
