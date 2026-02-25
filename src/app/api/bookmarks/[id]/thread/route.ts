import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { fetchThread } from '@/lib/bird'
import type { Tweet, BirdTweet } from '@/lib/types'

/**
 * GET /api/bookmarks/[id]/thread
 *
 * Hybrid thread reader:
 * 1. Query local DB for all bookmarked tweets sharing the same conversation_id
 * 2. If only 1 tweet found (incomplete thread), try bird CLI for the full thread
 * 3. Returns Tweet[] with a `source` field indicating where data came from
 */

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

function birdTweetToTweet(bird: BirdTweet): Tweet {
  return {
    id: bird.id,
    text: bird.text,
    authorHandle: bird.author.username,
    authorName: bird.author.name,
    authorAvatarUrl: null,
    authorId: bird.authorId,
    conversationId: bird.conversationId,
    createdAt: bird.createdAt,
    bookmarkedAt: '',
    likeCount: bird.likeCount,
    replyCount: bird.replyCount,
    retweetCount: bird.retweetCount,
    inReplyToId: bird.inReplyToStatusId,
    isThread: Boolean(bird.inReplyToStatusId),
    mediaJson: bird.media ? JSON.stringify(bird.media) : null,
    quotedTweetJson: bird.quotedTweet ? JSON.stringify(bird.quotedTweet) : null,
    url: `https://x.com/${bird.author.username}/status/${bird.id}`,
    categoryId: null,
    classifiedAt: null,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    // 1. Look up the tweet's conversation_id
    const origin = db
      .query('SELECT conversation_id FROM tweets WHERE id = ?')
      .get(id) as { conversation_id: string | null } | null

    if (!origin) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      )
    }

    // 2. Try local DB first — get all bookmarked tweets in this conversation
    let tweets: Tweet[] = []
    let source: 'local' | 'live' = 'local'

    if (origin.conversation_id) {
      const rows = db
        .query(
          `SELECT
            id, text, author_handle, author_name, author_avatar_url,
            author_id, conversation_id, created_at, bookmarked_at,
            like_count, reply_count, retweet_count, in_reply_to_id,
            is_thread, media_urls, quoted_tweet_id, url,
            category_id, classified_at
          FROM tweets
          WHERE conversation_id = ?
          ORDER BY created_at ASC`
        )
        .all(origin.conversation_id) as Record<string, unknown>[]

      tweets = rows.map(rowToTweet)
    }

    // 3. If only 1 tweet locally (incomplete thread), try bird CLI for full thread
    if (tweets.length <= 1) {
      try {
        const birdTweets = await fetchThread(id)
        if (birdTweets.length > 0) {
          tweets = birdTweets.map(birdTweetToTweet)
          source = 'live'
        }
      } catch {
        // Bird CLI failed (auth expired, not installed, etc.)
        // Fall through — return whatever we have locally
      }
    }

    return NextResponse.json({ data: tweets, source })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}
