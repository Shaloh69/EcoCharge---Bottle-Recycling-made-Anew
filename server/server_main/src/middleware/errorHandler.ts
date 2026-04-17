import { Request, Response, NextFunction } from 'express'
import { log } from '../logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const status = (err as unknown as { status?: number }).status ?? 500
  const userId = (req as unknown as { userId?: number }).userId

  const context = [
    `${req.method} ${req.path}`,
    userId ? `user #${userId}` : 'unauthenticated',
    `→ ${status}`,
    err.message,
  ].join(' | ')

  if (status >= 500) {
    log.error('Server', context)
    if (err.stack) log.error('Server', err.stack)
  } else if (status === 401 || status === 403) {
    log.authWarn(`${context}`)
  } else if (status === 404) {
    log.warn('NotFound', context)
  } else {
    log.warn('Request', context)
  }

  res.status(status).json({ error: err.message ?? 'internal server error' })
}
