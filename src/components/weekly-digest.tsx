'use client'

import { useEffect, useState } from 'react'
import type { WeeklyDigest } from '@/lib/types'

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
  const sMonth = months[s.getMonth()]
  const eMonth = months[e.getMonth()]
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()} – ${e.getDate()}`
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`
}

function wowChange(current: number, previous: number): { label: string; color: string } {
  if (previous === 0 && current === 0) return { label: 'Same as last week', color: 'text-[#78716C]' }
  if (previous === 0) return { label: '↑ New this week', color: 'text-emerald-400' }
  if (current === previous) return { label: 'Same as last week', color: 'text-[#78716C]' }
  const pct = Math.round(Math.abs((current - previous) / previous) * 100)
  if (current > previous) return { label: `↑ ${pct}% from last week`, color: 'text-emerald-400' }
  return { label: `↓ ${pct}% from last week`, color: 'text-red-400' }
}

export function WeeklyDigestCard() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/digest')
        const json = (await res.json()) as { weekSummary: WeeklyDigest }
        if (!cancelled) setDigest(json.weekSummary)
      } catch {
        if (!cancelled) setDigest(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div data-testid="weekly-digest" className="card-naturalism p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
          <div className="bg-[#292524] rounded-xl h-3 w-28 animate-pulse" />
        </div>
        <div className="bg-[#292524] rounded-xl h-8 w-16 animate-pulse mb-1" />
        <div className="bg-[#292524] rounded-xl h-3 w-32 animate-pulse mb-5" />
        <div className="space-y-4">
          <div>
            <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse mb-2" />
            <div className="flex gap-2">
              <div className="bg-[#292524] rounded-full h-5 w-16 animate-pulse" />
              <div className="bg-[#292524] rounded-full h-5 w-20 animate-pulse" />
              <div className="bg-[#292524] rounded-full h-5 w-14 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="bg-[#292524] rounded-xl h-3 w-24 animate-pulse mb-2" />
            <div className="space-y-1.5">
              <div className="bg-[#292524] rounded-xl h-3 w-28 animate-pulse" />
              <div className="bg-[#292524] rounded-xl h-3 w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!digest || digest.totalBookmarks === 0) {
    return (
      <div data-testid="weekly-digest" className="card-naturalism p-4">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider">
          This Week
        </span>
        <p className="text-[#78716C] text-sm mt-4">No bookmarks this week yet</p>
      </div>
    )
  }

  const change = wowChange(digest.totalBookmarks, digest.previousWeekTotal)

  return (
    <div data-testid="weekly-digest" className="card-naturalism p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider">
          This Week
        </span>
        <span className="text-[#78716C] font-sans text-xs">
          {formatDateRange(digest.weekStart, digest.weekEnd)}
        </span>
      </div>

      {/* Bookmark count */}
      <div className="mb-5">
        <span className="text-[#E7E5E4] text-3xl font-semibold tabular-nums">
          {digest.totalBookmarks}
        </span>
        <p className={`text-xs mt-0.5 ${change.color}`}>{change.label}</p>
      </div>

      <div className="space-y-4">
        {/* Top Topics */}
        {digest.topTopics.length > 0 && (
          <div>
            <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-2">
              Top Topics
            </span>
            <div className="flex flex-wrap gap-1.5">
              {digest.topTopics.slice(0, 3).map((topic) => (
                <span
                  key={topic.name}
                  className="bg-[#292524] rounded-full px-2 py-0.5 text-xs text-[#E7E5E4]"
                >
                  {topic.name}
                  <span className="text-[#F97316] ml-1">{topic.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Authors */}
        {digest.topAuthors.length > 0 && (
          <div>
            <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-2">
              Top Authors
            </span>
            <div className="space-y-1">
              {digest.topAuthors.slice(0, 3).map((author) => (
                <div key={author.handle} className="flex items-center justify-between text-xs">
                  <span className="text-[#E7E5E4]">@{author.handle}</span>
                  <span className="text-[#F97316] tabular-nums">{author.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rising Authors */}
        {digest.risingAuthors.length > 0 && (
          <div>
            <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-2">
              Rising
            </span>
            <div className="space-y-1">
              {digest.risingAuthors.slice(0, 3).map((author) => (
                <div key={author.handle} className="flex items-center justify-between text-xs">
                  <span className="text-[#E7E5E4]">@{author.handle}</span>
                  <span className="text-emerald-400 tabular-nums">
                    ↑ +{author.count - author.previousCount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
