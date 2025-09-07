import { prisma } from '../../db.js'

export const getLastProductFromMessages = async (sessionId) => {
    const messages = await prisma.conversationMessage.findMany({
        where: {
            conversation: {
                sessionId: sessionId
            },
            content: {
                contains: 'productId='
            }
        },
        orderBy: {
            timestamp: 'desc'
        },
        take: 1
    })

    if (messages.length > 0) {
        const content = messages[0].content
        const productMatch = content.match(/productId=(\d+)/)
        const productNameMatch = content.match(/🛍️ (.+?) - \$\d/)

        return {
            productId: productMatch && productMatch[1] ? productMatch[1] : null,
            productName: productNameMatch && productNameMatch[1] ? productNameMatch[1] : null
        }
    }

    return null
}

export const getProductById = async (productId) => {
    if (!productId) return null
    return await prisma.product.findUnique({
        where: { id: productId.toString() },
        include: {
            variants: { orderBy: { price: 'asc' } },
            productVariants: { orderBy: { price: 'asc' } }
        }
    })
}

export const getLastProductFromContext = async (sessionId) => {
    return await getLastProductFromMessages(sessionId)
}

// Enhanced recommendation logic
export const generateRecommendations = async (product) => {
    if (!product) return []

    const { id, storeId, tags = [], productType } = product

    const recommendations = await prisma.product.findMany({
        where: {
            storeId: storeId,
            id: { not: id },
            status: 'ACTIVE',
            OR: [
                {
                    tags: {
                        hasSome: tags
                    }
                },
                {
                    productType: productType || undefined
                },
                {
                    description: {
                        contains: product.description && product.description.slice(0, 30) || '',
                        mode: 'insensitive'
                    }
                },
                {
                    title: {
                        contains: product.title && product.title.split(' ')[0] || '',
                        mode: 'insensitive'
                    }
                }
            ]
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            variants: { orderBy: { price: 'asc' } },
            productVariants: { orderBy: { price: 'asc' } }
        },
        take: 5
    })

    return recommendations
}

// Master entry point
export const getRecommendations = async (sessionId) => {
    const context = await getLastProductFromContext(sessionId)
    const productId = context && context.productId ? context.productId : null

    if (!productId) {
        console.warn('No matched product found for session:', sessionId)
        return []
    }

    const product = await getProductById(productId)
    if (!product || !product.description) {
        console.warn('No product or missing description for productId:', productId)
        return []
    }

    return await generateRecommendations(product)
}

export default {
    getLastProductFromMessages,
    getProductById,
    getLastProductFromContext,
    generateRecommendations,
    getRecommendations
}
