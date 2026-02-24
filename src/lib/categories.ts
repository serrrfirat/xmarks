import { getDb } from './db';
import type { SemanticCategory, SemanticCategoryWithCount, ClassificationState } from './types';

/**
 * Create a new semantic category
 */
export function createCategory(
  name: string,
  description?: string,
  emoji?: string
): SemanticCategory {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO semantic_categories (name, description, emoji) VALUES (?, ?, ?) RETURNING id, name, description, emoji, created_at`
  );
  const row = stmt.get(name, description ?? null, emoji ?? null) as any;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

/**
 * Get all semantic categories
 */
export function getCategories(): SemanticCategory[] {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT id, name, description, emoji, created_at FROM semantic_categories ORDER BY name ASC`
  );
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    createdAt: row.created_at,
  }));
}

/**
 * Get a semantic category by ID
 */
export function getCategoryById(id: number): SemanticCategory | null {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT id, name, description, emoji, created_at FROM semantic_categories WHERE id = ?`
  );
  const row = stmt.get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    createdAt: row.created_at,
  };
}

/**
 * Delete all semantic categories and clear all tweet assignments
 */
export function deleteAllCategories(): void {
  clearAllAssignments();
  const db = getDb();
  const stmt = db.prepare(`DELETE FROM semantic_categories`);
  stmt.run();
}

/**
 * Get the count of tweets assigned to a category
 */
export function getCategoryTweetCount(categoryId: number): number {
  const db = getDb();
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM tweets WHERE category_id = ?`);
  const row = stmt.get(categoryId) as any;
  return row.count;
}

/**
 * Get all semantic categories with tweet counts
 */
export function getCategoriesWithCounts(): SemanticCategoryWithCount[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT c.id, c.name, c.description, c.emoji, c.created_at, COUNT(t.id) as tweet_count
    FROM semantic_categories c
    LEFT JOIN tweets t ON t.category_id = c.id
    GROUP BY c.id
    ORDER BY tweet_count DESC, c.name ASC
  `);
  const rows = stmt.all() as any[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    createdAt: row.created_at,
    tweetCount: row.tweet_count,
  }));
}

/**
 * Assign a category to a tweet
 */
export function assignCategory(tweetId: string, categoryId: number): void {
  const db = getDb();
  const stmt = db.prepare(
    `UPDATE tweets SET category_id = ?, classified_at = datetime('now') WHERE id = ?`
  );
  stmt.run(categoryId, tweetId);
}

/**
 * Clear all tweet category assignments
 */
export function clearAllAssignments(): void {
  const db = getDb();
  const stmt = db.prepare(`UPDATE tweets SET category_id = NULL, classified_at = NULL`);
  stmt.run();
}

/**
 * Get the count of unclassified tweets
 */
export function getUnclassifiedCount(): number {
  const db = getDb();
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM tweets WHERE category_id IS NULL`);
  const row = stmt.get() as any;
  return row.count;
}

/**
 * Get the total count of tweets
 */
export function getTotalTweetCount(): number {
  const db = getDb();
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM tweets`);
  const row = stmt.get() as any;
  return row.count;
}

/**
 * Get the current classification state
 */
export function getClassificationState(): ClassificationState {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM classification_state WHERE id = 1`);
  const row = stmt.get() as any;

  // Return default idle state if no row exists
  if (!row) {
    return {
      status: 'idle',
      phase: null,
      progressCurrent: 0,
      progressTotal: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    };
  }

  return {
    status: row.status,
    phase: row.phase,
    progressCurrent: row.progress_current,
    progressTotal: row.progress_total,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

/**
 * Update the classification state
 */
export function updateClassificationState(updates: Partial<ClassificationState>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  // Map camelCase keys to snake_case columns
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.phase !== undefined) {
    fields.push('phase = ?');
    values.push(updates.phase);
  }
  if (updates.progressCurrent !== undefined) {
    fields.push('progress_current = ?');
    values.push(updates.progressCurrent);
  }
  if (updates.progressTotal !== undefined) {
    fields.push('progress_total = ?');
    values.push(updates.progressTotal);
  }
  if (updates.errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(updates.errorMessage);
  }
  if (updates.startedAt !== undefined) {
    fields.push('started_at = ?');
    values.push(updates.startedAt);
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completedAt);
  }

  if (fields.length === 0) {
    return;
  }
  const stmt = db.prepare(`UPDATE classification_state SET ${fields.join(', ')} WHERE id = 1`);
  stmt.run(...values);

}