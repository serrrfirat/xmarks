import { getDb } from './db';
import type { Tag, Tweet } from './types';

/**
 * Create a new tag
 */
export function createTag(name: string, color?: string): Tag {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO tags (name, color) VALUES (?, ?) RETURNING id, name, color, created_at`
  );
  const row = stmt.get(name, color ?? null) as any;
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

/**
 * Get all tags
 */
export function getTags(): Tag[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT id, name, color, created_at FROM tags ORDER BY created_at DESC`);
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

/**
 * Delete a tag and all associated tweet_tags entries
 */
export function deleteTag(id: number): void {
  const db = getDb();
  const deleteJunction = db.prepare(`DELETE FROM tweet_tags WHERE tag_id = ?`);
  deleteJunction.run(id);
  const deleteTag = db.prepare(`DELETE FROM tags WHERE id = ?`);
  deleteTag.run(id);
}

/**
 * Add a tag to a tweet
 */
export function addTagToTweet(tweetId: string, tagId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO tweet_tags (tweet_id, tag_id) VALUES (?, ?)`
  );
  stmt.run(tweetId, tagId);
}

/**
 * Remove a tag from a tweet
 */
export function removeTagFromTweet(tweetId: string, tagId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    `DELETE FROM tweet_tags WHERE tweet_id = ? AND tag_id = ?`
  );
  stmt.run(tweetId, tagId);
}

/**
 * Get all tweets with a specific tag with pagination
 */
export function getTweetsByTag(
  tagId: number,
  limit: number = 50,
  offset: number = 0
): Tweet[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.* FROM tweets t
    INNER JOIN tweet_tags tt ON t.id = tt.tweet_id
    WHERE tt.tag_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(tagId, limit, offset) as any[];
  return rows.map(rowToTweet);
}

/**
 * Get all tags for a specific tweet
 */
export function getTagsForTweet(tweetId: string): Tag[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.id, t.name, t.color, t.created_at FROM tags t
    INNER JOIN tweet_tags tt ON t.id = tt.tag_id
    WHERE tt.tweet_id = ?
    ORDER BY t.created_at DESC
  `);
  const rows = stmt.all(tweetId) as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

/**
 * Get the count of tweets with a specific tag
 */
export function getTagTweetCount(tagId: number): number {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT COUNT(*) as count FROM tweet_tags WHERE tag_id = ?`
  );
  const row = stmt.get(tagId) as any;
  return row.count;
}

/**
 * Convert database row to Tweet object
 */
function rowToTweet(row: any): Tweet {
  return {
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
  };
}
