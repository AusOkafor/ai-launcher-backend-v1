import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    try {
        if (req.method === 'GET') {
            console.log('Fetching launches...')

            const launches = await prisma.launch.findMany({
                orderBy: {
                    createdAt: 'desc'
                }
            })

            console.log(`Found ${launches.length} launches`)

            return res.status(200).json({
                success: true,
                data: { launches },
                timestamp: new Date().toISOString()
            })
        }

        if (req.method === 'POST') {
            const { productId, brandTone, targetAudience, launchWindow, budget, platforms, additionalNotes } = req.body

            const launch = await prisma.launch.create({
                data: {
                    workspaceId: 'test-workspace-id',
                    productId,
                    name: `Launch for ${productId}`,
                    status: 'DRAFT',
                    inputs: {
                        productId,
                        brandTone,
                        targetAudience,
                        launchWindow,
                        budget,
                        platforms,
                        additionalNotes
                    }
                }
            })

            return res.status(201).json({
                success: true,
                data: { launch },
                timestamp: new Date().toISOString()
            })
        }

        return res.status(405).json({
            success: false,
            error: { message: 'Method not allowed' }
        })
    } catch (error) {
        console.error('Error with launches:', error)
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to process launches request',
                details: error.message
            }
        })
    }
}