import { useState, useEffect, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  text: string
  type: ToastType
}

let toastIdCounter = 0
let addToastGlobal: ((text: string, type: ToastType) => void) | null = null

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(text: string, type: ToastType = 'info') {
  if (addToastGlobal) {
    addToastGlobal(text, type)
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((text: string, type: ToastType) => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    addToastGlobal = addToast
    return () => {
      addToastGlobal = null
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          <span className="toast-text">{toast.text}</span>
        </div>
      ))}
    </div>
  )
}
