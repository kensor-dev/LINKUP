import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { HttpError } from './errorHandler'

interface BusinessJwtPayload {
  userId: string
  businessId: string
  role: string
}

interface CourierJwtPayload {
  courierId: string
  businessId: string
}

declare global {
  namespace Express {
    interface Request {
      user?: BusinessJwtPayload
      courier?: CourierJwtPayload
    }
  }
}

export function authenticateBusiness(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Токен не предоставлен'))
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as BusinessJwtPayload
    req.user = payload
    next()
  } catch {
    next(new HttpError(401, 'Недействительный токен'))
  }
}

export function authenticateCourier(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Токен не предоставлен'))
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as CourierJwtPayload
    req.courier = payload
    next()
  } catch {
    next(new HttpError(401, 'Недействительный токен'))
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return next(new HttpError(403, 'Недостаточно прав'))
    }
    next()
  }
}
