'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ExternalLink,
  Heart,
  MessageCircle,
  Repeat2,
  X,
} from 'lucide-react'

import type { Tweet } from '@/lib/types'
import { cn, formatCount } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface ThreadViewProps {
  tweetId: string
  isOpen: boolean
  onClose: () => void
}

/* ── Helpers ───────────────────────────────────────────────── */

function avatarHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/* ── Loading Skeleton ──────────────────────────────────────── */

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full bg-[#292524]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 bg-[#292524]" />
            <Skeleton className="h-3.5 w-full bg-[#292524]" />
            <Skeleton className="h-3.5 w-3/4 bg-[#292524]" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Single Thread Tweet ───────────────────────────────────── */

function ThreadTweetRow({
  tweet,
  index,
  total,
  isOrigin,
}: {
  tweet: Tweet
  index: number
  total: number
  isOrigin: boolean
}) {
  const hue = avatarHue(tweet.authorName)
  const isLast = index === total - 1

  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group relative flex items-start gap-3 py-3 transition-colors hover:bg-[#292524]/40',
        isOrigin && 'rounded-md bg-[#F97316]/5',
      )}
    >
      {/* Thread connector line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[#292524]" />
      )}

      <div
        className={cn(
          'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
          isOrigin && 'ring-2 ring-[#F97316]/40',
        )}
        style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
        aria-hidden
      >
        {initials(tweet.authorName)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="truncate font-bold text-[#E7E5E4]">
            {tweet.authorName}
          </span>
          <span className="truncate text-[#78716C]">
            @{tweet.authorHandle}
          </span>
          <span className="text-[#78716C]">
            · {formatDate(tweet.createdAt)}
          </span>
          {isOrigin && (
            <span className="rounded-full bg-[#F97316]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#F97316]">
              bookmarked
            </span>
          )}
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E7E5E4]/90">
          {tweet.text}
        </p>

        <div className="mt-1.5 flex items-center gap-4 text-[11px] text-[#78716C]">
          <span className="inline-flex items-center gap-0.5">
            <MessageCircle className="size-3" />
            {formatCount(tweet.replyCount)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Repeat2 className="size-3" />
            {formatCount(tweet.retweetCount)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Heart className="size-3" />
            {formatCount(tweet.likeCount)}
          </span>
          <ExternalLink className="ml-auto size-3 text-[#78716C] opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[#F97316]" />
        </div>
      </div>
    </a>
  )
}

/* ── Main Component ────────────────────────────────────────── */

export function ThreadView({ tweetId, isOpen, onClose }: ThreadViewProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchThread = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookmarks/${tweetId}/thread`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { data: Tweet[] }
      setTweets(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [tweetId])

  useEffect(() => {
    if (isOpen && !fetchedRef.current) {
      fetchedRef.current = true
      void fetchThread()
    }
    if (!isOpen) {
      fetchedRef.current = false
    }
  }, [isOpen, fetchThread])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border border-[#292524] bg-[#1C1917]/80 px-4 py-3',
        'animate-in slide-in-from-top-2 fade-in-0 duration-200',
      )}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#78716C]">
          Thread
          {!loading && tweets.length > 0 && (
            <span className="ml-1 text-[#78716C]/60">
              · {tweets.length} tweet{tweets.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="text-[#78716C] hover:text-[#E7E5E4] hover:bg-[#292524]"
        >
          <X className="size-3.5" />
          Close
        </Button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <ThreadSkeleton />}

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-950/30 border border-red-900/40 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              fetchedRef.current = false
              void fetchThread()
            }}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Thread tweets ───────────────────────────────────── */}
      {!loading && !error && tweets.length > 0 && (
        <div className="space-y-0">
          {tweets.map((tweet, idx) => (
            <ThreadTweetRow
              key={tweet.id}
              tweet={tweet}
              index={idx}
              total={tweets.length}
              isOrigin={tweet.id === tweetId}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!loading && !error && tweets.length === 0 && (
        <p className="py-3 text-center text-sm text-[#78716C]">
          No other tweets from this thread in your bookmarks.
        </p>
      )}
    </div>
  )
}
