'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SyncState } from '@/lib/types'

interface UseSyncReturn {
  status: SyncState['status']
  lastSyncAt: string | null
  totalCount: number
  error: string | undefined
  isLoading: boolean
  startSync: () => void
}

/** Response shape from GET /api/sync/status */
interface StatusResponse {
  lastSyncAt: string | null
  totalSynced: number
  status: SyncState['status']
  error: string | null
}

export function useSync(): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>({
    lastSyncAt: null,
    totalCount: 0,
    status: 'idle',
  })
  const [initialLoading, setInitialLoading] = useState(true)
  const autoSyncFired = useRef(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyStatus = useCallback((data: StatusResponse) => {
    setSyncState({
      lastSyncAt: data.lastSyncAt,
      totalCount: data.totalSynced,
      status: data.status,
      error: data.error ?? undefined,
    })
  }, [])

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/sync/status')
      if (!res.ok) return
      const data: StatusResponse = await res.json()
      applyStatus(data)
      if (data.status === 'syncing') {
        pollRef.current = setTimeout(poll, 2000)
      }
    } catch {
      // silent — next poll or manual refresh will recover
    }
  }, [applyStatus])

  const startSync = useCallback(async () => {
    setSyncState((prev) => ({ ...prev, status: 'syncing', error: undefined }))

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Sync failed' }))
        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: body.error ?? 'Sync failed',
        }))
        return
      }
      poll()
    } catch (err) {
      setSyncState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Sync failed',
      }))
    }
  }, [poll])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/sync/status')
        if (!res.ok || cancelled) return
        const data: StatusResponse = await res.json()
        if (!cancelled) {
          applyStatus(data)
          // If already syncing (e.g. another tab), start polling
          if (data.status === 'syncing') {
            poll()
          }
        }
      } catch {
        // leave defaults
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyStatus, poll])

  // Auto-sync: trigger once if never synced or last sync > 1 hour ago
  useEffect(() => {
    if (initialLoading || autoSyncFired.current) return
    if (syncState.status === 'syncing') return

    const shouldSync = (() => {
      if (!syncState.lastSyncAt) return true
      const lastSync = new Date(syncState.lastSyncAt)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      return lastSync < hourAgo
    })()

    if (shouldSync) {
      autoSyncFired.current = true
      startSync()
    }
  }, [initialLoading, syncState.lastSyncAt, syncState.status, startSync])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  return {
    status: syncState.status,
    lastSyncAt: syncState.lastSyncAt,
    totalCount: syncState.totalCount,
    error: syncState.error,
    isLoading: initialLoading || syncState.status === 'syncing',
    startSync,
  }
}
