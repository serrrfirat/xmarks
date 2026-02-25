/**
 * XMarks Type Definitions
 * Complete TypeScript types for the bookmark manager
 */

/**
 * Media object from bird CLI output
 * Represents images, videos, or animated GIFs attached to tweets
 */
export interface BirdMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  width?: number;
  height?: number;
  previewUrl?: string;
  videoUrl?: string;
}

/**
 * Author object nested within BirdTweet
 * Contains basic author information from bird CLI
 */
export interface BirdAuthor {
  username: string;
  name: string;
}

/**
 * Raw tweet object from bird CLI output
 * Matches the exact schema returned by `bird bookmarks --all --json`
 */
export interface BirdTweet {
  id: string; // Snowflake ID as string (exceeds MAX_SAFE_INTEGER)
  text: string;
  authorId: string; // Snowflake ID as string
  author: BirdAuthor; // Nested object with username and name
  conversationId: string;
  createdAt: string; // Twitter format: "Sun Feb 22 18:55:16 +0000 2026"
  likeCount: number;
  replyCount: number;
  retweetCount: number;
  inReplyToStatusId?: string; // Optional: present if tweet is a reply
  media?: BirdMedia[]; // Optional: array of media objects
  quotedTweet?: BirdTweet; // Optional: partial nested tweet if this is a quote
}

/**
 * Response wrapper from bird CLI
 * The top-level structure returned by `bird bookmarks --all --json`
 */
export interface BirdResponse {
  tweets: BirdTweet[];
  nextCursor?: string; // Optional pagination cursor
}

/**
 * Normalized tweet stored in SQLite database
 * Derived from BirdTweet with flattened author fields and computed properties
 */
export interface Tweet {
  id: string; // Snowflake ID as string
  text: string;
  authorHandle: string; // From author.username
  authorName: string; // From author.name
  authorAvatarUrl: string | null; // Always null (bird doesn't provide)
  authorId: string; // Snowflake ID as string
  conversationId: string;
  createdAt: string; // ISO 8601 format (converted from Twitter format)
  bookmarkedAt: string; // ISO 8601 when synced
  likeCount: number;
  replyCount: number;
  retweetCount: number;
  inReplyToId?: string; // Optional: tweet ID if this is a reply
  isThread: boolean; // Derived: true if inReplyToId is not null
  mediaJson: string | null; // JSON array of media objects
  quotedTweetJson: string | null; // JSON of quoted tweet
  url: string; // Constructed: https://x.com/{authorHandle}/status/{id}
  categoryId: number | null;      // FK to semantic_categories.id
  classifiedAt: string | null;    // ISO 8601 when classified
}

/**
 * Folder for organizing bookmarks
 * User-created collections with optional color coding
 */
export interface Folder {
  id: number;
  name: string;
  color?: string; // Optional hex color or color name
  createdAt: string; // ISO 8601
}

/**
 * Tag for categorizing bookmarks
 * Lightweight labels with optional color coding
 */
export interface Tag {
  id: number;
  name: string;
  color?: string; // Optional hex color or color name
  createdAt: string; // ISO 8601
}

/**
 * Current synchronization state
 * Tracks sync status, last sync time, and error information
 */
export interface SyncState {
  lastSyncAt: string | null; // ISO 8601 or null if never synced
  totalCount: number; // Total bookmarks synced
  status: 'idle' | 'syncing' | 'error'; // Current sync status
  error?: string; // Error message if status is 'error'
}

/**
 * Search result from FTS5 full-text search
 * Extends Tweet with optional search snippet
 */
export interface SearchResult extends Tweet {
  snippet?: string; // FTS5 snippet showing context around match
}

/**
 * Generic paginated response wrapper
 * Used for API endpoints that return paginated results
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number; // Total count of all items
  page: number; // Current page (1-indexed)
  pageSize: number; // Items per page
}

/**
 * API error response
 * Standard error format for API endpoints
 */
export interface ApiError {
  error: string; // Human-readable error message
  code?: string; // Optional error code for programmatic handling
}


/**
 * LLM-discovered semantic category for bookmarks
 */
export interface SemanticCategory {
  id: number;
  name: string;
  description: string | null;
  emoji: string | null;
  createdAt: string; // ISO 8601
}

/**
 * Classification job state tracked in classification_state table
 */
export interface ClassificationState {
  status: 'idle' | 'discovering' | 'classifying' | 'error';
  phase: string | null;
  progressCurrent: number;
  progressTotal: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * SemanticCategory with tweet count for sidebar display
 */
export interface SemanticCategoryWithCount extends SemanticCategory {
  tweetCount: number;
}

/**
 * Node in the bookmark graph visualization
 */
export interface GraphNode {
  id: string;
  type: 'author' | 'topic';
  label: string;
  size: number;
  color: string;
  primaryTopic?: string;
  firstBookmarkedAt?: string; // ISO 8601 - earliest bookmark timestamp for this node
  x?: number;
  y?: number;
}

/**
 * Edge connecting two nodes in the bookmark graph
 */
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: 'author-topic' | 'author-author';
}

/**
 * Complete graph data for visualization
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Per-author statistics for the author profile sheet
 */
export interface AuthorStats {
  handle: string;
  name: string;
  bookmarkCount: number;
  firstBookmarkedAt: string;
  lastBookmarkedAt: string;
  topTopics: Array<{ name: string; emoji: string | null; count: number }>;
  engagementAvg: { likes: number; retweets: number; replies: number };
}

/**
 * Complete author profile: stats + recent bookmarked tweets
 */
export interface AuthorProfile {
  stats: AuthorStats;
  tweets: Tweet[];
}

/**
 * High-level overview stats for the /stats dashboard
 */
export interface StatsOverview {
  totalBookmarks: number;
  totalAuthors: number;
  totalTopics: number;
  oldestBookmark: string;
  newestBookmark: string;
  mostActiveDay: string;
  avgBookmarksPerDay: number;
}

/**
 * Author entry in the top-authors chart
 */
export interface TopAuthor {
  handle: string;
  name: string;
  count: number;
  primaryTopic: string | null;
}

/**
 * Topic distribution entry for donut/pie chart
 */
export interface TopicDistribution {
  name: string;
  emoji: string | null;
  count: number;
  percentage: number;
}

/**
 * Monthly interest data point for evolution chart
 */
export interface InterestPoint {
  month: string;
  categories: Array<{ name: string; count: number }>;
}

/**
 * Single data point in the engagement scatter plot
 */
export interface EngagementPoint {
  id: string;
  likes: number;
  retweets: number;
  replies: number;
  topic: string | null;
  authorHandle: string;
}

/**
 * A bookmark not filed into any folder for more than 30 days
 */
export interface ForgottenBookmark {
  id: string;
  text: string;
  authorHandle: string;
  createdAt: string;
  bookmarkedAt: string;
  likeCount: number;
  daysSinceBookmarked: number;
}

/**
 * Weekly digest summary for the timeline dashboard card
 */
export interface WeeklyDigest {
  weekStart: string;
  weekEnd: string;
  totalBookmarks: number;
  previousWeekTotal: number;
  topTopics: Array<{ name: string; count: number }>;
  topAuthors: Array<{ handle: string; count: number }>;
  risingAuthors: Array<{ handle: string; count: number; previousCount: number }>;
}

/**
 * Results from the ⌘K spotlight search
 */
export interface SpotlightResult {
  tweets: Array<{ id: string; text: string; authorHandle: string; authorName: string; url: string }>;
  authors: Array<{ handle: string; name: string; bookmarkCount: number }>;
}
