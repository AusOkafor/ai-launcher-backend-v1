import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// Create a fresh Prisma client for each request to avoid connection pooling issues
function createFreshPrismaClient() {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    })
}

export const prisma = globalThis.__prisma || createFreshPrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma
}

export * from '@prisma/client'