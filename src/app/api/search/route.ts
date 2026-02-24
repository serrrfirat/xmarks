import { NextRequest, NextResponse } from 'next/server'
import { searchBookmarks } from '@/lib/search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json({ error: 'Invalid limit or offset' }, { status: 400 })
    }

    const results = searchBookmarks(q, { limit, offset })
    return NextResponse.json({ items: results, total: results.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
