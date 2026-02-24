'use client'

import { useEffect, useState } from 'react'

interface TimelineEntry {
  date: string
  count: number
}

interface TimelineResponse {
  data: TimelineEntry[]
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

const HEATMAP_COLORS = [
  'bg-[#1C1917]',
  'bg-[#2B1A11]',
  'bg-[#7C2D12]',
  'bg-[#C2410C]',
  'bg-[#FB923C]',
]

interface HeatmapCell {
  date: string
  count: number
  inRange: boolean
}

function getAllDays(n: number): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${day}`)
  }
  return days
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return (d.getDay() + 6) % 7
}

function getHeatmapLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0
  const ratio = count / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function ActivityDashboard() {
  const [data, setData] = useState<TimelineEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<TimelineEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/timeline?days=90')
        const json = (await res.json()) as TimelineResponse
        if (!cancelled) setData(json.data)
      } catch {
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card-naturalism p-4">
          <div className="bg-[#292524] rounded-xl h-3 w-24 animate-pulse" />
          <div className="mt-3 ml-8 flex gap-1">
            {Array.from({ length: 14 }, (_, week) => (
              <div key={week} className="flex flex-col gap-1">
                {Array.from({ length: 7 }, (_, day) => (
                  <div key={`${week}-${day}`} className="h-3 w-3 rounded-[2px] bg-[#292524] animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card-naturalism p-4">
            <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
          </div>
          <div className="card-naturalism p-4">
            <div className="bg-[#292524] rounded-xl h-3 w-20 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const countMap = new Map<string, number>()
  for (const entry of data) countMap.set(entry.date, entry.count)

  const allDayKeys = getAllDays(90)
  const fullDays = allDayKeys.map((date) => ({
    date,
    count: countMap.get(date) ?? 0,
  }))

  const maxCount = Math.max(...fullDays.map((d) => d.count), 1)

  const firstDate = fullDays[0]?.date
  const lastDate = fullDays[fullDays.length - 1]?.date

  const heatmapWeeks: HeatmapCell[][] = []
  const monthLabelByWeek = new Map<number, string>()

  if (firstDate && lastDate) {
    const first = new Date(firstDate + 'T12:00:00')
    const last = new Date(lastDate + 'T12:00:00')

    const start = new Date(first)
    start.setDate(start.getDate() - getDayOfWeek(firstDate))

    const end = new Date(last)
    end.setDate(end.getDate() + (6 - getDayOfWeek(lastDate)))

    let cursor = new Date(start)
    let weekIndex = 0
    let lastMonth = -1

    while (cursor <= end) {
      const week: HeatmapCell[] = []
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const day = new Date(cursor)
        day.setDate(cursor.getDate() + dayOffset)
        const dateKey = toDateKey(day)
        const inRange = day >= first && day <= last
        week.push({
          date: dateKey,
          count: inRange ? countMap.get(dateKey) ?? 0 : 0,
          inRange,
        })
      }

      heatmapWeeks.push(week)

      const firstInRange = week.find((d) => d.inRange)
      if (firstInRange) {
        const month = new Date(firstInRange.date + 'T12:00:00').getMonth()
        if (month !== lastMonth) {
          monthLabelByWeek.set(weekIndex, MONTHS[month])
          lastMonth = month
        }
      }

      cursor.setDate(cursor.getDate() + 7)
      weekIndex += 1
    }
  }

  const weeklyTotals = [0, 0, 0, 0, 0, 0, 0]
  for (const day of fullDays) weeklyTotals[getDayOfWeek(day.date)] += day.count
  const maxWeekly = Math.max(...weeklyTotals, 1)

  const trendDays = fullDays.slice(-28)
  const maxTrend = Math.max(...trendDays.map((d) => d.count), 1)
  const minTrend = Math.min(...trendDays.map((d) => d.count))

  return (
    <div className="space-y-4">
      <div className="card-naturalism p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider">
            Activity
          </span>
          <span className="min-h-4 text-[#78716C] font-sans text-xs">
            {hoveredDay
              ? `${formatDayLabel(hoveredDay.date)} · ${hoveredDay.count} tweet${hoveredDay.count !== 1 ? 's' : ''}`
              : '\u00A0'}
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-max">
            <div className="mb-1 ml-8 flex gap-1 text-[10px] text-[#78716C]">
              {heatmapWeeks.map((_, weekIndex) => (
                <span key={`month-${weekIndex}`} className="w-3 leading-3">
                  {monthLabelByWeek.get(weekIndex) ?? '\u00A0'}
                </span>
              ))}
            </div>

            <div className="flex">
              <div className="mr-2 grid grid-rows-7 gap-1 text-[10px] leading-3 text-[#78716C]">
                <span className="h-3">&nbsp;</span>
                <span className="h-3">Mon</span>
                <span className="h-3">&nbsp;</span>
                <span className="h-3">Wed</span>
                <span className="h-3">&nbsp;</span>
                <span className="h-3">Fri</span>
                <span className="h-3">&nbsp;</span>
              </div>

              <div className="flex gap-1">
                {heatmapWeeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const level = day.inRange ? getHeatmapLevel(day.count, maxCount) : 0
                      return (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className={`h-3 w-3 rounded-[2px] ${HEATMAP_COLORS[level]} ${day.inRange ? 'cursor-default transition-colors duration-200' : 'opacity-40'}`}
                          onMouseEnter={day.inRange ? () => setHoveredDay({ date: day.date, count: day.count }) : undefined}
                          onMouseLeave={day.inRange ? () => setHoveredDay(null) : undefined}
                          title={day.inRange ? `${formatDayLabel(day.date)} · ${day.count} tweet${day.count !== 1 ? 's' : ''}` : undefined}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-naturalism p-4">
          <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
            Weekly
          </span>
          <div className="space-y-1.5">
            {weeklyTotals.map((total, i) => {
              const pct = maxWeekly > 0 ? (total / maxWeekly) * 100 : 0
              return (
                <div key={DAY_LABELS[i]} className="flex items-center gap-2">
                  <span className="text-[#78716C] text-xs font-sans w-8 shrink-0">{DAY_LABELS[i]}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#1C1917] overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#F97316] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[#78716C] text-xs font-sans w-6 text-right">{total}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card-naturalism p-4">
          <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
            28-Day Trend
          </span>
          <div className="flex items-end gap-px h-16">
            {trendDays.map((day, i) => {
              const pct = maxTrend > 0 ? (day.count / maxTrend) * 100 : 0
              const minH = day.count > 0 ? 4 : 2
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-[#F97316] transition-all duration-200"
                  style={{ height: `${Math.max(pct, (minH / 64) * 100)}%` }}
                  title={`${formatDayLabel(day.date)} · ${day.count}`}
                />
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[#78716C] text-xs font-sans">
            <span>Min: {minTrend}</span>
            <span>Max: {maxTrend}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
