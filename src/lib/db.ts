import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = join(homedir(), '.xmarks');
const DB_PATH = join(DATA_DIR, 'db.sqlite');

let _db: Database | null = null;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDb(): Database {
  if (_db) return _db;
  ensureDir();
  _db = new Database(DB_PATH);
  _db.exec('PRAGMA journal_mode=WAL');
  _db.exec('PRAGMA busy_timeout=5000');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tweets (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL DEFAULT '',
      author_id TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      author_handle TEXT NOT NULL DEFAULT '',
      author_avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT '',
      bookmarked_at TEXT,
      fetched_at TEXT NOT NULL DEFAULT '',
      reply_count INTEGER DEFAULT 0,
      retweet_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      in_reply_to_id TEXT,
      conversation_id TEXT,
      is_thread INTEGER DEFAULT 0,
      media_urls TEXT DEFAULT '[]',
      quoted_tweet_id TEXT,
      url TEXT NOT NULL DEFAULT '',
      raw_json TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS tweets_fts
      USING fts5(
        text, author_name, author_handle,
        content=tweets, content_rowid=rowid,
        tokenize='unicode61'
      );

    CREATE TRIGGER IF NOT EXISTS tweets_fts_insert
      AFTER INSERT ON tweets BEGIN
        INSERT INTO tweets_fts(rowid, text, author_name, author_handle)
        VALUES (new.rowid, new.text, new.author_name, new.author_handle);
      END;

    CREATE TRIGGER IF NOT EXISTS tweets_fts_delete
      AFTER DELETE ON tweets BEGIN
        INSERT INTO tweets_fts(tweets_fts, rowid, text, author_name, author_handle)
        VALUES ('delete', old.rowid, old.text, old.author_name, old.author_handle);
      END;

    CREATE TRIGGER IF NOT EXISTS tweets_fts_update
      AFTER UPDATE ON tweets BEGIN
        INSERT INTO tweets_fts(tweets_fts, rowid, text, author_name, author_handle)
        VALUES ('delete', old.rowid, old.text, old.author_name, old.author_handle);
        INSERT INTO tweets_fts(rowid, text, author_name, author_handle)
        VALUES (new.rowid, new.text, new.author_name, new.author_handle);
      END;

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tweet_folders (
      tweet_id TEXT NOT NULL,
      folder_id INTEGER NOT NULL,
      PRIMARY KEY (tweet_id, folder_id)
    );

    CREATE TABLE IF NOT EXISTS tweet_tags (
      tweet_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (tweet_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_sync_at TEXT,
      last_cursor TEXT,
      total_synced INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      error_message TEXT
    );

    INSERT OR IGNORE INTO sync_state (id, status) VALUES (1, 'idle');

    CREATE TABLE IF NOT EXISTS semantic_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      emoji TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classification_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      status TEXT DEFAULT 'idle',
      phase TEXT,
      progress_current INTEGER DEFAULT 0,
      progress_total INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT,
      completed_at TEXT
    );

    INSERT OR IGNORE INTO classification_state (id, status) VALUES (1, 'idle');
  `);

  // Idempotent migration: add category columns to tweets
  const tweetCols = db.query('PRAGMA table_info(tweets)').all() as { name: string }[];
  if (!tweetCols.some((c) => c.name === 'category_id')) {
    db.run('ALTER TABLE tweets ADD COLUMN category_id INTEGER');
    db.run('ALTER TABLE tweets ADD COLUMN classified_at TEXT');
  }
}
