import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type {
  StatsOverview,
  TopAuthor,
  TopicDistribution,
  InterestPoint,
  EngagementPoint,
  ForgottenBookmark,
} from '@/lib/types'

const DAY_NAMES: Record<string, string> = {
  '0': 'Sunday',
  '1': 'Monday',
  '2': 'Tuesday',
  '3': 'Wednesday',
  '4': 'Thursday',
  '5': 'Friday',
  '6': 'Saturday',
}

export async function GET() {
  try {
    const db = getDb()

    // ── Section 1: Overview ──────────────────────────────────────────
    const basicStats = db
      .prepare(
        `SELECT
           COUNT(*) as totalBookmarks,
           COUNT(DISTINCT author_handle) as totalAuthors,
           MIN(bookmarked_at) as oldestBookmark,
           MAX(bookmarked_at) as newestBookmark
         FROM tweets`
      )
      .get() as {
      totalBookmarks: number
      totalAuthors: number
      oldestBookmark: string | null
      newestBookmark: string | null
    }

    const topicCount = db
      .prepare('SELECT COUNT(*) as totalTopics FROM semantic_categories')
      .get() as { totalTopics: number }

    // Zero-state: empty DB
    if (!basicStats.oldestBookmark) {
      const emptyOverview: StatsOverview = {
        totalBookmarks: 0,
        totalAuthors: 0,
        totalTopics: 0,
        oldestBookmark: '',
        newestBookmark: '',
        mostActiveDay: '',
        avgBookmarksPerDay: 0,
      }
      return NextResponse.json({
        overview: emptyOverview,
        topAuthors: [],
        topicDistribution: [],
        interestEvolution: [],
        engagementScatter: [],
        forgottenBookmarks: [],
      })
    }

    const activeDayRow = db
      .prepare(
        `SELECT strftime('%w', bookmarked_at) as dow, COUNT(*) as cnt
         FROM tweets
         GROUP BY dow
         ORDER BY cnt DESC
         LIMIT 1`
      )
      .get() as { dow: string; cnt: number } | null

    const daySpanRow = db
      .prepare(
        `SELECT julianday(MAX(bookmarked_at)) - julianday(MIN(bookmarked_at)) + 1 as daySpan
         FROM tweets`
      )
      .get() as { daySpan: number | null }

    const daySpan = Math.max(1, daySpanRow?.daySpan ?? 1)
    const avgBookmarksPerDay = Math.round((basicStats.totalBookmarks / daySpan) * 100) / 100

    const overview: StatsOverview = {
      totalBookmarks: basicStats.totalBookmarks,
      totalAuthors: basicStats.totalAuthors,
      totalTopics: topicCount.totalTopics,
      oldestBookmark: basicStats.oldestBookmark,
      newestBookmark: basicStats.newestBookmark!,
      mostActiveDay: activeDayRow ? (DAY_NAMES[activeDayRow.dow] ?? '') : '',
      avgBookmarksPerDay,
    }

    // ── Section 2: Top Authors (top 15) ──────────────────────────────
    const topAuthors = db
      .prepare(
        `SELECT
           t.author_handle as handle,
           t.author_name as name,
           COUNT(*) as count,
           (SELECT sc.name FROM semantic_categories sc
            WHERE sc.id = (
              SELECT category_id FROM tweets t2
              WHERE t2.author_handle = t.author_handle AND t2.category_id IS NOT NULL
              GROUP BY category_id ORDER BY COUNT(*) DESC LIMIT 1
            )) as primaryTopic
         FROM tweets t
         GROUP BY t.author_handle
         ORDER BY count DESC
         LIMIT 15`
      )
      .all() as TopAuthor[]

    // ── Section 3: Topic Distribution ────────────────────────────────
    const topicRows = db
      .prepare(
        `SELECT sc.name, sc.emoji, COUNT(*) as count
         FROM tweets t
         JOIN semantic_categories sc ON t.category_id = sc.id
         GROUP BY sc.id
         ORDER BY count DESC`
      )
      .all() as { name: string; emoji: string | null; count: number }[]

    const totalWithTopic = topicRows.reduce((sum, r) => sum + r.count, 0)
    const topicDistribution: TopicDistribution[] = totalWithTopic > 0
      ? topicRows.map((r) => ({
          name: r.name,
          emoji: r.emoji,
          count: r.count,
          percentage: Math.round((r.count / totalWithTopic) * 10000) / 100,
        }))
      : []

    // ── Section 4: Interest Evolution (adaptive grouping, padded range) ──
    const rangeRow = db
      .prepare(
        `SELECT MIN(bookmarked_at) as earliest, MAX(bookmarked_at) as latest
         FROM tweets`
      )
      .get() as { earliest: string | null; latest: string | null }

    const earliest = rangeRow?.earliest ? new Date(rangeRow.earliest) : new Date()
    const latest = rangeRow?.latest ? new Date(rangeRow.latest) : new Date()
    const spanMs = latest.getTime() - earliest.getTime()
    const spanDays = Math.max(1, Math.round(spanMs / 86_400_000))
    const useDaily = spanDays < 60
    const timeFmt = useDaily ? '%Y-%m-%d' : '%Y-%m'

    const evolutionRows = db
      .prepare(
        `SELECT strftime('${timeFmt}', bookmarked_at) as period, sc.name as category, COUNT(*) as count
         FROM tweets t
         JOIN semantic_categories sc ON t.category_id = sc.id
         WHERE bookmarked_at >= datetime('now', '-12 months')
         GROUP BY period, sc.id
         ORDER BY period ASC`
      )
      .all() as { period: string; category: string; count: number }[]

    const allCategories = new Set<string>()
    const evolutionMap = new Map<string, Array<{ name: string; count: number }>>()
    for (const row of evolutionRows) {
      allCategories.add(row.category)
      if (!evolutionMap.has(row.period)) {
        evolutionMap.set(row.period, [])
      }
      evolutionMap.get(row.period)!.push({ name: row.category, count: row.count })
    }

    // Pad date range: ensure at least 30 days (daily) or 6 months (monthly)
    const allPeriods: string[] = []
    if (useDaily) {
      const padStart = new Date(earliest)
      padStart.setDate(padStart.getDate() - 3)
      const padEnd = new Date(Math.max(latest.getTime(), padStart.getTime() + 30 * 86_400_000))
      for (let d = new Date(padStart); d <= padEnd; d.setDate(d.getDate() + 1)) {
        allPeriods.push(d.toISOString().slice(0, 10))
      }
    } else {
      const padStart = new Date(earliest)
      padStart.setMonth(padStart.getMonth() - 1)
      const padEnd = new Date(latest)
      padEnd.setMonth(padEnd.getMonth() + 1)
      for (let d = new Date(padStart); d <= padEnd; d.setMonth(d.getMonth() + 1)) {
        allPeriods.push(d.toISOString().slice(0, 7))
      }
    }

    const interestEvolution: InterestPoint[] = allPeriods.map((period) => ({
      month: period,
      categories: evolutionMap.get(period) ?? [],
    }))

    // ── Section 5: Engagement Scatter (cap 500) ──────────────────────
    const engagementScatter = db
      .prepare(
        `SELECT t.id, t.like_count as likes, t.retweet_count as retweets,
                t.reply_count as replies, t.author_handle as authorHandle,
                sc.name as topic
         FROM tweets t
         LEFT JOIN semantic_categories sc ON t.category_id = sc.id
         ORDER BY t.bookmarked_at DESC
         LIMIT 500`
      )
      .all() as EngagementPoint[]

    // ── Section 6: Forgotten Bookmarks (30+ days, no folder, top 20) ─
    const forgottenBookmarks = db
      .prepare(
        `SELECT t.id, t.text, t.author_handle as authorHandle, t.created_at as createdAt,
                t.bookmarked_at as bookmarkedAt, t.like_count as likeCount,
                CAST(julianday('now') - julianday(t.bookmarked_at) AS INTEGER) as daysSinceBookmarked
         FROM tweets t
         WHERE t.bookmarked_at < datetime('now', '-30 days')
           AND t.id NOT IN (SELECT tweet_id FROM tweet_folders)
         ORDER BY t.bookmarked_at ASC
         LIMIT 20`
      )
      .all() as ForgottenBookmark[]

    return NextResponse.json({
      overview,
      topAuthors,
      topicDistribution,
      interestEvolution,
      engagementScatter,
      forgottenBookmarks,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stats' },
      { status: 500 }
    )
  }
}
