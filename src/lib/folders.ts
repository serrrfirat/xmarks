import { getDb } from './db';
import type { Folder, Tweet } from './types';

/**
 * Create a new folder
 */
export function createFolder(name: string, color?: string): Folder {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO folders (name, color) VALUES (?, ?) RETURNING id, name, color, created_at`
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
 * Get all folders
 */
export function getFolders(): Folder[] {
  const db = getDb();
  const stmt = db.prepare(`SELECT id, name, color, created_at FROM folders ORDER BY created_at DESC`);
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

/**
 * Update a folder
 */
export function updateFolder(
  id: number,
  updates: { name?: string; color?: string }
): Folder {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }

  if (fields.length === 0) {
    // No updates, return current folder
    const stmt = db.prepare(`SELECT id, name, color, created_at FROM folders WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) throw new Error(`Folder ${id} not found`);
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
    };
  }

  values.push(id);
  const stmt = db.prepare(
    `UPDATE folders SET ${fields.join(', ')} WHERE id = ? RETURNING id, name, color, created_at`
  );
  const row = stmt.get(...values) as any;
  if (!row) throw new Error(`Folder ${id} not found`);
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

/**
 * Delete a folder and all associated tweet_folders entries
 */
export function deleteFolder(id: number): void {
  const db = getDb();
  // Delete from junction table first
  const deleteJunction = db.prepare(`DELETE FROM tweet_folders WHERE folder_id = ?`);
  deleteJunction.run(id);
  // Delete the folder
  const deleteFolder = db.prepare(`DELETE FROM folders WHERE id = ?`);
  deleteFolder.run(id);
}

/**
 * Add a tweet to a folder
 */
export function addTweetToFolder(tweetId: string, folderId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO tweet_folders (tweet_id, folder_id) VALUES (?, ?)`
  );
  stmt.run(tweetId, folderId);
}

/**
 * Remove a tweet from a folder
 */
export function removeTweetFromFolder(tweetId: string, folderId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    `DELETE FROM tweet_folders WHERE tweet_id = ? AND folder_id = ?`
  );
  stmt.run(tweetId, folderId);
}

/**
 * Get all tweets in a folder with pagination
 */
export function getTweetsInFolder(
  folderId: number,
  limit: number = 50,
  offset: number = 0
): Tweet[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.* FROM tweets t
    INNER JOIN tweet_folders tf ON t.id = tf.tweet_id
    WHERE tf.folder_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(folderId, limit, offset) as any[];
  return rows.map(rowToTweet);
}

/**
 * Get the count of tweets in a folder
 */
export function getFolderTweetCount(folderId: number): number {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT COUNT(*) as count FROM tweet_folders WHERE folder_id = ?`
  );
  const row = stmt.get(folderId) as any;
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
