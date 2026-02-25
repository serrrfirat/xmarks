'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { area as d3Area, stack as d3Stack, curveMonotoneX } from 'd3-shape'
import { scaleLinear, scalePoint } from 'd3-scale'
import dynamic from 'next/dynamic'
import type { InterestPoint } from '@/lib/types'

interface InterestTimelineChartProps {
  data: InterestPoint[]
}

const WARM_PALETTE = [
  '#F97316', '#FB923C', '#FDBA74', '#EA580C', '#C2410C',
  '#FED7AA', '#9A3412', '#7C2D12', '#FFF7ED', '#431407',
]

const MARGIN = { top: 16, right: 16, bottom: 28, left: 40 }
const HEIGHT = 240

function InterestTimelineChartInner({ data }: InterestTimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)

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

  const { layers, xScale, yScale, allCategories, months } = useMemo(() => {
    // Collect all unique categories
    const catSet = new Set<string>()
    for (const point of data) {
      for (const cat of point.categories) catSet.add(cat.name)
    }
    const cats = Array.from(catSet)

    // Build tabular data for d3.stack
    const tableData = data.map((point) => {
      const row: Record<string, number | string> = { month: point.month }
      for (const cat of cats) {
        const found = point.categories.find((c) => c.name === cat)
        row[cat] = found ? found.count : 0
      }
      return row
    })

    const stackGen = d3Stack<Record<string, number | string>>()
      .keys(cats)

    const stackedData = stackGen(tableData)

    const monthLabels = data.map((d) => d.month)

    const x = scalePoint<string>()
      .domain(monthLabels)
      .range([MARGIN.left, width - MARGIN.right])
      .padding(0.1)

    const maxY = Math.max(
      ...stackedData.flatMap((layer) => layer.map((d) => d[1])),
      1
    )

    const y = scaleLinear()
      .domain([0, maxY])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top])
      .nice()

    const areaGen = d3Area<[number, number]>()
      .x((_, i) => x(monthLabels[i]) ?? 0)
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curveMonotoneX)

    const computedLayers = stackedData.map((layer, i) => ({
      key: layer.key,
      path: areaGen(layer as unknown as Array<[number, number]>) ?? '',
      color: WARM_PALETTE[i % WARM_PALETTE.length],
    }))

    return {
      layers: computedLayers,
      xScale: x,
      yScale: y,
      allCategories: cats,
      months: monthLabels,
    }
  }, [data, width])

  if (data.length === 0) {
    return (
      <div className="card-naturalism p-5">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
          Interest Over Time
        </span>
        <p className="text-[#78716C] font-sans text-sm">No timeline data available.</p>
      </div>
    )
  }

  const yTicks = yScale.ticks(4)

  return (
    <div className="card-naturalism p-5">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
        Interest Over Time
      </span>
      <div ref={containerRef} className="w-full overflow-x-auto">
        <svg width={width} height={HEIGHT} className="block">
          {/* Y-axis grid lines */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={yScale(tick)}
                y2={yScale(tick)}
                stroke="#292524"
                strokeDasharray="2,3"
              />
              <text
                x={MARGIN.left - 6}
                y={yScale(tick)}
                dy="0.35em"
                textAnchor="end"
                className="fill-[#78716C] font-sans text-[10px]"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Stacked areas */}
          {layers.map((layer) => (
            <path
              key={layer.key}
              d={layer.path}
              fill={layer.color}
              fillOpacity={0.7}
              stroke={layer.color}
              strokeWidth={1}
            />
          ))}

          {/* Hover columns */}
          {months.map((month) => {
            const x = xScale(month) ?? 0
            return (
              <rect
                key={month}
                x={x - 12}
                y={MARGIN.top}
                width={24}
                height={HEIGHT - MARGIN.top - MARGIN.bottom}
                fill="transparent"
                className="cursor-default"
                onMouseEnter={() => setHoveredMonth(month)}
                onMouseLeave={() => setHoveredMonth(null)}
              />
            )
          })}

          {/* Hover line */}
          {hoveredMonth && (
            <line
              x1={xScale(hoveredMonth) ?? 0}
              x2={xScale(hoveredMonth) ?? 0}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              stroke="#78716C"
              strokeWidth={1}
              strokeDasharray="3,3"
              pointerEvents="none"
            />
          )}

          {/* X-axis labels */}
          {months.map((month, i) => {
            const skipInterval = months.length > 14 ? 3 : months.length > 8 ? 2 : 1
            if (i % skipInterval !== 0) return null
            const isDaily = month.length === 10
            const shortLabel = isDaily
              ? new Date(month + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            return (
              <text
                key={month}
                x={xScale(month) ?? 0}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-[#78716C] font-sans text-[10px]"
              >
                {shortLabel}
              </text>
            )
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {allCategories.slice(0, 6).map((cat, i) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: WARM_PALETTE[i % WARM_PALETTE.length] }}
            />
            <span className="text-[#78716C] font-sans text-[10px]">
              {cat.length > 18 ? cat.slice(0, 17) + '…' : cat}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const InterestTimelineChart = dynamic(
  () => Promise.resolve(InterestTimelineChartInner),
  { ssr: false }
)
