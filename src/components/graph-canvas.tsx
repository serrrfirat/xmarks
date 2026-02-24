'use client'

import dynamic from 'next/dynamic'

import type { GraphData } from '@/lib/types'

export interface GraphCanvasProps {
  data: GraphData
  onAuthorClick?: (handle: string) => void
  onTopicClick?: (categoryId: number) => void
  width?: number
  height?: number
}

const GraphCanvasInner = dynamic(() => import('./graph-canvas-inner'), {
  ssr: false,
})

export function GraphCanvas(props: GraphCanvasProps) {
  return <GraphCanvasInner {...props} />
}
