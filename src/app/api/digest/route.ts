import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import type { WeeklyDigest } from '@/lib/types'

function getWeekBounds() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  }
}

export async function GET() {
  try {
    const db = getDb()
    const { weekStart, weekEnd } = getWeekBounds()

    // Previous week bounds
    const prevStart = new Date(weekStart)
    prevStart.setDate(prevStart.getDate() - 7)
    const prevEnd = new Date(weekEnd)
    prevEnd.setDate(prevEnd.getDate() - 7)
    const prevWeekStart = prevStart.toISOString().slice(0, 10)
    const prevWeekEnd = prevEnd.toISOString().slice(0, 10)

    // This week count
    const { totalBookmarks } = db
      .prepare(
        `SELECT COUNT(*) as totalBookmarks FROM tweets
       WHERE bookmarked_at >= ? AND bookmarked_at <= ?`
      )
      .get(weekStart, weekEnd + 'T23:59:59') as { totalBookmarks: number }

    // Previous week count
    const { previousWeekTotal } = db
      .prepare(
        `SELECT COUNT(*) as previousWeekTotal FROM tweets
       WHERE bookmarked_at >= ? AND bookmarked_at <= ?`
      )
      .get(prevWeekStart, prevWeekEnd + 'T23:59:59') as {
      previousWeekTotal: number
    }

    // Top 5 topics this week
    const topTopics = db
      .prepare(
        `SELECT sc.name, COUNT(*) as count
      FROM tweets t JOIN semantic_categories sc ON t.category_id = sc.id
      WHERE t.bookmarked_at >= ? AND t.bookmarked_at <= ?
      GROUP BY sc.id ORDER BY count DESC LIMIT 5`
      )
      .all(weekStart, weekEnd + 'T23:59:59') as Array<{
      name: string
      count: number
    }>

    // Top 5 authors this week
    const topAuthors = db
      .prepare(
        `SELECT author_handle as handle, COUNT(*) as count
      FROM tweets
      WHERE bookmarked_at >= ? AND bookmarked_at <= ?
      GROUP BY author_handle ORDER BY count DESC LIMIT 5`
      )
      .all(weekStart, weekEnd + 'T23:59:59') as Array<{
      handle: string
      count: number
    }>

    // Rising authors: appeared this week AND their count > their previous week count
    const thisWeekAuthors = db
      .prepare(
        `SELECT author_handle, COUNT(*) as count
      FROM tweets
      WHERE bookmarked_at >= ? AND bookmarked_at <= ?
      GROUP BY author_handle`
      )
      .all(weekStart, weekEnd + 'T23:59:59') as Array<{
      author_handle: string
      count: number
    }>

    const risingAuthors: WeeklyDigest['risingAuthors'] = []
    for (const author of thisWeekAuthors) {
      const prev = db
        .prepare(
          `SELECT COUNT(*) as count FROM tweets
         WHERE author_handle = ? AND bookmarked_at >= ? AND bookmarked_at <= ?`
        )
        .get(
          author.author_handle,
          prevWeekStart,
          prevWeekEnd + 'T23:59:59'
        ) as { count: number }
      if (author.count > prev.count && author.count > 1) {
        risingAuthors.push({
          handle: author.author_handle,
          count: author.count,
          previousCount: prev.count,
        })
      }
    }
    risingAuthors.sort(
      (a, b) => b.count - b.previousCount - (a.count - a.previousCount)
    )

    const weekSummary: WeeklyDigest = {
      weekStart,
      weekEnd,
      totalBookmarks,
      previousWeekTotal,
      topTopics,
      topAuthors,
      risingAuthors: risingAuthors.slice(0, 5),
    }

    return NextResponse.json({ weekSummary })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to get digest',
      },
      { status: 500 }
    )
  }
}
