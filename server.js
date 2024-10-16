const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
})

const rooms = new Map()

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id)

    socket.on('join-room', (roomId) => {
        console.log(`Socket ${socket.id} joining room ${roomId}`)
        socket.join(roomId)
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set())
        }
        rooms.get(roomId).add(socket.id)

        console.log(`Room ${roomId} now has ${rooms.get(roomId).size} clients`)

        if (rooms.get(roomId).size === 2) {
            console.log(`Two clients in room ${roomId}, notifying about connection`)
            io.to(roomId).emit('user-connected')
        }
    })

    socket.on('offer', ({ offer, roomId }) => {
        console.log(`Received offer from ${socket.id} for room ${roomId}`)
        socket.to(roomId).emit('offer', offer)
    })

    socket.on('answer', ({ answer, roomId }) => {
        console.log(`Received answer from ${socket.id} for room ${roomId}`)
        socket.to(roomId).emit('answer', answer)
    })

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        console.log(`Received ICE candidate from ${socket.id} for room ${roomId}`)
        socket.to(roomId).emit('ice-candidate', candidate)
    })

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
        for (const [roomId, clients] of rooms.entries()) {
            if (clients.has(socket.id)) {
                clients.delete(socket.id)
                console.log(`Room ${roomId} now has ${clients.size} clients`)
                if (clients.size === 0) {
                    rooms.delete(roomId)
                    console.log(`Room ${roomId} deleted`)
                } else {
                    io.to(roomId).emit('user-disconnected')
                }
            }
        }
    })
})

const PORT = 3001
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`)
})
