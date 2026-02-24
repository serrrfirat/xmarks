'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, Repeat2, MessageCircle, Bookmark, CalendarDays } from 'lucide-react'

import type { AuthorProfile } from '@/lib/types'
import { formatCount } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

/* ── Props ─────────────────────────────────────────────────── */

export interface AuthorSheetProps {
  handle: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ── Helpers ───────────────────────────────────────────────── */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function avatarHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
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

function AuthorSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="size-14 rounded-full bg-[#292524] animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-lg bg-[#292524] animate-pulse" />
          <div className="h-3 w-24 rounded-lg bg-[#292524] animate-pulse" />
        </div>
      </div>
      {/* Stats */}
      <div className="space-y-3">
        <div className="h-3 w-20 rounded-lg bg-[#292524] animate-pulse" />
        <div className="h-3 w-full rounded-lg bg-[#292524] animate-pulse" />
        <div className="h-3 w-3/4 rounded-lg bg-[#292524] animate-pulse" />
      </div>
      {/* Tweets */}
      <div className="space-y-3">
        <div className="h-3 w-16 rounded-lg bg-[#292524] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-[#292524] p-3">
            <div className="h-3 w-full rounded-lg bg-[#292524] animate-pulse" />
            <div className="h-3 w-2/3 rounded-lg bg-[#292524] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main Component ────────────────────────────────────────── */

export function AuthorSheet({ handle, open, onOpenChange }: AuthorSheetProps) {
  const [profile, setProfile] = useState<AuthorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef<string | null>(null)

  const fetchAuthor = useCallback(async (authorHandle: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/authors/${authorHandle}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as AuthorProfile
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load author')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && handle && fetchedRef.current !== handle) {
      fetchedRef.current = handle
      void fetchAuthor(handle)
    }
    if (!open) {
      fetchedRef.current = null
    }
  }, [open, handle, fetchAuthor])

  const stats = profile?.stats
  const tweets = profile?.tweets ?? []
  const hue = stats ? avatarHue(stats.name) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="author-sheet"
        className="w-[400px] border-l border-[#292524] bg-[#1C1917] p-0 text-[#E7E5E4] sm:max-w-[400px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>
            {stats ? `${stats.name} — Author Profile` : 'Author Profile'}
          </SheetTitle>
        </SheetHeader>

        {/* ── Loading ────────────────────────────────────── */}
        {loading && <AuthorSkeleton />}

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <div className="p-4">
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
              <button
                onClick={() => {
                  if (handle) {
                    fetchedRef.current = null
                    void fetchAuthor(handle)
                  }
                }}
                className="ml-2 underline underline-offset-2 hover:text-red-300"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* ── Content ────────────────────────────────────── */}
        {!loading && !error && stats && (
          <div className="flex h-full flex-col overflow-y-auto">
            {/* Header: avatar + name + badge */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
                aria-hidden
              >
                {initials(stats.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-[#E7E5E4]">
                  {stats.name}
                </h2>
                <p className="truncate text-sm text-[#78716C]">@{stats.handle}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F97316]/15 px-2.5 py-1 text-xs font-medium text-[#F97316]">
                <Bookmark className="size-3" />
                {stats.bookmarkCount}
              </span>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-[#292524]" />

            {/* Stats section */}
            <div className="space-y-3 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                Bookmark Activity
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#78716C]">
                    <CalendarDays className="size-3" />
                    First
                  </span>
                  <p className="text-sm font-medium text-[#E7E5E4]">
                    {formatDate(stats.firstBookmarkedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#78716C]">
                    <CalendarDays className="size-3" />
                    Last
                  </span>
                  <p className="text-sm font-medium text-[#E7E5E4]">
                    {formatDate(stats.lastBookmarkedAt)}
                  </p>
                </div>
              </div>

              {/* Engagement averages */}
              <div className="flex items-center gap-4 pt-1">
                <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                  <Heart className="size-3 text-[#F97316]" />
                  <span className="text-[#E7E5E4]">{formatCount(stats.engagementAvg.likes)}</span>
                  avg
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                  <Repeat2 className="size-3 text-[#F97316]" />
                  <span className="text-[#E7E5E4]">{formatCount(stats.engagementAvg.retweets)}</span>
                  avg
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[#78716C]">
                  <MessageCircle className="size-3 text-[#F97316]" />
                  <span className="text-[#E7E5E4]">{formatCount(stats.engagementAvg.replies)}</span>
                  avg
                </span>
              </div>
            </div>

            {/* Top topics */}
            {stats.topTopics.length > 0 && (
              <>
                <div className="mx-5 h-px bg-[#292524]" />
                <div className="space-y-2 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                    Top Topics
                  </p>
                  <div className="space-y-1.5">
                    {stats.topTopics.slice(0, 5).map((topic) => (
                      <div
                        key={topic.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate text-[#E7E5E4]">
                          {topic.emoji ?? '📌'} {topic.name}
                        </span>
                        <span className="ml-2 shrink-0 text-xs text-[#78716C]">
                          {topic.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Tweets list */}
            {tweets.length > 0 && (
              <>
                <div className="mx-5 h-px bg-[#292524]" />
                <div className="flex-1 space-y-1 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                    Bookmarked Tweets
                    <span className="ml-1 text-[#78716C]/60">· {tweets.length}</span>
                  </p>
                  <div className="space-y-2 pt-1">
                    {tweets.map((tweet) => (
                      <div
                        key={tweet.id}
                        className="rounded-lg border border-[#292524] bg-[#1C1917]/60 p-3"
                      >
                        <p className="text-sm leading-relaxed text-[#E7E5E4]/90">
                          {tweet.text.length > 150
                            ? tweet.text.slice(0, 150) + '…'
                            : tweet.text}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#78716C]">
                          <span>{formatDate(tweet.createdAt)}</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Heart className="size-3" />
                            {formatCount(tweet.likeCount)}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Repeat2 className="size-3" />
                            {formatCount(tweet.retweetCount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Empty tweets state */}
            {tweets.length === 0 && (
              <>
                <div className="mx-5 h-px bg-[#292524]" />
                <p className="px-5 py-6 text-center text-sm text-[#78716C]">
                  No bookmarked tweets found.
                </p>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
