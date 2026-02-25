import { NextRequest, NextResponse } from 'next/server'
import { getBookmarks } from '@/lib/search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)
    const folderIdStr = searchParams.get('folderId')
    const tagIdStr = searchParams.get('tagId')
    const categoryIdStr = searchParams.get('categoryId')
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined

    const folderId = folderIdStr ? parseInt(folderIdStr, 10) : undefined
    const tagId = tagIdStr ? parseInt(tagIdStr, 10) : undefined
    const categoryId = categoryIdStr ? parseInt(categoryIdStr, 10) : undefined

    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json({ error: 'Invalid limit or offset' }, { status: 400 })
    }

    const result = getBookmarks({ limit, offset, folderId, tagId, categoryId, from, to })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get bookmarks' },
      { status: 500 }
    )
  }
}
