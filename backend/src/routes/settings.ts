import { Router } from 'express'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { authenticateBusiness, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { prisma } from '../lib/prisma'
import { HttpError } from '../middleware/errorHandler'

const router = Router()

const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Только изображения'))
    }
    cb(null, true)
  },
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['OWNER', 'DISPATCHER']),
  password: z.string().min(6),
})

router.get('/', authenticateBusiness, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.user!.businessId },
      select: { id: true, name: true, email: true, logoUrl: true, brandColor: true, createdAt: true },
    })
    if (!business) throw new HttpError(404, 'Бизнес не найден')
    res.json(business)
  } catch (err) {
    next(err)
  }
})

router.patch('/', authenticateBusiness, validate(updateSchema), async (req, res, next) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.user!.businessId },
      data: req.body,
      select: { id: true, name: true, email: true, logoUrl: true, brandColor: true },
    })
    res.json(business)
  } catch (err) {
    next(err)
  }
})

router.post('/logo', authenticateBusiness, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'Файл не загружен')

    const ext = req.file.mimetype.split('/')[1] || 'jpg'
    const newName = `${req.user!.businessId}.${ext}`
    const newPath = path.join(uploadsDir, newName)

    fs.renameSync(req.file.path, newPath)

    const logoUrl = `/uploads/${newName}`
    await prisma.business.update({
      where: { id: req.user!.businessId },
      data: { logoUrl },
    })

    res.json({ logoUrl })
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    next(err)
  }
})

router.get('/users', authenticateBusiness, async (req, res, next) => {
  try {
    const users = await prisma.businessUser.findMany({
      where: { businessId: req.user!.businessId, isActive: true },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

router.post(
  '/users',
  authenticateBusiness,
  requireRole('OWNER'),
  validate(inviteSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.businessUser.findUnique({ where: { email: req.body.email } })
      if (existing) throw new HttpError(409, 'Пользователь с таким email уже существует')

      const bcrypt = await import('bcrypt')
      const passwordHash = await bcrypt.hash(req.body.password, 12)

      const user = await prisma.businessUser.create({
        data: {
          businessId: req.user!.businessId,
          name: req.body.name,
          email: req.body.email,
          role: req.body.role,
          passwordHash,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })

      res.status(201).json(user)
    } catch (err) {
      next(err)
    }
  }
)

router.delete('/users/:id', authenticateBusiness, requireRole('OWNER'), async (req, res, next) => {
  try {
    if (req.params.id === req.user!.userId) {
      throw new HttpError(400, 'Нельзя удалить самого себя')
    }

    const user = await prisma.businessUser.findFirst({
      where: { id: String(req.params.id), businessId: req.user!.businessId },
    })
    if (!user) throw new HttpError(404, 'Пользователь не найден')

    await prisma.businessUser.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
