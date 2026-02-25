'use client'

import { cn } from '@/lib/utils'

export type TimeRangeKey = '24h' | '7d' | '30d' | 'all'

interface TimeRangeFilterProps {
  value: string
  onChange: (range: string) => void
}

const DAY_MS = 86_400_000

const TIME_RANGE_OPTIONS: Array<{ key: TimeRangeKey; label: string; ms: number | null }> = [
  { key: '24h', label: '24h', ms: DAY_MS },
  { key: '7d', label: '7 days', ms: DAY_MS * 7 },
  { key: '30d', label: '30 days', ms: DAY_MS * 30 },
  { key: 'all', label: 'All', ms: null },
]

export function getDateRange(range: string): { from?: string; to?: string } {
  const now = new Date()
  const selected = TIME_RANGE_OPTIONS.find((option) => option.key === range)

  if (!selected || selected.ms === null) {
    return {}
  }

  return {
    from: new Date(Date.now() - selected.ms).toISOString(),
    to: now.toISOString(),
  }
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="card-naturalism inline-flex items-center gap-1 rounded-full border-[#292524] bg-[#1C1917] p-1">
      {TIME_RANGE_OPTIONS.map((option) => {
        const isActive = value === option.key

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 font-sans text-xs font-medium transition-all duration-300',
              isActive
                ? 'border-[#F97316] bg-[#F97316] text-[#0C0A09]'
                : 'border-[#292524] bg-[#1C1917] text-[#E7E5E4] hover:border-[#F97316] hover:text-[#F97316]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
