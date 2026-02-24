'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ClassificationState } from '@/lib/types'

interface UseClassifyReturn {
  state: ClassificationState
  discover: () => void
  classify: () => void
  isRunning: boolean
}

/** Response shape from GET /api/topics/status */
interface StatusResponse {
  data: ClassificationState
}

const DEFAULT_STATE: ClassificationState = {
  status: 'idle',
  phase: null,
  progressCurrent: 0,
  progressTotal: 0,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
}

export function useClassify(): UseClassifyReturn {
  const router = useRouter()
  const [state, setState] = useState<ClassificationState>(DEFAULT_STATE)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/topics/status')
      if (!res.ok) return
      const data: StatusResponse = await res.json()
      setState(data.data)
      if (data.data.status === 'discovering' || data.data.status === 'classifying') {
        pollRef.current = setTimeout(poll, 2000)
      } else {
        // Completed or errored — refresh page data
        router.refresh()
      }
    } catch {
      // silent — next poll or manual refresh will recover
    }
  }, [router])

  const discover = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'discovering' as const }))
    try {
      const res = await fetch('/api/topics/discover', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Discovery failed' }))
        setState((prev) => ({ ...prev, status: 'error' as const, errorMessage: body.error ?? 'Discovery failed' }))
        return
      }
      poll()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error' as const,
        errorMessage: err instanceof Error ? err.message : 'Discovery failed',
      }))
    }
  }, [poll])

  const classify = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'classifying' as const }))
    try {
      const res = await fetch('/api/topics/classify', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Classification failed' }))
        setState((prev) => ({ ...prev, status: 'error' as const, errorMessage: body.error ?? 'Classification failed' }))
        return
      }
      poll()
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error' as const,
        errorMessage: err instanceof Error ? err.message : 'Classification failed',
      }))
    }
  }, [poll])

  // Load initial state on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/topics/status')
        if (!res.ok || cancelled) return
        const data: StatusResponse = await res.json()
        if (!cancelled) {
          setState(data.data)
          // If already running (e.g. another tab), start polling
          if (data.data.status === 'discovering' || data.data.status === 'classifying') {
            poll()
          }
        }
      } catch {
        // leave defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [poll])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const isRunning = state.status === 'discovering' || state.status === 'classifying'

  return { state, discover, classify, isRunning }
}
