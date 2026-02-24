import { NextRequest, NextResponse } from 'next/server'
import { removeTagFromTweet } from '@/lib/tags'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tweetId: string }> }
) {
  try {
    const { id, tweetId } = await params
    const tagId = parseInt(id, 10)
    if (isNaN(tagId)) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 })
    }

    removeTagFromTweet(tweetId, tagId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove tag from tweet' },
      { status: 500 }
    )
  }
}
