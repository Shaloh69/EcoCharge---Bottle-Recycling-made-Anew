import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const status = (err as unknown as { status?: number }).status ?? 500
  console.error(`[Error] ${req.method} ${req.path} → ${status}: ${err.message}`)
  if (status === 500) console.error(err.stack)
  res.status(status).json({ error: err.message ?? 'internal server error' })
}
