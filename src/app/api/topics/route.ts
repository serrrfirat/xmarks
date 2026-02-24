import { NextResponse } from 'next/server'
import { getCategoriesWithCounts } from '@/lib/categories'

export async function GET() {
  try {
    const categories = getCategoriesWithCounts()
    return NextResponse.json({ data: categories })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get topics' },
      { status: 500 }
    )
  }
}
