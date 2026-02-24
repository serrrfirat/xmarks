import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { SpotlightResult } from '@/lib/types'

// Copy directly from src/lib/search.ts — do not re-import (circular dependency risk)
function escapeFts5Query(query: string): string {
  const cleaned = query
    .replace(/[*"]/g, '')
    .replace(/\b(OR|AND|NOT|NEAR)\b/gi, '')
    .trim()

  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.map((w) => `"${w}"`).join(' ')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') ?? '').trim()

    // Return empty for queries shorter than 2 chars
    if (q.length < 2) {
      return NextResponse.json({ tweets: [], authors: [] } satisfies SpotlightResult)
    }

    const db = getDb()
    const escapedBase = escapeFts5Query(q)

    // Tweet search via FTS5 with prefix matching
    let tweetRows: Array<{ id: string; text: string; author_handle: string; author_name: string; url: string }> = []
    if (escapedBase) {
      // Build prefix query: last word gets * for prefix matching
      const words = escapedBase.split(' ').filter(Boolean)
      const prefixQuery = words.length > 0
        ? [...words.slice(0, -1), words[words.length - 1].replace(/"$/, '') + '*"'].join(' ')
        : escapedBase

      try {
        tweetRows = db.prepare(`
          SELECT t.id, t.text, t.author_handle, t.author_name, t.url
          FROM tweets_fts f
          JOIN tweets t ON f.rowid = t.rowid
          WHERE tweets_fts MATCH ?
          ORDER BY rank
          LIMIT 8
        `).all(prefixQuery) as typeof tweetRows
      } catch {
        // FTS5 query failed (syntax error), fall back to LIKE
        const likeQuery = `%${q.replace(/[%_]/g, '\\$&')}%`
        tweetRows = db.prepare(`
          SELECT id, text, author_handle, author_name, url
          FROM tweets
          WHERE text LIKE ? ESCAPE '\\'
          ORDER BY bookmarked_at DESC
          LIMIT 8
        `).all(likeQuery) as typeof tweetRows
      }
    }

    // Author search via LIKE on handle and name
    const likeQuery = `%${q.replace(/[%_]/g, '\\$&')}%`
    const authorRows = db.prepare(`
      SELECT author_handle, author_name, COUNT(*) as bookmark_count
      FROM tweets
      WHERE author_handle LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\'
      GROUP BY author_handle
      ORDER BY bookmark_count DESC
      LIMIT 5
    `).all(likeQuery, likeQuery) as Array<{ author_handle: string; author_name: string; bookmark_count: number }>

    const result: SpotlightResult = {
      tweets: tweetRows.map(row => ({
        id: row.id,
        text: row.text.slice(0, 120),
        authorHandle: row.author_handle,
        authorName: row.author_name,
        url: row.url,
      })),
      authors: authorRows.map(row => ({
        handle: row.author_handle,
        name: row.author_name,
        bookmarkCount: row.bookmark_count,
      })),
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
