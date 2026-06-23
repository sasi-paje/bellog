/**
 * Hook para gerenciar diálogos de confirmação
 */
import { useState, useCallback } from 'react'

interface UseConfirmationOptions<T> {
  onConfirm: (data: T) => Promise<void>
  onCancel?: () => void
}

interface UseConfirmationResult<T> {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  data: T | null
  open: (data: T) => void
  close: () => void
  confirm: () => Promise<void>
}

export function useConfirmation<T>({
  onConfirm,
  onCancel,
}: UseConfirmationOptions<T>): UseConfirmationResult<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)

  const open = useCallback((newData: T) => {
    setData(newData)
    setError(null)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
      setData(null)
      setError(null)
      onCancel?.()
    }
  }, [isLoading, onCancel])

  const confirm = useCallback(async () => {
    if (!data) return

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm(data)
      setIsOpen(false)
      setData(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao confirmar'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [data, onConfirm])

  return { isOpen, isLoading, error, data, open, close, confirm }
}

export default useConfirmation