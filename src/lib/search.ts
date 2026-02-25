import { getDb } from './db';
import { Tweet, SearchResult, PaginatedResponse } from './types';

function escapeFts5Query(query: string): string {
  const cleaned = query
    .replace(/[*"]/g, '')
    .replace(/\b(OR|AND|NOT|NEAR)\b/gi, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.map((w) => `"${w}"`).join(' ');
}

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

export function searchBookmarks(
  query: string,
  options?: { limit?: number; offset?: number }
): SearchResult[] {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  if (!query || !query.trim()) {
    return getBookmarks(options).items;
  }

  const db = getDb();
  const escapedQuery = escapeFts5Query(query);

  if (!escapedQuery) {
    return getBookmarks(options).items;
  }

  try {
    const stmt = db.prepare(`
      SELECT
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
        snippet(tweets_fts, 0, '<mark>', '</mark>', '...', 32) as snippet,
        rank
      FROM tweets_fts f
      JOIN tweets t ON f.rowid = t.rowid
      WHERE tweets_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(escapedQuery, limit, offset) as any[];
    return rows.map((row) => ({
      ...rowToTweet(row),
      snippet: row.snippet,
    }));
  } catch (error) {
    const likeQuery = `%${query.replace(/[%_]/g, '\\$&')}%`;
    const stmt = db.prepare(`
      SELECT
        id,
        text,
        author_handle,
        author_name,
        author_avatar_url,
        author_id,
        conversation_id,
        created_at,
        bookmarked_at,
        like_count,
        reply_count,
        retweet_count,
        in_reply_to_id,
        is_thread,
        media_urls,
        quoted_tweet_id,
        url
      FROM tweets
      WHERE text LIKE ? ESCAPE '\\'
         OR author_name LIKE ? ESCAPE '\\'
         OR author_handle LIKE ? ESCAPE '\\'
      ORDER BY bookmarked_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(likeQuery, likeQuery, likeQuery, limit, offset) as any[];
    return rows.map(rowToTweet);
  }
}

export function getBookmarks(
  options?: {
    limit?: number
    offset?: number
    folderId?: number
    tagId?: number
    categoryId?: number
    from?: string
    to?: string
  }
): PaginatedResponse<Tweet> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const folderId = options?.folderId;
  const tagId = options?.tagId;
  const categoryId = options?.categoryId;
  const from = options?.from;
  const to = options?.to;

  const db = getDb();

  let whereClause = '1=1';
  const params: any[] = [];

  if (folderId !== undefined) {
    whereClause += ' AND t.id IN (SELECT tweet_id FROM tweet_folders WHERE folder_id = ?)';
    params.push(folderId);
  }

  if (tagId !== undefined) {
    whereClause += ' AND t.id IN (SELECT tweet_id FROM tweet_tags WHERE tag_id = ?)';
    params.push(tagId);
  }

  if (categoryId !== undefined) {
    whereClause += ' AND t.category_id = ?';
    params.push(categoryId);
  }

  if (from) {
    whereClause += ' AND t.bookmarked_at >= ?';
    params.push(from);
  }

  if (to) {
    whereClause += ' AND t.bookmarked_at <= ?';
    params.push(to);
  }

  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tweets t WHERE ${whereClause}
  `);
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  const stmt = db.prepare(`
    SELECT
      id,
      text,
      author_handle,
      author_name,
      author_avatar_url,
      author_id,
      conversation_id,
      created_at,
      bookmarked_at,
      like_count,
      reply_count,
      retweet_count,
      in_reply_to_id,
      is_thread,
      media_urls,
      quoted_tweet_id,
      url,
      category_id,
      classified_at
    FROM tweets t
    WHERE ${whereClause}
    ORDER BY bookmarked_at DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(...params, limit, offset) as any[];
  const items = rows.map(rowToTweet);

  const page = Math.floor(offset / limit) + 1;

  return {
    items,
    total,
    page,
    pageSize: limit,
  };
}
