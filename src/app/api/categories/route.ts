import { listCategories } from '@/server/queries'
import { handleError, ok } from '@/server/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return ok(await listCategories())
  } catch (error) {
    return handleError('api.categories', error)
  }
}
