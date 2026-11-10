import { useCallback, useState } from 'react'

function readStored<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function useHistory<T>(key: string, limit = 10): {
  items: T[]
  add: (item: T) => void
  clear: () => void
} {
  const [items, setItems] = useState<T[]>(() => readStored<T>(key))

  const add = useCallback(
    (item: T) => {
      setItems((previous) => {
        const next = [item, ...previous].slice(0, limit)
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // storage full or blocked: keep in memory only
        }
        return next
      })
    },
    [key, limit]
  )

  const clear = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [key])

  return { items, add, clear }
}
