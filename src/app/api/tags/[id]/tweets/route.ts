import { NextRequest, NextResponse } from 'next/server'
import { addTagToTweet } from '@/lib/tags'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tagId = parseInt(id, 10)
    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 })
    }

    const body = await request.json()
    const { tweetId } = body as { tweetId?: string }

    if (!tweetId || typeof tweetId !== 'string') {
      return NextResponse.json({ error: 'tweetId is required' }, { status: 400 })
    }

    addTagToTweet(tweetId, tagId)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add tag to tweet' },
      { status: 500 }
    )
  }
}
