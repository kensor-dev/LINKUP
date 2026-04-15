import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { HttpError } from '../middleware/errorHandler'

const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = '7d'
const COURIER_CODE_TTL = 5 * 60

function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN })
}

export async function registerBusiness(businessName: string, email: string, password: string) {
  const existing = await prisma.businessUser.findUnique({ where: { email } })
  if (existing) {
    throw new HttpError(409, 'Пользователь с таким email уже существует')
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: businessName, email, passwordHash },
    })
    const user = await tx.businessUser.create({
      data: {
        businessId: business.id,
        name: businessName,
        email,
        passwordHash,
        role: 'OWNER',
      },
    })
    return { business, user }
  })

  const token = signToken({
    userId: result.user.id,
    businessId: result.business.id,
    role: result.user.role,
  })

  return {
    accessToken: token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      businessId: result.business.id,
      businessName: result.business.name,
    },
  }
}

export async function loginBusiness(email: string, password: string) {
  const user = await prisma.businessUser.findUnique({
    where: { email },
    include: { business: true },
  })

  if (!user || !user.isActive) {
    throw new HttpError(401, 'Неверный email или пароль')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new HttpError(401, 'Неверный email или пароль')
  }

  const token = signToken({
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
  })

  return {
    accessToken: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      businessName: user.business.name,
    },
  }
}

export async function sendCourierCode(phone: string) {
  const courier = await prisma.courier.findUnique({ where: { phone } })
  if (!courier || !courier.isActive) {
    throw new HttpError(404, 'Курьер с таким номером не найден')
  }

  const code = String(Math.floor(1000 + Math.random() * 9000))
  await redis.set(`sms:code:${phone}`, code, 'EX', COURIER_CODE_TTL)

  // В продакшене здесь будет отправка SMS через SendPulse
  return { code, message: 'Код отправлен' }
}

export async function verifyCourierCode(phone: string, code: string) {
  const stored = await redis.get(`sms:code:${phone}`)
  if (!stored || stored !== code) {
    throw new HttpError(400, 'Неверный или истёкший код')
  }

  await redis.del(`sms:code:${phone}`)

  const courier = await prisma.courier.findUnique({ where: { phone } })
  if (!courier) {
    throw new HttpError(404, 'Курьер не найден')
  }

  const token = signToken({
    courierId: courier.id,
    businessId: courier.businessId,
  })

  return {
    accessToken: token,
    courier: {
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      photoUrl: courier.photoUrl,
      businessId: courier.businessId,
    },
  }
}
