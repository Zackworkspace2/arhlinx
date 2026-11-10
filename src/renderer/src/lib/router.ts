import { useCallback, useEffect, useState } from 'react'
import { isRouteId, type RouteId } from '../navigation'

const FALLBACK: RouteId = 'dashboard'

function parseHash(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '')
  return isRouteId(id) ? id : FALLBACK
}

export function useRoute(): { route: RouteId; navigate: (id: RouteId) => void } {
  const [route, setRoute] = useState<RouteId>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = (): void => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((id: RouteId) => {
    window.location.hash = `/${id}`
  }, [])

  return { route, navigate }
}
