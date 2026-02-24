'use client'

import { useMemo, useState } from 'react'
import { arc as d3Arc, pie as d3Pie } from 'd3-shape'
import dynamic from 'next/dynamic'
import type { TopicDistribution } from '@/lib/types'
import type { PieArcDatum } from 'd3-shape'

interface TopicDistributionChartProps {
  data: TopicDistribution[]
}

const WARM_PALETTE = [
  '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFF7ED',
  '#EA580C', '#C2410C', '#9A3412', '#7C2D12', '#431407',
]

const SIZE = 280
const OUTER_R = SIZE / 2 - 8
const INNER_R = OUTER_R * 0.58

function TopicDistributionChartInner({ data }: TopicDistributionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const totalCount = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data])

  const arcs = useMemo(() => {
    const pieGen = d3Pie<TopicDistribution>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.02)

    const arcGen = d3Arc<PieArcDatum<TopicDistribution>>()
      .innerRadius(INNER_R)
      .outerRadius(OUTER_R)
      .cornerRadius(3)

    const arcHoverGen = d3Arc<PieArcDatum<TopicDistribution>>()
      .innerRadius(INNER_R)
      .outerRadius(OUTER_R + 6)
      .cornerRadius(3)

    const pieData = pieGen(data)

    return pieData.map((d, i) => ({
      d: arcGen(d) ?? '',
      dHover: arcHoverGen(d) ?? '',
      color: WARM_PALETTE[i % WARM_PALETTE.length],
      topic: d.data,
      centroid: arcGen.centroid(d),
    }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="card-naturalism p-5">
        <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
          Topic Distribution
        </span>
        <p className="text-[#78716C] font-sans text-sm">No topic data available.</p>
      </div>
    )
  }

  const hovered = hoveredIndex !== null ? arcs[hoveredIndex] : null

  return (
    <div className="card-naturalism p-5">
      <span className="text-[#78716C] font-sans text-xs font-medium uppercase tracking-wider block mb-3">
        Topic Distribution
      </span>
      <div className="flex flex-col items-center">
        <svg width={SIZE} height={SIZE} className="block">
          <g transform={`translate(${SIZE / 2}, ${SIZE / 2})`}>
            {arcs.map((a, i) => (
              <path
                key={a.topic.name}
                d={hoveredIndex === i ? a.dHover : a.d}
                fill={a.color}
                className="transition-all duration-150 cursor-default"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}
            {/* Center text */}
            <text
              textAnchor="middle"
              dy="-0.2em"
              className="fill-[#E7E5E4] font-sans text-2xl font-semibold"
            >
              {totalCount.toLocaleString()}
            </text>
            <text
              textAnchor="middle"
              dy="1.2em"
              className="fill-[#78716C] font-sans text-[10px] uppercase tracking-wider"
            >
              bookmarks
            </text>
          </g>
        </svg>
        {/* Tooltip */}
        <div className="h-5 mt-2">
          {hovered && (
            <span className="text-[#E7E5E4] font-sans text-xs">
              {hovered.topic.emoji ? `${hovered.topic.emoji} ` : ''}
              {hovered.topic.name} — {hovered.topic.percentage.toFixed(1)}%
            </span>
          )}
        </div>
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center">
          {arcs.slice(0, 7).map((a, i) => (
            <div
              key={a.topic.name}
              className="flex items-center gap-1.5 cursor-default"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-[#78716C] font-sans text-[10px]">
                {a.topic.name.length > 16 ? a.topic.name.slice(0, 15) + '…' : a.topic.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const TopicDistributionChart = dynamic(() => Promise.resolve(TopicDistributionChartInner), {
  ssr: false,
})
