'use client'

import type { StatsOverview } from '@/lib/types'

interface OverviewCardProps {
  data: StatsOverview
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function OverviewCard({ data }: OverviewCardProps) {
  const stats = [
    { label: 'Total Bookmarks', value: data.totalBookmarks.toLocaleString() },
    { label: 'Authors', value: data.totalAuthors.toLocaleString() },
    { label: 'Topics', value: data.totalTopics.toLocaleString() },
    { label: 'Avg / Day', value: data.avgBookmarksPerDay.toFixed(1) },
    { label: 'Most Active', value: data.mostActiveDay || '—' },
    { label: 'Oldest', value: formatDate(data.oldestBookmark) },
    { label: 'Newest', value: formatDate(data.newestBookmark) },
  ]

  return (
    <div data-testid="stats-overview" className="card-naturalism p-5">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-4">
        Overview
      </span>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span className="text-[#78716C] font-sans text-[10px] font-medium uppercase tracking-wider block">
              {stat.label}
            </span>
            <span className="text-[#E7E5E4] font-sans text-xl font-semibold block mt-0.5">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
