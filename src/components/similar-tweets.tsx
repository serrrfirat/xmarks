'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ExternalLink, Heart, MessageCircle, Repeat2, X } from 'lucide-react'

import type { Tweet } from '@/lib/types'
import { formatCount } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface SimilarTweetsProps {
  tweetId: string
  isOpen: boolean
  onClose: () => void
}

function SimilarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-md border border-[#292524] px-3 py-2">
          <Skeleton className="h-3.5 w-32 bg-[#292524]" />
          <Skeleton className="h-3.5 w-full bg-[#292524]" />
          <Skeleton className="h-3.5 w-2/3 bg-[#292524]" />
        </div>
      ))}
    </div>
  )
}

function SimilarTweetRow({ tweet }: { tweet: Tweet }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-md border border-transparent px-3 py-2 transition-colors hover:border-[#F97316]/40 hover:bg-[#292524]/40"
    >
      <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
        <span className="truncate font-medium text-[#E7E5E4]">{tweet.authorName}</span>
        <span className="truncate text-[#78716C]">@{tweet.authorHandle}</span>
        <ExternalLink className="ml-auto size-3 text-[#78716C] opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-[#F97316]" />
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E7E5E4]">
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
      </div>
    </a>
  )
}

export function SimilarTweets({ tweetId, isOpen, onClose }: SimilarTweetsProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchSimilar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookmarks/${tweetId}/similar`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { data: Tweet[] }
      setTweets(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load similar tweets')
    } finally {
      setLoading(false)
    }
  }, [tweetId])

  useEffect(() => {
    if (isOpen && !fetchedRef.current) {
      fetchedRef.current = true
      void fetchSimilar()
    }
    if (!isOpen) {
      fetchedRef.current = false
    }
  }, [isOpen, fetchSimilar])

  if (!isOpen) return null

  return (
    <div className="mt-2 rounded-lg border border-[#292524] bg-[#1C1917]/80 px-4 py-3 animate-in slide-in-from-top-2 fade-in-0 duration-200">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-[#78716C]">Similar · 5 tweets</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClose}
          className="text-[#78716C] hover:bg-[#292524] hover:text-[#E7E5E4]"
        >
          <X className="size-3.5" />
          Close
        </Button>
      </div>

      {loading && <SimilarSkeleton />}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              fetchedRef.current = false
              void fetchSimilar()
            }}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && tweets.length > 0 && (
        <div className="space-y-2">
          {tweets.map((tweet) => (
            <SimilarTweetRow key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}

      {!loading && !error && tweets.length === 0 && (
        <p className="py-3 text-center text-sm text-[#78716C]">No similar bookmarks found.</p>
      )}
    </div>
  )
}
