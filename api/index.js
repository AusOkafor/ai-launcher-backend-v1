import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create a fresh Prisma client for each request
function createFreshPrismaClient() {
    return new PrismaClient({
        log: ['error']
    })
}

export default async function handler(req, res) {
    // Set CORS headers for serverless catch-all (fallback)
    const origin = req.headers.origin || '*'
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ]
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`)
    let prismaClient = null

    try {
        // Handle generate endpoint specifically
        if (pathname.match(/^\/api\/launches\/[^\/]+\/generate$/) && req.method === 'POST') {
            try {
                const launchId = pathname.split('/')[3]
                prismaClient = createFreshPrismaClient()

                // Get the launch
                const launch = await prismaClient.launch.findFirst({
                    where: { id: launchId },
                    include: {
                        product: true
                    }
                })

                if (!launch) {
                    return res.status(404).json({
                        success: false,
                        error: { message: 'Launch not found' }
                    })
                }

                // Update status to GENERATING
                await prismaClient.launch.update({
                    where: { id: launchId },
                    data: { status: 'GENERATING' }
                })

                // Import AI service
                const { aiService } = await
                import ('../src/services/ai.js')
                await aiService.initialize()

                // Import AI launch service
                const { aiLaunchService } = await
                import ('../src/services/aiLaunchService.js')

                // Generate AI content
                const aiResponse = await aiService.generateText(`
Generate engaging social media content for this product:

Product: ${launch.product.title}
Price: $${launch.product.price}
Category: ${launch.product.category}
Brand: ${launch.product.brand}
Description: ${launch.product.description}

Generate:
1. A catchy headline (max 60 characters)
2. Engaging post copy (max 280 characters)
3. 5 relevant hashtags
4. Call-to-action suggestion

Target audience: ${launch.inputs.targetAudience}
Tone: ${launch.inputs.brandTone}
Platform: Instagram

Make it compelling and conversion-focused.
                `, {
                    model: 'mistralai/Mistral-7B-Instruct-v0.1',
                    maxTokens: 500,
                    temperature: 0.7,
                    provider: 'togetherai'
                })

                // Extract content from AI response
                const extractedContent = {
                    headline: aiLaunchService._extractHeadline(aiResponse.text),
                    postCopy: aiLaunchService._extractPostCopy(aiResponse.text),
                    hashtags: aiLaunchService._extractHashtags(aiResponse.text),
                    callToAction: aiLaunchService._extractCallToAction(aiResponse.text),
                    fullResponse: aiResponse.text
                }

                // Update launch with generated content
                const updatedLaunch = await prismaClient.launch.update({
                    where: { id: launchId },
                    data: {
                        status: 'COMPLETED',
                        outputs: {
                            title: `AI-Generated Social Media Launch for ${launch.product.title}`,
                            description: `Social media content for ${launch.product.title}`,
                            content: extractedContent,
                            aiModel: 'mistralai/Mistral-7B-Instruct-v0.1'
                        }
                    },
                    include: {
                        product: true,
                        adCreatives: true
                    }
                })

                return res.status(200).json({
                    success: true,
                    data: {
                        message: 'AI content generated successfully',
                        launchId: launchId,
                        data: {
                            launch: updatedLaunch
                        }
                    }
                })

            } catch (error) {
                console.error('Error generating launch content:', error)
                return res.status(500).json({
                    success: false,
                    error: { message: 'Failed to generate launch content' }
                })
            }
        }

        // Default response for unmatched routes
        return res.status(404).json({
            success: false,
            error: { message: 'Route not found' }
        })

    } catch (error) {
        console.error('API error:', error)
        return res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error',
                details: error.message
            }
        })
    } finally {
        // Clean up database connection
        if (prismaClient) {
            await prismaClient.$disconnect()
        }
    }
}