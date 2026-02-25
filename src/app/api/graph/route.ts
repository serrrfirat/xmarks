import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { GraphData, GraphNode, GraphEdge } from '@/lib/types'

const TOPIC_COLORS = [
  '#F97316',
  '#FB923C',
  '#EA580C',
  '#C2410C',
  '#9A3412',
  '#FDBA74',
  '#FED7AA',
  '#D97706',
  '#B45309',
  '#92400E',
]

function topicColor(topic: string | undefined): string {
  if (!topic) return '#78716C'
  let hash = 0
  for (const ch of topic) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return TOPIC_COLORS[hash % TOPIC_COLORS.length]
}

export async function GET() {
  try {
    const db = getDb()
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    // 1. Author nodes
    const authorRows = db
      .prepare(
        `SELECT author_handle, author_name, COUNT(*) as count
         FROM tweets
         GROUP BY author_handle
         ORDER BY count DESC`
      )
      .all() as { author_handle: string; author_name: string; count: number }[]

    const authorFirstBookmarkedRows = db
      .prepare(
        `SELECT author_handle, MIN(bookmarked_at) as first_bookmarked_at
         FROM tweets
         GROUP BY author_handle`
      )
      .all() as { author_handle: string; first_bookmarked_at: string }[]

    const authorFirstBookmarkedMap = new Map(
      authorFirstBookmarkedRows.map((row) => [row.author_handle, row.first_bookmarked_at]),
    )

    // 2. Check if semantic_categories has any data
    const categoryCount = db
      .prepare('SELECT COUNT(*) as cnt FROM semantic_categories')
      .get() as { cnt: number }

    const hasCategories = categoryCount.cnt > 0

    let topicNodes: {
      id: number
      name: string
      emoji: string | null
      count: number
    }[] = []

    const topicFirstBookmarkedMap = new Map<number, string>()

    const primaryTopicMap = new Map<string, string>()

    if (hasCategories) {
      // 3. Topic nodes
      topicNodes = db
        .prepare(
          `SELECT sc.id, sc.name, sc.emoji, COUNT(*) as count
           FROM tweets t
           JOIN semantic_categories sc ON t.category_id = sc.id
           GROUP BY sc.id
           ORDER BY count DESC`
        )
        .all() as typeof topicNodes

      const topicFirstBookmarkedRows = db
        .prepare(
          `SELECT category_id, MIN(bookmarked_at) as first_bookmarked_at
           FROM tweets
           WHERE category_id IS NOT NULL
           GROUP BY category_id`
        )
        .all() as { category_id: number; first_bookmarked_at: string }[]

      for (const row of topicFirstBookmarkedRows) {
        topicFirstBookmarkedMap.set(row.category_id, row.first_bookmarked_at)
      }

      // 4. Primary topic per author (take first = highest count due to ORDER BY)
      const primaryTopicRows = db
        .prepare(
          `SELECT t.author_handle, sc.name as topic_name, COUNT(*) as cnt
           FROM tweets t
           JOIN semantic_categories sc ON t.category_id = sc.id
           GROUP BY t.author_handle, sc.id
           ORDER BY cnt DESC`
        )
        .all() as { author_handle: string; topic_name: string; cnt: number }[]

      for (const row of primaryTopicRows) {
        if (!primaryTopicMap.has(row.author_handle)) {
          primaryTopicMap.set(row.author_handle, row.topic_name)
        }
      }

      // 5. Author→Topic edges
      const authorTopicRows = db
        .prepare(
          `SELECT t.author_handle, sc.id as category_id, sc.name as topic_name, COUNT(*) as weight
           FROM tweets t
           JOIN semantic_categories sc ON t.category_id = sc.id
           GROUP BY t.author_handle, sc.id`
        )
        .all() as {
        author_handle: string
        category_id: number
        topic_name: string
        weight: number
      }[]

      for (const row of authorTopicRows) {
        edges.push({
          source: row.author_handle,
          target: `topic-${row.category_id}`,
          weight: row.weight,
          type: 'author-topic',
        })
      }

      // Add topic nodes
      for (const t of topicNodes) {
        nodes.push({
          id: `topic-${t.id}`,
          type: 'topic',
          label: t.name,
          size: t.count,
          color: topicColor(t.name),
          firstBookmarkedAt: topicFirstBookmarkedMap.get(t.id),
        })
      }
    }

    // Add author nodes (always)
    for (const a of authorRows) {
      const primary = primaryTopicMap.get(a.author_handle)
      nodes.push({
        id: a.author_handle,
        type: 'author',
        label: a.author_handle,
        size: a.count,
        color: topicColor(primary),
        primaryTopic: primary,
        firstBookmarkedAt: authorFirstBookmarkedMap.get(a.author_handle),
      })
    }

    // 6. Author↔Author edges (shared conversations)
    const authorAuthorRows = db
      .prepare(
        `SELECT DISTINCT t1.author_handle as source, t2.author_handle as target
         FROM tweets t1
         JOIN tweets t2
           ON t1.conversation_id = t2.conversation_id
           AND t1.author_handle < t2.author_handle
         WHERE t1.conversation_id IS NOT NULL AND t1.conversation_id != ''`
      )
      .all() as { source: string; target: string }[]

    for (const row of authorAuthorRows) {
      edges.push({
        source: row.source,
        target: row.target,
        weight: 1,
        type: 'author-author',
      })
    }

    const data: GraphData = { nodes, edges }
    return NextResponse.json(data satisfies GraphData)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to build graph' },
      { status: 500 }
    )
  }
}
