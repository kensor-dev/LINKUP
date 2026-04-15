import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import * as authService from '../services/auth.service'

const router = Router()

const registerSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const sendCodeSchema = z.object({
  phone: z.string().min(10),
})

const verifyCodeSchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(4),
})

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.registerBusiness(
      req.body.businessName,
      req.body.email,
      req.body.password
    )
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.loginBusiness(req.body.email, req.body.password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/courier/send-code', validate(sendCodeSchema), async (req, res, next) => {
  try {
    const result = await authService.sendCourierCode(req.body.phone)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/courier/verify-code', validate(verifyCodeSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyCourierCode(req.body.phone, req.body.code)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
