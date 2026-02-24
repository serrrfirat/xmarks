'use client'

import type { ForgottenBookmark } from '@/lib/types'

interface ForgottenBookmarksProps {
  data: ForgottenBookmark[]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export function ForgottenBookmarks({ data }: ForgottenBookmarksProps) {
  if (data.length === 0) {
    return (
      <div className="card-naturalism p-5">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
          Forgotten Bookmarks
        </span>
        <p className="text-[#78716C] font-sans text-sm">No forgotten bookmarks found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block px-1">
        Forgotten Bookmarks
      </span>
      {data.map((bookmark) => (
        <div key={bookmark.id} className="card-naturalism p-4 space-y-1.5">
          <p className="text-[#E7E5E4] font-sans text-sm leading-relaxed">
            {truncate(bookmark.text, 100)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[#78716C] font-sans text-xs">
              @{bookmark.authorHandle}
            </span>
            <span className="text-[#F97316] font-sans text-xs font-medium">
              {bookmark.daysSinceBookmarked}d ago
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
