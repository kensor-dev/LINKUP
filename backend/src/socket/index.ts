import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

let io: SocketIOServer | null = null

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('[socket] клиент подключён:', socket.id)

    socket.on('join:business', (businessId: string) => {
      socket.join(`business:${businessId}`)
    })

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`)
    })

    socket.on('disconnect', () => {
      console.log('[socket] клиент отключён:', socket.id)
    })
  })

  return io
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io ещё не инициализирован')
  }
  return io
}
