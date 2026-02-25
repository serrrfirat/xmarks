import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'
import type { Tweet } from '@/lib/types'

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'this',
  'that',
  'with',
  'from',
  'have',
  'will',
  'been',
  'your',
  'are',
  'was',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'one',
  'our',
  'out',
  'has',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'way',
  'who',
  'did',
  'get',
  'let',
  'say',
  'she',
  'too',
  'use',
])

function rowToTweet(row: Record<string, unknown>): Tweet {
  return {
    id: row.id as string,
    text: row.text as string,
    authorHandle: row.author_handle as string,
    authorName: row.author_name as string,
    authorAvatarUrl: row.author_avatar_url as string | null,
    authorId: row.author_id as string,
    conversationId: row.conversation_id as string,
    createdAt: row.created_at as string,
    bookmarkedAt: row.bookmarked_at as string,
    likeCount: row.like_count as number,
    replyCount: row.reply_count as number,
    retweetCount: row.retweet_count as number,
    inReplyToId: row.in_reply_to_id as string | undefined,
    isThread: (row.is_thread as number) === 1,
    mediaJson: row.media_urls as string | null,
    quotedTweetJson: row.quoted_tweet_id as string | null,
    url: row.url as string,
    categoryId: row.category_id as number | null,
    classifiedAt: row.classified_at as string | null,
  }
}

function extractKeywords(text: string): string[] {
  const frequencies = new Map<string, number>()
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1)
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word]) => word)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const db = getDb()

    const target = db
      .query('SELECT id, text, category_id, author_handle FROM tweets WHERE id = ?')
      .get(id) as { id: string; text: string; category_id: number | null; author_handle: string } | null

    if (!target) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 })
    }

    const keywords = extractKeywords(target.text)
    if (keywords.length === 0) {
      return NextResponse.json({ data: [] as Tweet[] })
    }

    const ftsQuery = keywords.map((word) => `"${word}"`).join(' OR ')

    const rows = db
      .query(
        `SELECT
          t.id,
          t.text,
          t.author_handle,
          t.author_name,
          t.author_avatar_url,
          t.author_id,
          t.conversation_id,
          t.created_at,
          t.bookmarked_at,
          t.like_count,
          t.reply_count,
          t.retweet_count,
          t.in_reply_to_id,
          t.is_thread,
          t.media_urls,
          t.quoted_tweet_id,
          t.url,
          t.category_id,
          t.classified_at,
          CASE
            WHEN ? IS NOT NULL AND t.category_id = ? THEN ABS(rank) * 0.5
            ELSE ABS(rank)
          END AS score
        FROM tweets_fts f
        JOIN tweets t ON f.rowid = t.rowid
        WHERE tweets_fts MATCH ?
          AND t.id != ?
        ORDER BY score ASC
        LIMIT 5`,
      )
      .all(target.category_id, target.category_id, ftsQuery, id) as Record<string, unknown>[]

    return NextResponse.json({ data: rows.map(rowToTweet) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch similar bookmarks' },
      { status: 500 },
    )
  }
}
