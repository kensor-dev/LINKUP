import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { HttpError } from '../middleware/errorHandler'

const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = '7d'
const COURIER_CODE_TTL = 5 * 60

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return '+7' + digits.slice(1)
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return '+7' + digits.slice(1)
  }
  if (digits.length === 10) {
    return '+7' + digits
  }
  return phone.startsWith('+') ? phone : '+' + digits
}

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

function last10(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

export async function sendCourierCode(phone: string) {
  const suffix = last10(phone)
  const courier = await prisma.courier.findFirst({
    where: { phone: { endsWith: suffix }, isActive: true },
  })
  if (!courier) {
    throw new HttpError(404, 'Курьер с таким номером не найден')
  }

  const code = String(Math.floor(1000 + Math.random() * 9000))
  await redis.set(`sms:code:${suffix}`, code, 'EX', COURIER_CODE_TTL)

  return { code, message: 'Код отправлен' }
}

export async function verifyCourierCode(phone: string, code: string) {
  const suffix = last10(phone)
  const stored = await redis.get(`sms:code:${suffix}`)
  if (!stored || stored !== code) {
    throw new HttpError(400, 'Неверный или истёкший код')
  }

  await redis.del(`sms:code:${suffix}`)

  const courier = await prisma.courier.findFirst({ where: { phone: { endsWith: suffix } } })
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
