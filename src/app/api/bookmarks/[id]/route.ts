import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()
    const row = db.prepare(`
      SELECT
        id, text, author_handle, author_name, author_avatar_url,
        author_id, conversation_id, created_at, bookmarked_at,
        like_count, reply_count, retweet_count, in_reply_to_id,
        is_thread, media_urls, quoted_tweet_id, url
      FROM tweets WHERE id = ?
    `).get(id) as Record<string, unknown> | undefined

    if (!row) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
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
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get bookmark' },
      { status: 500 }
    )
  }
}
