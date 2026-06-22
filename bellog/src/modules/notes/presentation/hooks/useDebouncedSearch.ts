import { useState, useCallback, useEffect, useRef } from 'react'

interface UseDebouncedSearchOptions {
  debounceMs?: number
  onValueChange?: (value: string) => void
}

export function useDebouncedSearch<T>(
  searchFn: (value: string) => Promise<T>,
  options: UseDebouncedSearchOptions = {}
) {
  const { debounceMs = 300, onValueChange } = options

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')
  const [result, setResult] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(searchTerm)
      onValueChange?.(searchTerm)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [searchTerm, debounceMs, onValueChange])

  useEffect(() => {
    if (!debouncedValue && !searchTerm) {
      setResult(null)
      return
    }

    let cancelled = false

    const performSearch = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setIsLoading(true)

      try {
        const data = await searchFn(debouncedValue)
        if (!cancelled) {
          setResult(data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[useDebouncedSearch] Search error:', error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    performSearch()

    return () => {
      cancelled = true
      abortControllerRef.current?.abort()
    }
  }, [debouncedValue, searchFn])

  const clear = useCallback(() => {
    setSearchTerm('')
    setDebouncedValue('')
    setResult(null)
    setIsLoading(false)
  }, [])

  return {
    searchTerm,
    debouncedSearchTerm: debouncedValue,
    result,
    isLoading,
    isTyping: searchTerm !== debouncedValue,
    setSearchTerm,
    clear,
  }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}