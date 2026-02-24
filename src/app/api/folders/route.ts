import { NextRequest, NextResponse } from 'next/server'
import { getFolders, createFolder } from '@/lib/folders'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const folders = getFolders()
    const db = getDb()

    const foldersWithCounts = folders.map((folder) => {
      const row = db
        .prepare('SELECT COUNT(*) as count FROM tweet_folders WHERE folder_id = ?')
        .get(folder.id) as { count: number }
      return { ...folder, tweetCount: row.count }
    })

    return NextResponse.json({ data: foldersWithCounts })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get folders' },
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

    const folder = createFolder(name.trim(), color)
    return NextResponse.json({ data: folder }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create folder'
    if (message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Folder name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
