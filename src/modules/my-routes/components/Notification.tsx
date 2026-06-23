/**
 * Notification - Componente de notificação reutilizável
 */
import React, { useEffect } from 'react'

type NotificationType = 'success' | 'error' | 'warning'

interface NotificationProps {
  type: NotificationType
  message: string
  onClose: () => void
  autoCloseMs?: number
}

export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  autoCloseMs = 3000,
}) => {
  useEffect(() => {
    if (autoCloseMs > 0) {
      const timer = setTimeout(onClose, autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [autoCloseMs, onClose])

  const bgColors = {
    success: 'bg-green-50 border-green-500',
    error: 'bg-red-50 border-red-500',
    warning: 'bg-yellow-50 border-yellow-500',
  }

  const textColors = {
    success: 'text-green-700',
    error: 'text-red-700',
    warning: 'text-yellow-700',
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-[6px] shadow-lg border ${bgColors[type]}`}
      >
        <p className={`text-[14px] font-medium ${textColors[type]}`}>
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[18px] font-bold ml-2"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default Notification