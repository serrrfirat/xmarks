'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

import type {
  StatsOverview,
  TopAuthor,
  TopicDistribution,
  InterestPoint,
  EngagementPoint,
  ForgottenBookmark,
} from '@/lib/types'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { OverviewCard } from '@/components/stats/overview-card'
import { ForgottenBookmarks } from '@/components/stats/forgotten-bookmarks'
import { AuthorSheet } from '@/components/author-sheet'
import { TimeRangeFilter, getDateRange } from '@/components/time-range-filter'

/* ── Dynamic imports for D3-based charts (code-split + SSR disabled) ── */

const TopAuthorsChart = dynamic(
  () => import('@/components/stats/top-authors-chart').then((m) => m.TopAuthorsChart),
  { ssr: false },
)

const TopicDistributionChart = dynamic(
  () => import('@/components/stats/topic-distribution-chart').then((m) => m.TopicDistributionChart),
  { ssr: false },
)

const InterestTimelineChart = dynamic(
  () => import('@/components/stats/interest-timeline-chart').then((m) => m.InterestTimelineChart),
  { ssr: false },
)

const EngagementScatter = dynamic(
  () => import('@/components/stats/engagement-scatter').then((m) => m.EngagementScatter),
  { ssr: false },
)

/* ── Stats API response shape ─────────────────────────────── */

interface StatsResponse {
  overview: StatsOverview
  topAuthors: TopAuthor[]
  topicDistribution: TopicDistribution[]
  interestEvolution: InterestPoint[]
  engagementScatter: EngagementPoint[]
  forgottenBookmarks: ForgottenBookmark[]
}

/* ── Page ──────────────────────────────────────────────────── */

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all')

  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { from, to } = getDateRange(timeRange)

  useEffect(() => {
    setLoading(true)
    const url = new URL('/api/stats', window.location.origin)

    if (from) {
      url.searchParams.set('from', from)
    }

    if (to) {
      url.searchParams.set('to', to)
    }

    fetch(url.toString())
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<StatsResponse>
      })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [from, to])

  function handleAuthorClick(handle: string) {
    setSelectedAuthor(handle)
    setSheetOpen(true)
  }

  const isEmpty = !loading && stats?.overview.totalBookmarks === 0

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl animate-fadeIn">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="font-serif text-2xl font-light tracking-[-0.02em] text-[#E7E5E4]">
                Your Bookmark Stats
              </h1>
              <p className="text-[#78716C] font-sans text-sm mt-1">
                Insights from your bookmarked tweets
              </p>
            </div>

            <div className="mb-6">
              <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
            </div>

            {/* Loading skeleton */}
            {loading && <StatsSkeleton />}

            {/* Empty state */}
            {isEmpty && (
              <div className="card-naturalism p-8 border-dashed border-[#292524]">
                <div className="space-y-2 text-center">
                  <p className="text-[#E7E5E4] font-serif text-lg font-light">
                    No bookmarks yet
                  </p>
                  <p className="text-[#78716C] font-sans text-sm">
                    Sync your bookmarks to see stats here
                  </p>
                </div>
              </div>
            )}

            {/* Charts grid */}
            {!loading && stats && !isEmpty && (
              <div className="space-y-6">
                {/* Row 1: Overview (full width) */}
                <OverviewCard data={stats.overview} />

                {/* Row 2: Top Authors + Topic Distribution (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopAuthorsChart
                    data={stats.topAuthors}
                    onAuthorClick={handleAuthorClick}
                  />
                  <TopicDistributionChart data={stats.topicDistribution} />
                </div>

                {/* Row 3: Interest Timeline (full width) */}
                <InterestTimelineChart data={stats.interestEvolution} />

                {/* Row 4: Engagement Scatter + Forgotten Bookmarks (2-col) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EngagementScatter
                    data={stats.engagementScatter}
                    onAuthorClick={handleAuthorClick}
                  />
                  <ForgottenBookmarks data={stats.forgottenBookmarks} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Author detail sheet */}
      <AuthorSheet
        handle={selectedAuthor}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}

/* ── Loading Skeleton ─────────────────────────────────────── */

function StatsSkeleton() {
  const overviewKeys = ['overview-1', 'overview-2', 'overview-3', 'overview-4', 'overview-5', 'overview-6', 'overview-7']
  const authorBarWidths = [80, 70, 60, 50, 40]
  const forgottenKeys = ['forgotten-1', 'forgotten-2', 'forgotten-3']

  return (
    <div className="space-y-6">
      {/* Row 1: Overview skeleton */}
      <div className="card-naturalism p-5">
        <div className="bg-[#292524] rounded-xl h-3 w-16 animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {overviewKeys.map((key) => (
            <div key={key} className="space-y-1.5">
              <div className="bg-[#292524] rounded-xl h-2.5 w-14 animate-pulse" />
              <div className="bg-[#292524] rounded-xl h-5 w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-naturalism p-5 space-y-3">
          <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
          <div className="space-y-2">
            {authorBarWidths.map((width) => (
              <div
                key={`author-width-${width}`}
                className="bg-[#292524] rounded-xl h-6 animate-pulse"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        </div>
        <div className="card-naturalism p-5 flex flex-col items-center space-y-3">
          <div className="bg-[#292524] rounded-xl h-3 w-28 animate-pulse" />
          <div className="bg-[#292524] rounded-full w-[200px] h-[200px] animate-pulse" />
        </div>
      </div>

      {/* Row 3: Full width */}
      <div className="card-naturalism p-5 space-y-3">
        <div className="bg-[#292524] rounded-xl h-3 w-28 animate-pulse" />
        <div className="bg-[#292524] rounded-xl h-[200px] animate-pulse" />
      </div>

      {/* Row 4: Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-naturalism p-5 space-y-3">
          <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
          <div className="bg-[#292524] rounded-xl h-[240px] animate-pulse" />
        </div>
        <div className="card-naturalism p-5 space-y-3">
          <div className="bg-[#292524] rounded-xl h-3 w-32 animate-pulse" />
          {forgottenKeys.map((key) => (
            <div key={key} className="bg-[#292524] rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
