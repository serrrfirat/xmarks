'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Folder, PaginatedResponse, Tag, Tweet } from '@/lib/types'
import { BookmarkCard } from '@/components/bookmark-card'

const PAGE_SIZE = 20

export interface BookmarkListProps {
  query?: string
  folderId?: number
  tagId?: number
  categoryId?: number
  from?: string
  to?: string
  folders?: Folder[]
  tags?: Tag[]
  onAddToFolder?: (tweetId: string, folderId: number) => void
  onAddTag?: (tweetId: string, tagId: number) => void
  onAuthorClick?: (handle: string) => void
}

export function BookmarkList({
  query,
  folderId,
  tagId,
  categoryId,
  from,
  to,
  folders,
  tags,
  onAddToFolder,
  onAddTag,
  onAuthorClick,
}: BookmarkListProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const isSearch = query && query.trim().length > 0
        const url = new URL(
          isSearch ? '/api/search' : '/api/bookmarks',
          window.location.origin,
        )
        url.searchParams.set('limit', String(PAGE_SIZE))
        url.searchParams.set('offset', String(offset))

        if (isSearch) {
          url.searchParams.set('q', query!)
        } else {
          if (folderId !== undefined) url.searchParams.set('folderId', String(folderId))
          if (tagId !== undefined) url.searchParams.set('tagId', String(tagId))
          if (categoryId !== undefined) url.searchParams.set('categoryId', String(categoryId))
          if (from) url.searchParams.set('from', from)
          if (to) url.searchParams.set('to', to)
        }

        const res = await fetch(url.toString())
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = (await res.json()) as PaginatedResponse<Tweet>
        const items = data.items ?? []

        setTweets((prev) => (append ? [...prev, ...items] : items))
        setHasMore(items.length === PAGE_SIZE)
        offsetRef.current = offset + items.length
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
      }
    },
    [query, folderId, tagId, categoryId, from, to],
  )

  useEffect(() => {
    setTweets([])
    setLoading(true)
    setHasMore(true)
    setError(null)
    offsetRef.current = 0

    fetchPage(0, false).finally(() => setLoading(false))
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    fetchPage(offsetRef.current, true).finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, fetchPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  if (loading) return <SkeletonList />

  if (error) {
    return (
      <div className="card-naturalism p-6">
        <span className="text-[#ef4444] text-sm font-sans">{error}</span>
      </div>
    )
  }

  if (tweets.length === 0) {
    const isSearch = query && query.trim().length > 0
    return (
      <div className="card-naturalism p-8 border-dashed border-[#292524] animate-fadeIn">
        <div className="space-y-2 text-center">
          {isSearch ? (
            <>
              <p className="text-[#E7E5E4] font-serif text-lg font-light">No results found</p>
              <p className="text-[#78716C] font-sans text-sm">Try a different search</p>
            </>
          ) : (
            <>
              <p className="text-[#E7E5E4] font-serif text-lg font-light">No bookmarks yet</p>
              <p className="text-[#78716C] font-sans text-sm">Sync your bookmarks to get started</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {tweets.map((tweet) => (
        <BookmarkCard
          key={tweet.id}
          tweet={tweet}
          tags={[]}
          folders={folders}
          onAddToFolder={onAddToFolder}
          onAddTag={onAddTag}
          onAuthorClick={onAuthorClick}
        />
      ))}

      {loadingMore && <SkeletonCard />}
      <div ref={sentinelRef} className="h-4" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card-naturalism p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#292524] animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="bg-[#292524] rounded-xl h-3 w-1/3 animate-pulse" />
          <div className="bg-[#292524] rounded-xl h-3 w-1/4 animate-pulse" />
        </div>
      </div>
      <div className="bg-[#292524] rounded-xl h-3 w-full animate-pulse" />
      <div className="bg-[#292524] rounded-xl h-3 w-2/3 animate-pulse" />
    </div>
  )
}

function SkeletonList() {
  const skeletonKeys = ['one', 'two', 'three', 'four', 'five']

  return (
    <div className="flex flex-col gap-3">
      {skeletonKeys.map((key) => (
        <SkeletonCard key={key} />
      ))}
    </div>
  )
}
