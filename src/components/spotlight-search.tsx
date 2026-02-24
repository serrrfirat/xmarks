'use client'

import { useEffect, useRef, useState } from 'react'
import { Command } from 'cmdk'
import type { SpotlightResult } from '@/lib/types'

export interface SpotlightSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthorClick?: (handle: string) => void
}

export function SpotlightSearch({ open, onOpenChange, onAuthorClick }: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotlightResult>({ tweets: [], authors: [] })
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced fetch on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults({ tweets: [], authors: [] })
      setLoading(false)
      return
    }

    setLoading(true)

    const timer = setTimeout(async () => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(`/api/spotlight?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data: SpotlightResult = await res.json()
          setResults(data)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [query])

  // Clear state when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('')
      setResults({ tweets: [], authors: [] })
      setLoading(false)
      abortRef.current?.abort()
    }
    onOpenChange(nextOpen)
  }

  const hasResults = results.tweets.length > 0 || results.authors.length > 0

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      label="Search bookmarks"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog container */}
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-[600px] bg-[#1C1917] border border-[#292524] rounded-xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center border-b border-[#292524] px-4">
            <svg
              className="mr-3 h-4 w-4 shrink-0 text-[#78716C]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search tweets and authors..."
              className="flex-1 bg-transparent py-3.5 text-sm text-[#E7E5E4] placeholder:text-[#78716C] outline-none"
            />
            {loading && (
              <div className="ml-2 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#78716C] border-t-[#F97316]" />
            )}
          </div>

          {/* Results list */}
          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            {query.length >= 2 && !loading && !hasResults && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-[#78716C]">
                No results found.
              </Command.Empty>
            )}

            {results.tweets.length > 0 && (
              <Command.Group
                heading="Tweets"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#78716C]"
              >
                {results.tweets.map((tweet) => (
                  <Command.Item
                    key={tweet.id}
                    value={tweet.id}
                    onSelect={() => window.open(tweet.url, '_blank')}
                    className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-sm text-[#E7E5E4] cursor-pointer select-none data-[selected=true]:bg-[#292524] transition-colors"
                  >
                    <span className="line-clamp-1">
                      {tweet.text.length > 80 ? tweet.text.slice(0, 80) + '…' : tweet.text}
                    </span>
                    <span className="text-xs text-[#78716C]">@{tweet.authorHandle}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.authors.length > 0 && (
              <Command.Group
                heading="Authors"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#78716C]"
              >
                {results.authors.map((author) => (
                  <Command.Item
                    key={author.handle}
                    value={author.handle}
                    onSelect={() => {
                      onAuthorClick?.(author.handle)
                      handleOpenChange(false)
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-[#E7E5E4] cursor-pointer select-none data-[selected=true]:bg-[#292524] transition-colors"
                  >
                    <span>
                      {author.name}{' '}
                      <span className="text-[#78716C]">@{author.handle}</span>
                    </span>
                    <span className="text-xs text-[#78716C]">
                      {author.bookmarkCount} {author.bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </div>
      </div>
    </Command.Dialog>
  )
}
