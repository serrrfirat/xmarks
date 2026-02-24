'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { scaleLinear, scaleSqrt } from 'd3-scale'
import dynamic from 'next/dynamic'
import type { EngagementPoint } from '@/lib/types'

interface EngagementScatterProps {
  data: EngagementPoint[]
  onAuthorClick?: (handle: string) => void
}

const TOPIC_COLORS: Record<string, string> = {}
const COLOR_POOL = [
  '#F97316', '#FB923C', '#FDBA74', '#EA580C', '#C2410C',
  '#FED7AA', '#9A3412', '#FFF7ED', '#7C2D12', '#431407',
]

function getTopicColor(topic: string | null): string {
  if (!topic) return '#78716C'
  if (!(topic in TOPIC_COLORS)) {
    TOPIC_COLORS[topic] = COLOR_POOL[Object.keys(TOPIC_COLORS).length % COLOR_POOL.length]
  }
  return TOPIC_COLORS[topic]
}

const MARGIN = { top: 24, right: 16, bottom: 36, left: 48 }
const HEIGHT = 300

function EngagementScatterInner({ data, onAuthorClick }: EngagementScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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

  const { xScale, yScale, sizeScale, points } = useMemo(() => {
    const maxLikes = Math.max(...data.map((d) => d.likes), 1)
    const maxRetweets = Math.max(...data.map((d) => d.retweets), 1)
    const maxReplies = Math.max(...data.map((d) => d.replies), 1)

    const x = scaleLinear()
      .domain([0, maxLikes])
      .range([MARGIN.left, width - MARGIN.right])
      .nice()

    const y = scaleLinear()
      .domain([0, maxRetweets])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top])
      .nice()

    const size = scaleSqrt()
      .domain([0, maxReplies])
      .range([3, 20])

    const pts = data.map((d) => ({
      ...d,
      cx: x(d.likes),
      cy: y(d.retweets),
      r: size(d.replies),
      fill: getTopicColor(d.topic),
    }))

    return { xScale: x, yScale: y, sizeScale: size, points: pts }
  }, [data, width])

  if (data.length === 0) {
    return (
      <div className="card-naturalism p-5">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
          Engagement
        </span>
        <p className="text-[#78716C] font-sans text-sm">No engagement data available.</p>
      </div>
    )
  }

  const xTicks = xScale.ticks(5)
  const yTicks = yScale.ticks(5)
  const hoveredPoint = hoveredId ? points.find((p) => p.id === hoveredId) : null

  return (
    <div className="card-naturalism p-5">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
        Engagement
      </span>
      <div ref={containerRef} className="w-full overflow-x-auto relative">
        <svg width={width} height={HEIGHT} className="block">
          {/* Grid lines */}
          {xTicks.map((tick) => (
            <line
              key={`x-${tick}`}
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              stroke="#292524"
              strokeDasharray="2,3"
            />
          ))}
          {yTicks.map((tick) => (
            <line
              key={`y-${tick}`}
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#292524"
              strokeDasharray="2,3"
            />
          ))}

          {/* Circles */}
          {points.map((p) => (
            <circle
              key={p.id}
              cx={p.cx}
              cy={p.cy}
              r={hoveredId === p.id ? p.r + 2 : p.r}
              fill={p.fill}
              fillOpacity={hoveredId === p.id ? 0.95 : 0.6}
              stroke={hoveredId === p.id ? '#E7E5E4' : 'none'}
              strokeWidth={1.5}
              className="cursor-pointer transition-all duration-150"
              onClick={() => onAuthorClick?.(p.authorHandle)}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick) => (
            <text
              key={`xl-${tick}`}
              x={xScale(tick)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-[#78716C] font-sans text-[10px]"
            >
              {tick}
            </text>
          ))}
          <text
            x={width / 2}
            y={HEIGHT}
            textAnchor="middle"
            className="fill-[#78716C] font-sans text-[10px] uppercase"
          >
            likes
          </text>

          {/* Y-axis labels */}
          {yTicks.map((tick) => (
            <text
              key={`yl-${tick}`}
              x={MARGIN.left - 8}
              y={yScale(tick)}
              dy="0.35em"
              textAnchor="end"
              className="fill-[#78716C] font-sans text-[10px]"
            >
              {tick}
            </text>
          ))}
          <text
            x={12}
            y={HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${HEIGHT / 2})`}
            className="fill-[#78716C] font-sans text-[10px] uppercase"
          >
            retweets
          </text>
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none bg-[#1C1917] border border-[#292524] rounded-md px-2.5 py-1.5 shadow-lg z-10"
            style={{
              left: Math.min(hoveredPoint.cx + 12, width - 140),
              top: hoveredPoint.cy - 36,
            }}
          >
            <span className="text-[#E7E5E4] font-sans text-xs font-medium block">
              @{hoveredPoint.authorHandle}
            </span>
            <span className="text-[#78716C] font-sans text-[10px]">
              {hoveredPoint.likes} likes · {hoveredPoint.retweets} rt · {hoveredPoint.replies} replies
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export const EngagementScatter = dynamic(() => Promise.resolve(EngagementScatterInner), {
  ssr: false,
})
