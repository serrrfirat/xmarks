import { NextRequest, NextResponse } from 'next/server'
import { getTags, createTag } from '@/lib/tags'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const tags = getTags()
    const db = getDb()

    const tagsWithCounts = tags.map((tag) => {
      const row = db
        .prepare('SELECT COUNT(*) as count FROM tweet_tags WHERE tag_id = ?')
        .get(tag.id) as { count: number }
      return { ...tag, tweetCount: row.count }
    })

    return NextResponse.json({ data: tagsWithCounts })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body as { name?: string; color?: string }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const tag = createTag(name.trim(), color)
    return NextResponse.json({ data: tag }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tag'
    if (message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
