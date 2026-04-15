import { Router } from 'express'
import * as orderService from '../services/order.service'

const router = Router()

router.get('/:token', async (req, res, next) => {
  try {
    const data = await orderService.getTrackingData(req.params.token)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
