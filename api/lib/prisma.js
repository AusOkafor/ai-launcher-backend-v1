import { PrismaClient } from '@prisma/client'

let prisma

if (process.env.NODE_ENV === 'production') {
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        })
    }
    prisma = global.prisma
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

export { prisma }