import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'ok',
      database: 'up',
      time: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('health.database_unreachable', error)
    return NextResponse.json(
      { status: 'degraded', database: 'down', time: new Date().toISOString() },
      { status: 503 },
    )
  }
}
