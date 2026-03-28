import { Response } from 'express'

const adminClients = new Set<Response>()
const kioskClients = new Map<string, Set<Response>>()

export function addAdminClient(res: Response): void {
  adminClients.add(res)
  res.on('close', () => { adminClients.delete(res) })
}

export function addKioskClient(kioskId: string, res: Response): void {
  if (!kioskClients.has(kioskId)) kioskClients.set(kioskId, new Set())
  kioskClients.get(kioskId)!.add(res)
  res.on('close', () => { kioskClients.get(kioskId)?.delete(res) })
}

export function broadcastToAdmin(data: object): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  adminClients.forEach(res => { try { res.write(payload) } catch { adminClients.delete(res) } })
}

export function broadcastToKiosk(kioskId: string, data: object): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  kioskClients.get(kioskId)?.forEach(res => { try { res.write(payload) } catch { kioskClients.get(kioskId)?.delete(res) } })
}

export function sseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}
