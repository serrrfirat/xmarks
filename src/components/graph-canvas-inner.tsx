'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// @ts-expect-error D3 type packages are not installed in this repo.
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force'
// @ts-expect-error D3 type packages are not installed in this repo.
import { select } from 'd3-selection'
// @ts-expect-error D3 type packages are not installed in this repo.
import { zoom, zoomIdentity } from 'd3-zoom'

import type { GraphData, GraphEdge, GraphNode } from '@/lib/types'

interface GraphCanvasInnerProps {
  data: GraphData
  onAuthorClick?: (handle: string) => void
  onTopicClick?: (categoryId: number) => void
  width?: number
  height?: number
}

type SimNode = GraphNode & {
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

type SimLink = Omit<GraphEdge, 'source' | 'target'> & {
  source: string | SimNode
  target: string | SimNode
}

type Transform = {
  x: number
  y: number
  k: number
}

const BACKGROUND = '#0C0A09'
const EDGE_COLOR = '#292524'
const TOPIC_COLOR = '#F97316'
const LABEL_COLOR = '#E7E5E4'
const LABEL_THRESHOLD = 8

interface TooltipState {
  visible: boolean
  x: number
  y: number
  content: string
}

function nodeRadius(node: GraphNode): number {
  const base = Math.max(4, Math.sqrt(Math.max(node.size, 1)) * 1.8)
  return node.type === 'topic' ? base + 2 : base
}

function parseTopicId(nodeId: string): number | null {
  if (!nodeId.startsWith('topic-')) return null
  const parsed = Number(nodeId.slice(6))
  return Number.isFinite(parsed) ? parsed : null
}

export default function GraphCanvasInner({
  data,
  onAuthorClick,
  onTopicClick,
  width = 960,
  height = 600,
}: GraphCanvasInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const simulationRef = useRef<any>(null)
  const linkForceRef = useRef<any>(null)
  const nodesRef = useRef<SimNode[]>([])
  const linksRef = useRef<SimLink[]>([])
  const transformRef = useRef<Transform>(zoomIdentity as Transform)
  const draggedNodeRef = useRef<SimNode | null>(null)
  const dragDistanceRef = useRef(0)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const dprRef = useRef(1)

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = dprRef.current
    const transform = transformRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    ctx.strokeStyle = EDGE_COLOR
    for (const link of linksRef.current) {
      const source = typeof link.source === 'string' ? null : link.source
      const target = typeof link.target === 'string' ? null : link.target
      if (!source || !target) continue
      if (source.x == null || source.y == null || target.x == null || target.y == null) continue

      ctx.beginPath()
      ctx.lineWidth = 0.5 + Math.min(4, link.weight * 0.35)
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()
    }

    for (const node of nodesRef.current) {
      if (node.x == null || node.y == null) continue
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeRadius(node), 0, Math.PI * 2)
      ctx.fillStyle = node.type === 'topic' ? TOPIC_COLOR : node.color
      ctx.fill()
    }

    ctx.fillStyle = LABEL_COLOR
    ctx.font = '12px ui-sans-serif, sans-serif'
    for (const node of nodesRef.current) {
      if (node.size <= LABEL_THRESHOLD || node.x == null || node.y == null) continue
      const radius = nodeRadius(node)
      ctx.fillText(node.label, node.x + radius + 4, node.y + 4)
    }

    ctx.restore()
  }, [height, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    dprRef.current = dpr
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const linkForce = forceLink<SimNode, SimLink>([])
      .id((d: SimNode) => d.id)
      .distance((d: SimLink) => Math.max(36, 170 - d.weight * 14))
      .strength((d: SimLink) => Math.min(1, 0.2 + d.weight * 0.08))

    const simulation = forceSimulation<SimNode, SimLink>([])
      .force('link', linkForce)
      .force('charge', forceManyBody<SimNode>().strength((d: SimNode) => -Math.max(50, d.size * 10)))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>().radius((d: SimNode) => nodeRadius(d) + 2))
      .on('tick', draw)

    simulationRef.current = simulation
    linkForceRef.current = linkForce

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event: { transform: Transform }) => {
        transformRef.current = event.transform
        draw()
      })

    const selection = select(canvas)
    selection.call(zoomBehavior)
    selection.call(zoomBehavior.transform, zoomIdentity)

    draw()

    return () => {
      selection.on('.zoom', null)
      simulation.stop()
      simulationRef.current = null
      linkForceRef.current = null
    }
  }, [draw, height, width])

  useEffect(() => {
    const simulation = simulationRef.current
    const linkForce = linkForceRef.current
    if (!simulation || !linkForce) return

    const nodes = structuredClone(data.nodes) as SimNode[]
    const links = structuredClone(data.edges) as SimLink[]

    nodesRef.current = nodes
    linksRef.current = links

    simulation.nodes(nodes)
    linkForce.links(links)
    simulation.alpha(0.3).restart()
    draw()
  }, [data, draw])

  const getGraphCoordinates = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const canvasX = event.clientX - rect.left
    const canvasY = event.clientY - rect.top
    const t = transformRef.current

    return {
      canvasX,
      canvasY,
      graphX: (canvasX - t.x) / t.k,
      graphY: (canvasY - t.y) / t.k,
    }
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const simulation = simulationRef.current
    if (!simulation) return

    const coords = getGraphCoordinates(event)
    if (!coords) return

    const pickRadius = 18 / transformRef.current.k
    const node = simulation.find(coords.graphX, coords.graphY, pickRadius) as SimNode | undefined
    if (!node) return

    draggedNodeRef.current = node
    dragDistanceRef.current = 0
    lastPointerRef.current = { x: coords.canvasX, y: coords.canvasY }
    node.fx = node.x ?? coords.graphX
    node.fy = node.y ?? coords.graphY
    simulation.alphaTarget(0.2).restart()
  }, [getGraphCoordinates])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const simulation = simulationRef.current
    if (!simulation) return

    const coords = getGraphCoordinates(event)
    if (!coords) return

    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current
      const last = lastPointerRef.current
      if (last) {
        const dx = coords.canvasX - last.x
        const dy = coords.canvasY - last.y
        dragDistanceRef.current += Math.hypot(dx, dy)
      }
      lastPointerRef.current = { x: coords.canvasX, y: coords.canvasY }
      node.fx = coords.graphX
      node.fy = coords.graphY
      simulation.alphaTarget(0.2).restart()
      return
    }

    const hoverRadius = 16 / transformRef.current.k
    const node = simulation.find(coords.graphX, coords.graphY, hoverRadius) as SimNode | undefined
    if (!node) {
      setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev))
      return
    }

    setTooltip({
      visible: true,
      x: coords.canvasX + 12,
      y: coords.canvasY + 12,
      content: `${node.label} (${node.size})`,
    })
  }, [getGraphCoordinates])

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const simulation = simulationRef.current
    if (!simulation) return

    const dragged = draggedNodeRef.current
    if (!dragged) return

    simulation.alphaTarget(0)
    dragged.fx = null
    dragged.fy = null

    if (dragDistanceRef.current < 4) {
      if (dragged.type === 'author') {
        onAuthorClick?.(dragged.id)
      } else {
        const topicId = parseTopicId(dragged.id)
        if (topicId != null) onTopicClick?.(topicId)
      }
    }

    draggedNodeRef.current = null
    lastPointerRef.current = null
  }, [onAuthorClick, onTopicClick])

  const handlePointerLeave = useCallback(() => {
    const simulation = simulationRef.current
    if (draggedNodeRef.current && simulation) {
      simulation.alphaTarget(0)
      draggedNodeRef.current.fx = null
      draggedNodeRef.current.fy = null
      draggedNodeRef.current = null
    }
    lastPointerRef.current = null
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev))
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#292524] bg-[#0C0A09]">
      <canvas
        ref={canvasRef}
        className="block cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      {tooltip.visible ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#292524] bg-[#1C1917] px-2 py-1 text-xs text-[#E7E5E4]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      ) : null}
    </div>
  )
}
