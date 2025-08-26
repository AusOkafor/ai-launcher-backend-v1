import { PrismaClient } from '@prisma/client'

let prisma

if (process.env.NODE_ENV === 'production') {
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            },
            log: ['error', 'warn']
        })
    }
    prisma = global.prisma
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'error', 'warn']
        })
    }
    prisma = global.prisma
}

// Handle connection issues gracefully
prisma.$connect().catch((error) => {
    console.error('Prisma connection error:', error)
})

export { prisma }