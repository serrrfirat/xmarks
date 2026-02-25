'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'

import type { GraphData } from '@/lib/types'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthorSheet } from '@/components/author-sheet'
import { TimelineControls } from '@/components/timeline-controls'

const GraphCanvas = dynamic(
  () => import('@/components/graph-canvas').then((m) => m.GraphCanvas),
  { ssr: false },
)

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopics, setShowTopics] = useState(true)
  const [timelineEnabled, setTimelineEnabled] = useState(false)
  const [currentDate, setCurrentDate] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/graph')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: GraphData) => setGraphData(data))
      .catch(() => setGraphData({ nodes: [], edges: [] }))
      .finally(() => setLoading(false))
  }, [])

  const filteredData = useMemo<GraphData | null>(() => {
    if (!graphData) return null
    if (showTopics) return graphData

    const topicIds = new Set(
      graphData.nodes.filter((n) => n.type === 'topic').map((n) => n.id),
    )
    return {
      nodes: graphData.nodes.filter((n) => n.type !== 'topic'),
      edges: graphData.edges.filter(
        (e) => !topicIds.has(e.source) && !topicIds.has(e.target),
      ),
    }
  }, [graphData, showTopics])

  const dateRange = useMemo(() => {
    if (!graphData) return null
    const dates = graphData.nodes
      .map((n) => n.firstBookmarkedAt)
      .filter(Boolean) as string[]
    if (dates.length === 0) return null
    dates.sort()
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [graphData])

  useEffect(() => {
    if (!dateRange) {
      setCurrentDate('')
      setIsPlaying(false)
      return
    }
    setCurrentDate(dateRange.min)
  }, [dateRange])

  useEffect(() => {
    if (!isPlaying || !dateRange) return
    const interval = setInterval(() => {
      setCurrentDate((prev) => {
        const current = new Date(prev || dateRange.min)
        current.setHours(current.getHours() + 6 * speed)
        if (current.getTime() > new Date(dateRange.max).getTime()) {
          setIsPlaying(false)
          return dateRange.max
        }
        return current.toISOString()
      })
    }, 50)
    return () => clearInterval(interval)
  }, [isPlaying, speed, dateRange])

  const timeFilteredData = useMemo<GraphData | null>(() => {
    if (!filteredData || !timelineEnabled || !currentDate) return filteredData

    const cutoff = currentDate
    const visibleNodes = new Set<string>()
    const nodes = filteredData.nodes.filter((n) => {
      if (!n.firstBookmarkedAt) {
        visibleNodes.add(n.id)
        return true
      }
      const visible = n.firstBookmarkedAt <= cutoff
      if (visible) visibleNodes.add(n.id)
      return visible
    })
    const edges = filteredData.edges.filter(
      (e) => visibleNodes.has(e.source) && visibleNodes.has(e.target),
    )
    return { nodes, edges }
  }, [filteredData, timelineEnabled, currentDate])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto animate-fadeIn">
            <div className="mb-6">
              <h1 className="font-serif text-2xl font-light tracking-[-0.02em] text-[#E7E5E4]">
                Bookmark Graph
              </h1>
              <p className="text-[#78716C] font-sans text-sm mt-1">
                Explore connections between authors and topics
              </p>
            </div>

            {/* Controls bar */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-[#292524] bg-[#1C1917] px-4 py-2.5">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTopics}
                    onChange={(e) => setShowTopics(e.target.checked)}
                    className="size-4 rounded border-[#292524] bg-[#0C0A09] accent-[#F97316]"
                  />
                  <span className="text-sm text-[#E7E5E4]">Show topics</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={timelineEnabled}
                    onChange={(e) => {
                      setTimelineEnabled(e.target.checked)
                      if (!e.target.checked) setIsPlaying(false)
                    }}
                    className="size-4 rounded border-[#292524] bg-[#0C0A09] accent-[#F97316]"
                  />
                  <span className="text-sm text-[#E7E5E4]">Timeline replay</span>
                </label>
              </div>
              <span className="text-xs text-[#78716C]">
                Click an author to view profile &middot; Scroll to zoom &middot; Drag to pan
              </span>
            </div>

            {timelineEnabled && dateRange && (
              <div className="mb-4">
                <TimelineControls
                  minDate={dateRange.min}
                  maxDate={dateRange.max}
                  currentDate={currentDate}
                  isPlaying={isPlaying}
                  speed={speed}
                  onDateChange={setCurrentDate}
                  onPlayToggle={() => setIsPlaying((p) => !p)}
                  onSpeedChange={setSpeed}
                />
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div
                className="flex items-center justify-center"
                style={{ height: 'calc(100vh - 260px)' }}
              >
                <div className="space-y-2 text-center">
                  <div className="mx-auto size-8 animate-spin rounded-full border-2 border-[#292524] border-t-[#F97316]" />
                  <p className="text-sm text-[#78716C] font-sans animate-pulse">
                    Loading graph&hellip;
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && timeFilteredData && timeFilteredData.nodes.length === 0 && (
              <div
                className="card-naturalism flex items-center justify-center border-dashed border-[#292524]"
                style={{ height: 'calc(100vh - 260px)' }}
              >
                <div className="space-y-2 text-center">
                  <p className="text-[#E7E5E4] font-serif text-lg font-light">
                    No bookmarks yet
                  </p>
                  <p className="text-[#78716C] font-sans text-sm">
                    Sync your bookmarks to see the graph
                  </p>
                </div>
              </div>
            )}

            {/* Graph canvas */}
            {!loading && timeFilteredData && timeFilteredData.nodes.length > 0 && (
              <div
                className="overflow-hidden rounded-lg border border-[#292524]"
                style={{ height: 'calc(100vh - 260px)' }}
              >
                <GraphCanvas
                  data={timeFilteredData}
                  onAuthorClick={(handle) => {
                    setSelectedAuthor(handle)
                    setSheetOpen(true)
                  }}
                />
              </div>
            )}
          </div>

          <AuthorSheet
            handle={selectedAuthor}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
          />
        </main>
      </div>
    </div>
  )
}
