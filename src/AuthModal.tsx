import { useState } from 'react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticated: (token: string, isPdfOnly?: boolean) => void
}

export default function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'seatchanger2026'
      const isPdf = password === 'export-pdf'
      const isAdmin = password === adminPassword

      if (!isAdmin && !isPdf) {
        // Netlify auth がある場合は念のため確認
        try {
          const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
          })
          if (response.ok) {
            const data = await response.json()
            localStorage.setItem('auth_token', data.token)
            localStorage.setItem('is_pdf_only', data.isPdfOnly ? 'true' : 'false')
            onAuthenticated(data.token, data.isPdfOnly)
            setPassword('')
            onClose()
            return
          }
        } catch {
          // ignore
        }

        setError('パスワードが正しくありません')
        return
      }

      // 認証成功トークンを生成
      const token = isPdf
        ? `pdf-token-${Date.now()}-pdf`
        : `admin-token-${Date.now()}`

      localStorage.setItem('auth_token', token)
      localStorage.setItem('is_pdf_only', isPdf ? 'true' : 'false')
      onAuthenticated(token, isPdf)
      setPassword('')
      onClose()
    } catch {
      setError('認証に失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="閉じる">✕</button>
        <h2 className="modal-title">管理者認証</h2>
        <p className="modal-description">操作を続けるにはパスワードを入力してください</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="modal-input"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            disabled={loading}
          />
          {error && <p className="modal-error">{error}</p>}
          <button
            type="submit"
            className="modal-submit"
            disabled={loading || !password}
          >
            {loading ? '認証中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
