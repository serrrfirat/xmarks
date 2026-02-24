'use client'

import { useSync } from '@/hooks/use-sync'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function SyncStatus() {
  const { status, lastSyncAt, error, isLoading, startSync } = useSync()

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
        <span className="text-[#78716C] font-sans text-xs">Syncing...</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-1.5 px-5 py-3">
        <span className="text-[#ef4444] font-sans text-xs truncate">
          {error ?? 'Sync failed'}
        </span>
        <button
          className="btn-pill btn-pill-secondary text-xs px-3 py-1 self-start"
          onClick={startSync}
          disabled={isLoading}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!lastSyncAt) {
    return (
      <div className="flex items-center justify-between px-5 py-3">
        <span className="text-[#78716C] font-sans text-xs">Not synced</span>
        <button
          className="btn-pill btn-pill-primary text-xs px-3 py-1"
          onClick={startSync}
          disabled={isLoading}
        >
          Sync
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[#F97316]" />
        <span className="text-[#78716C] font-sans text-xs">Synced {timeAgo(lastSyncAt)}</span>
      </div>
      <button
        className="btn-pill btn-pill-primary text-xs px-3 py-1"
        onClick={startSync}
        disabled={isLoading}
      >
        Sync
      </button>
    </div>
  )
}
