import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Reuse Prisma client across hot reloads/dev, create new in prod
export const prisma = globalForPrisma.prisma ? ? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma