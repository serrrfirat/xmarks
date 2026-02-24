import { getDb } from './db'
import { fetchBookmarks } from './bird'
import type { BirdTweet } from './types'

export function parseBirdDate(twitterDate: string): string {
  const parsed = new Date(twitterDate)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid Twitter date: ${twitterDate}`)
  }
  return parsed.toISOString()
}

function collectTweetsWithQuotes(tweets: BirdTweet[]): BirdTweet[] {
  const queue: BirdTweet[] = [...tweets]
  const collected: BirdTweet[] = []
  const seen = new Set<string>()

  while (queue.length > 0) {
    const tweet = queue.shift()
    if (!tweet || seen.has(tweet.id)) continue
    seen.add(tweet.id)
    collected.push(tweet)
    if (tweet.quotedTweet) queue.push(tweet.quotedTweet)
  }

  return collected
}

export async function syncBookmarks(): Promise<{ synced: number; lastSyncAt: string }> {
  const db = getDb()

  db.prepare(`UPDATE sync_state SET status = 'syncing', error_message = NULL WHERE id = 1`).run()

  // Step 1: INSERT OR IGNORE — only inserts if the id doesn't exist yet.
  // This preserves the original bookmarked_at on subsequent syncs.
  const insertNew = db.prepare(`
    INSERT OR IGNORE INTO tweets
      (id, text, author_id, author_name, author_handle, author_avatar_url,
       created_at, bookmarked_at, fetched_at,
       reply_count, retweet_count, like_count,
       in_reply_to_id, conversation_id, is_thread,
       media_urls, quoted_tweet_id, url, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Step 2: UPDATE — refreshes mutable fields without touching bookmarked_at
  const updateExisting = db.prepare(`
    UPDATE tweets SET
      text = ?, author_id = ?, author_name = ?, author_handle = ?,
      fetched_at = ?,
      reply_count = ?, retweet_count = ?, like_count = ?,
      in_reply_to_id = ?, conversation_id = ?, is_thread = ?,
      media_urls = ?, quoted_tweet_id = ?, url = ?, raw_json = ?
    WHERE id = ?
  `)

  const updateSuccess = db.prepare(`
    UPDATE sync_state
    SET last_sync_at = ?, last_cursor = ?, total_synced = ?, status = 'idle', error_message = NULL
    WHERE id = 1
  `)

  const updateError = db.prepare(`
    UPDATE sync_state SET status = 'error', error_message = ? WHERE id = 1
  `)

  try {
    const response = await fetchBookmarks()
    const bookmarkedAt = new Date().toISOString()
    const tweetsToUpsert = collectTweetsWithQuotes(response.tweets)

    db.transaction(() => {
      for (const bird of tweetsToUpsert) {
        const handle = bird.author?.username ?? ''
        const createdAt = parseBirdDate(bird.createdAt)
        const fetched = new Date().toISOString()
        const mediaUrls = JSON.stringify(bird.media ?? [])
        const quotedId = bird.quotedTweet?.id ?? null
        const url = `https://x.com/${handle}/status/${bird.id}`
        const rawJson = JSON.stringify(bird)
        const inReplyTo = bird.inReplyToStatusId ?? null
        const isThread = inReplyTo ? 1 : 0

        insertNew.run(
          bird.id,
          bird.text ?? '',
          bird.authorId ?? '',
          bird.author?.name ?? '',
          handle,
          null,                // author_avatar_url — bird doesn't provide
          createdAt,
          bookmarkedAt,
          fetched,
          bird.replyCount ?? 0,
          bird.retweetCount ?? 0,
          bird.likeCount ?? 0,
          inReplyTo,
          bird.conversationId ?? null,
          isThread,
          mediaUrls,
          quotedId,
          url,
          rawJson,
        )

        updateExisting.run(
          bird.text ?? '',
          bird.authorId ?? '',
          bird.author?.name ?? '',
          handle,
          fetched,
          bird.replyCount ?? 0,
          bird.retweetCount ?? 0,
          bird.likeCount ?? 0,
          inReplyTo,
          bird.conversationId ?? null,
          isThread,
          mediaUrls,
          quotedId,
          url,
          rawJson,
          bird.id,            // WHERE id = ?
        )
      }
    })()

    const lastSyncAt = new Date().toISOString()
    updateSuccess.run(lastSyncAt, response.nextCursor ?? null, response.tweets.length)

    return { synced: response.tweets.length, lastSyncAt }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateError.run(message)
    throw error
  }
}
