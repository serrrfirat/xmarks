'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Heart,
  MessageCircle,
  Repeat2,
  X,
} from 'lucide-react'

import type { BirdTweet } from '@/lib/types'
import { cn, formatCount } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface ThreadViewProps {
  tweetId: string
  isOpen: boolean
  onClose: () => void
}

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

function ThreadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ThreadTweetRow({ tweet }: { tweet: BirdTweet }) {
  const hue = avatarHue(tweet.author.name)

  return (
    <div className="relative flex items-start gap-3 py-3">
      {/* Thread connector line */}
      <div className="absolute left-[15px] top-0 h-full w-px bg-border" />

      <div
        className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
        aria-hidden
      >
        {initials(tweet.author.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="truncate font-bold text-foreground">
            {tweet.author.name}
          </span>
          <span className="truncate text-muted-foreground">
            @{tweet.author.username}
          </span>
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
          {tweet.text}
        </p>

        <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted-foreground">
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
        </div>
      </div>
    </div>
  )
}

export function ThreadView({ tweetId, isOpen, onClose }: ThreadViewProps) {
  const [tweets, setTweets] = useState<BirdTweet[]>([])
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
      const json = (await res.json()) as { data: BirdTweet[] }
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
        'mt-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3',
        'animate-in slide-in-from-top-2 fade-in-0 duration-200',
      )}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Thread
          {!loading && tweets.length > 0 && (
            <span className="ml-1 text-muted-foreground/60">
              · {tweets.length} tweet{tweets.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Close thread
        </Button>
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && <ThreadSkeleton />}

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              fetchedRef.current = false
              void fetchThread()
            }}
            className="ml-auto text-destructive hover:text-destructive"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Thread tweets ───────────────────────────────────── */}
      {!loading && !error && tweets.length > 0 && (
        <div className="divide-y divide-border/40">
          {tweets.map((tweet) => (
            <ThreadTweetRow key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!loading && !error && tweets.length === 0 && (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No thread tweets found.
        </p>
      )}
    </div>
  )
}
