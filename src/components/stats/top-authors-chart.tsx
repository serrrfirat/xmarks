'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { scaleBand, scaleLinear } from 'd3-scale'
import dynamic from 'next/dynamic'
import type { TopAuthor } from '@/lib/types'

interface TopAuthorsChartProps {
  data: TopAuthor[]
  onAuthorClick?: (handle: string) => void
}

const BAR_HEIGHT = 28
const GAP = 4
const MARGIN = { top: 8, right: 48, bottom: 8, left: 120 }

function TopAuthorsChartInner({ data, onAuthorClick }: TopAuthorsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const chartHeight = MARGIN.top + MARGIN.bottom + data.length * (BAR_HEIGHT + GAP)

  const { yScale, xScale } = useMemo(() => {
    const y = scaleBand<string>()
      .domain(data.map((d) => d.handle))
      .range([MARGIN.top, chartHeight - MARGIN.bottom])
      .padding(0.15)

    const x = scaleLinear()
      .domain([0, Math.max(...data.map((d) => d.count), 1)])
      .range([MARGIN.left, width - MARGIN.right])
      .nice()

    return { yScale: y, xScale: x }
  }, [data, width, chartHeight])

  if (data.length === 0) {
    return (
      <div className="card-naturalism p-5">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
          Top Authors
        </span>
        <p className="text-[#78716C] font-sans text-sm">No author data available.</p>
      </div>
    )
  }

  return (
    <div className="card-naturalism p-5">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
        Top Authors
      </span>
      <div ref={containerRef} className="w-full overflow-x-auto">
        <svg width={width} height={chartHeight} className="block">
          {data.map((author) => {
            const y = yScale(author.handle) ?? 0
            const barWidth = xScale(author.count) - MARGIN.left
            const isHovered = hoveredHandle === author.handle

            return (
              <g
                key={author.handle}
                className="cursor-pointer"
                onClick={() => onAuthorClick?.(author.handle)}
                onMouseEnter={() => setHoveredHandle(author.handle)}
                onMouseLeave={() => setHoveredHandle(null)}
              >
                <text
                  x={MARGIN.left - 8}
                  y={y + (yScale.bandwidth() / 2)}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-[#78716C] font-sans text-[11px]"
                >
                  @{author.handle.length > 14 ? author.handle.slice(0, 13) + '…' : author.handle}
                </text>
                <rect
                  x={MARGIN.left}
                  y={y}
                  width={Math.max(barWidth, 0)}
                  height={yScale.bandwidth()}
                  rx={3}
                  fill={isHovered ? '#EA580C' : '#F97316'}
                  className="transition-colors duration-150"
                />
                <text
                  x={xScale(author.count) + 6}
                  y={y + (yScale.bandwidth() / 2)}
                  dy="0.35em"
                  className="fill-[#78716C] font-sans text-[11px]"
                >
                  {author.count}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export const TopAuthorsChart = dynamic(() => Promise.resolve(TopAuthorsChartInner), {
  ssr: false,
})
