import { NextRequest, NextResponse } from 'next/server'
import { addTweetToFolder } from '@/lib/folders'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const folderId = parseInt(id, 10)
    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    const body = await request.json()
    const { tweetId } = body as { tweetId?: string }

    if (!tweetId || typeof tweetId !== 'string') {
      return NextResponse.json({ error: 'tweetId is required' }, { status: 400 })
    }

    addTweetToFolder(tweetId, folderId)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add tweet to folder' },
      { status: 500 }
    )
  }
}
