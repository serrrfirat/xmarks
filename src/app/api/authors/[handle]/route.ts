import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { AuthorProfile, AuthorStats, Tweet } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params
    const db = getDb()

    // Check author exists
    const countRow = db.prepare(
      'SELECT COUNT(*) as count FROM tweets WHERE author_handle = ?'
    ).get(handle) as { count: number }

    if (countRow.count === 0) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 })
    }

    // Get stats
    const statsRow = db.prepare(`
      SELECT author_handle, author_name,
             COUNT(*) as bookmarkCount,
             MIN(bookmarked_at) as firstBookmarkedAt,
             MAX(bookmarked_at) as lastBookmarkedAt,
             AVG(like_count) as avgLikes,
             AVG(retweet_count) as avgRetweets,
             AVG(reply_count) as avgReplies
      FROM tweets
      WHERE author_handle = ?
    `).get(handle) as any

    // Top topics
    const topTopics = db.prepare(`
      SELECT sc.name, sc.emoji, COUNT(*) as count
      FROM tweets t JOIN semantic_categories sc ON t.category_id = sc.id
      WHERE t.author_handle = ?
      GROUP BY sc.id ORDER BY count DESC LIMIT 5
    `).all(handle) as Array<{ name: string; emoji: string | null; count: number }>

    const stats: AuthorStats = {
      handle: statsRow.author_handle,
      name: statsRow.author_name,
      bookmarkCount: statsRow.bookmarkCount,
      firstBookmarkedAt: statsRow.firstBookmarkedAt ?? '',
      lastBookmarkedAt: statsRow.lastBookmarkedAt ?? '',
      topTopics,
      engagementAvg: {
        likes: Math.round(statsRow.avgLikes ?? 0),
        retweets: Math.round(statsRow.avgRetweets ?? 0),
        replies: Math.round(statsRow.avgReplies ?? 0),
      },
    }

    // Get tweets (limit 50, sorted by created_at DESC)
    const rows = db.prepare(`
      SELECT id, text, author_handle, author_name, author_avatar_url, author_id,
             conversation_id, created_at, bookmarked_at, like_count, reply_count,
             retweet_count, in_reply_to_id, is_thread, media_urls, quoted_tweet_id,
             url, category_id, classified_at
      FROM tweets
      WHERE author_handle = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(handle) as any[]

    const tweets: Tweet[] = rows.map((row) => ({
      id: row.id,
      text: row.text,
      authorHandle: row.author_handle,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url,
      authorId: row.author_id,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      bookmarkedAt: row.bookmarked_at,
      likeCount: row.like_count,
      replyCount: row.reply_count,
      retweetCount: row.retweet_count,
      inReplyToId: row.in_reply_to_id,
      isThread: row.is_thread === 1,
      mediaJson: row.media_urls,
      quotedTweetJson: row.quoted_tweet_id,
      url: row.url,
      categoryId: row.category_id,
      classifiedAt: row.classified_at,
    }))

    const profile: AuthorProfile = { stats, tweets }
    return NextResponse.json(profile)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get author profile' },
      { status: 500 }
    )
  }
}
