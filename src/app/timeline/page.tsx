'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PaginatedResponse, Tweet } from '@/lib/types'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BookmarkCard } from '@/components/bookmark-card'
import { ActivityDashboard } from '@/components/activity-dashboard'
import { AuthorSheet } from '@/components/author-sheet'
import { WeeklyDigestCard } from '@/components/weekly-digest'

const PAGE_SIZE = 50
const INITIAL_DATE_COUNT = 30
const LOAD_MORE_DATE_COUNT = 30

function toDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLabel(dateKey: string): string {
  const target = new Date(dateKey + 'T12:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (target.getTime() === today.getTime()) return 'Today'
  if (target.getTime() === yesterday.getTime()) return 'Yesterday'

  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: target.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

interface DateGroup {
  date: string
  label: string
  tweets: Tweet[]
}

export default function TimelinePage() {
  const [allTweets, setAllTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMorePages, setHasMorePages] = useState(true)
  const [visibleCount, setVisibleCount] = useState(INITIAL_DATE_COUNT)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const offsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const dateGroups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Tweet[]>()
    for (const tw of allTweets) {
      const key = toDateKey(tw.createdAt)
      const arr = map.get(key)
      if (arr) arr.push(tw)
      else map.set(key, [tw])
    }

    const sorted = Array.from(map.entries()).sort(
      ([a], [b]) => b.localeCompare(a),
    )

    return sorted.map(([date, tweets]) => ({
      date,
      label: formatDateLabel(date),
      tweets,
    }))
  }, [allTweets])

  const visibleGroups = dateGroups.slice(0, visibleCount)
  const hasMoreDates = visibleCount < dateGroups.length

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    const url = new URL('/api/bookmarks', window.location.origin)
    url.searchParams.set('limit', String(PAGE_SIZE))
    url.searchParams.set('offset', String(offset))

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = (await res.json()) as PaginatedResponse<Tweet>
    const items = data.items ?? []

    setAllTweets((prev) => (append ? [...prev, ...items] : items))
    setHasMorePages(items.length === PAGE_SIZE)
    offsetRef.current = offset + items.length
  }, [])

  useEffect(() => {
    setLoading(true)
    offsetRef.current = 0
    fetchPage(0, false).finally(() => setLoading(false))
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMore) return

    if (hasMoreDates) {
      setVisibleCount((c) => c + LOAD_MORE_DATE_COUNT)
      return
    }

    if (!hasMorePages) return
    setLoadingMore(true)
    try {
      await fetchPage(offsetRef.current, true)
      setVisibleCount((c) => c + LOAD_MORE_DATE_COUNT)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMoreDates, hasMorePages, fetchPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) void loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadMore])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl animate-fadeIn">
            <div className="mb-8">
              <h1 className="font-serif text-2xl font-light tracking-[-0.02em] text-[#E7E5E4]">
                Timeline
              </h1>
              <p className="text-[#78716C] font-sans text-sm mt-1">
                Your bookmarks, day by day
              </p>
            </div>

            <div className="mb-8">
              <ActivityDashboard />
            </div>

            <div className="mb-8">
              <WeeklyDigestCard />
            </div>

            {loading && <TimelineSkeleton />}

            {!loading && dateGroups.length === 0 && (
              <div className="card-naturalism p-8 border-dashed border-[#292524]">
                <div className="space-y-2 text-center">
                  <p className="text-[#E7E5E4] font-serif text-lg font-light">No bookmarks yet</p>
                  <p className="text-[#78716C] font-sans text-sm">Sync your bookmarks to get started</p>
                </div>
              </div>
            )}

            {!loading && visibleGroups.length > 0 && (
              <div className="relative">
                <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#292524]" />

                <div className="flex flex-col gap-8">
                  {visibleGroups.map((group) => (
                    <section key={group.date} className="relative pl-8">
                      <span className="absolute left-[2px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#F97316]" />

                      <div className="mb-3 flex items-center gap-3">
                        <h2 className="font-sans text-xs font-medium text-[#78716C] uppercase tracking-wider">
                          {group.label}
                        </h2>
                        <span className="text-[#78716C] text-xs font-sans">
                          {group.tweets.length} {group.tweets.length === 1 ? 'bookmark' : 'bookmarks'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3">
                        {group.tweets.map((tweet) => (
                          <BookmarkCard
                            key={tweet.id}
                            tweet={tweet}
                            onAuthorClick={(handle) => {
                              setSelectedAuthor(handle)
                              setSheetOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {loadingMore && (
              <div className="py-8 text-center">
                <span className="text-[#78716C] text-sm font-sans animate-pulse">
                  Loading more...
                </span>
              </div>
            )}

            <div ref={sentinelRef} className="h-4" />
          </div>
        </main>
        <AuthorSheet
          handle={selectedAuthor}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="relative">
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#292524]" />
      <div className="flex flex-col gap-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="relative pl-8">
            <span className="absolute left-[2px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#292524] animate-pulse" />
            <div className="mb-3">
              <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 + (i % 2) }, (_, j) => (
                <div key={j} className="card-naturalism p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#292524] animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="bg-[#292524] rounded-xl h-3 w-1/3 animate-pulse" />
                      <div className="bg-[#292524] rounded-xl h-3 w-1/4 animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-[#292524] rounded-xl h-3 w-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
