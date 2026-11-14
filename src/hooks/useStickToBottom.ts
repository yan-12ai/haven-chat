import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const THRESHOLD_PX = 80

/**
 * Keeps a scroll container pinned to the bottom while new content arrives –
 * but only if the user is already near the bottom. If they've scrolled up to
 * read something, we leave them alone and offer a "jump to latest" button instead.
 */
export function useStickToBottom<T extends HTMLElement>(contentVersion: unknown) {
  const ref = useRef<T>(null)
  const pinnedRef = useRef(true)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD_PX
      pinnedRef.current = atBottom
      setIsAtBottom(atBottom)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // useLayoutEffect so the scroll happens before paint – no visible jump.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight
  }, [contentVersion])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = ref.current
    if (!el) return
    pinnedRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  return { ref, isAtBottom, scrollToBottom }
}
