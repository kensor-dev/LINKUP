import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: err.issues,
    })
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  console.error('[error]', err)
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
}
