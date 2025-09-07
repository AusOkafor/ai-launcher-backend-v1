import { PrismaClient } from '@prisma/client'
import { Client } from 'pg'

// Import WhatsApp controllers
import {
    getChatbots,
    createChatbot,
    getChatbot,
    updateChatbot,
    deleteChatbot,
    toggleActive,
    getChatbotStats
} from '../src/controllers/whatsapp/chatbotController.js'

import { handleChatMessage } from '../src/controllers/whatsapp/chatController.js'

import {
    getConversations,
    getConversation,
    updateStatus,
    exportConversations
} from '../src/controllers/whatsapp/conversationController.js'

let prisma

function createFreshPrismaClient() {
    return new PrismaClient()
}

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient()
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient()
    }
    prisma = global.prisma
}

// CORS helper
function setCorsHeaders(res, origin) {
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
}

// Shopify OAuth handlers
async function handleShopifyAuthorize(req, res) {
    const { shop } = req.query

    if (!shop) {
        return res.status(400).json({ error: 'Shop parameter is required' })
    }

    const scopes = 'read_products,read_orders,write_products'
    const redirectUri = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/consolidated?path=shopify/oauth/callback`
    const clientId = process.env.SHOPIFY_CLIENT_ID

    const authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=nonce`

    res.redirect(authUrl)
}

async function handleShopifyCallback(req, res) {
    const { code, shop, state } = req.query

    if (!code || !shop) {
        return res.status(400).json({ error: 'Missing required parameters' })
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code
            })
        })

        const tokenData = await tokenResponse.json()

        if (!tokenData.access_token) {
            throw new Error('Failed to get access token')
        }

        // Store connection in database
        await prisma.shopifyConnection.create({
            data: {
                shop,
                accessToken: tokenData.access_token,
                scope: tokenData.scope,
                workspaceId: 'default-workspace'
            }
        })

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings?connected=true`)
    } catch (error) {
        console.error('OAuth callback error:', error)
        res.status(500).json({ error: 'Authentication failed' })
    }
}

// Shopify webhook handler
async function handleOrderWebhook(req, res) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        const shopifyOrder = req.body

        if (!shopifyOrder || !shopifyOrder.id) {
            return res.status(400).send('Invalid webhook payload')
        }

        await client.connect()

        // Find store
        const storeResult = await client.query(
            'SELECT id, domain FROM stores WHERE platform = $1 LIMIT 1', ['SHOPIFY']
        )

        if (storeResult.rows.length === 0) {
            return res.status(200).send('OK - No store found')
        }

        const store = storeResult.rows[0]

        // Create/update customer
        let customerId = null
        if (shopifyOrder.customer && shopifyOrder.customer.email) {
            const customerResult = await client.query(
                `INSERT INTO customers (id, "storeId", email, "firstName", "lastName", phone, traits, "createdAt", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
                 ON CONFLICT ("storeId", email) 
                 DO UPDATE SET 
                     "firstName" = EXCLUDED."firstName",
                     "lastName" = EXCLUDED."lastName",
                     phone = EXCLUDED.phone,
                     traits = EXCLUDED.traits,
                     "updatedAt" = NOW()
                 RETURNING id`, [
                    store.id,
                    shopifyOrder.customer.email,
                    shopifyOrder.customer.first_name,
                    shopifyOrder.customer.last_name,
                    shopifyOrder.customer.phone,
                    JSON.stringify(shopifyOrder.customer)
                ]
            )
            customerId = customerResult.rows[0].id
        }

        // Create/update order
        await client.query(
            `INSERT INTO orders (id, "storeId", "customerId", "externalId", "orderNumber", items, total, status, metadata, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT ("storeId", "externalId") 
             DO UPDATE SET 
                 total = EXCLUDED.total,
                 status = EXCLUDED.status,
                 items = EXCLUDED.items,
                 metadata = EXCLUDED.metadata,
                 "updatedAt" = NOW()`, [
                store.id,
                customerId,
                shopifyOrder.id.toString(),
                shopifyOrder.order_number.toString(),
                JSON.stringify(shopifyOrder.line_items),
                parseFloat(shopifyOrder.total_price),
                shopifyOrder.financial_status === 'paid' ? 'CONFIRMED' : 'PENDING',
                JSON.stringify({
                    shopifyOrderId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    subtotal: shopifyOrder.subtotal_price,
                    currency: shopifyOrder.currency,
                    fullOrder: shopifyOrder
                })
            ]
        )

        res.status(200).send('OK - Order saved')
    } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).send('Error')
    } finally {
        await client.end()
    }
}

export default async function handler(req, res) {
    const origin = req.headers.origin || '*'
    setCorsHeaders(res, origin)

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    const { path } = req.query
    const pathSegments = path ? path.split('/') : []

    try {
        // Route based on path segments
        switch (pathSegments[0]) {
            case 'products':
                if (req.method === 'GET') {
                    const products = await prisma.product.findMany({
                        include: {
                            store: {
                                select: {
                                    name: true,
                                    platform: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })
                    return res.status(200).json({
                        success: true,
                        data: { products },
                        timestamp: new Date().toISOString()
                    })
                }
                break

            case 'launches':
                if (req.method === 'GET') {
                    const launches = await prisma.launch.findMany({
                        orderBy: { createdAt: 'desc' }
                    })
                    return res.status(200).json({
                        success: true,
                        data: { launches },
                        timestamp: new Date().toISOString()
                    })
                }

                // Handle generate endpoint
                if (pathSegments[2] === 'generate' && req.method === 'POST') {
                    const launchId = pathSegments[1]
                    const prismaClient = createFreshPrismaClient()

                    const launch = await prismaClient.launch.findFirst({
                        where: { id: launchId },
                        include: { product: true }
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

                    return res.status(200).json({
                        success: true,
                        message: 'Generation started',
                        data: { launch }
                    })
                }
                break

            case 'shopify':
                if (pathSegments[1] === 'connections') {
                    if (req.method === 'GET') {
                        const workspaceId = req.query.workspaceId || 'test-workspace-id'
                        const connections = await prisma.shopifyConnection.findMany({
                            where: { workspaceId },
                            select: {
                                id: true,
                                shop: true,
                                shopName: true,
                                email: true,
                                country: true,
                                currency: true,
                                status: true,
                                createdAt: true,
                                updatedAt: true
                            }
                        })
                        return res.json({ success: true, connections })
                    }
                    if (req.method === 'DELETE') {
                        const { id } = req.query
                        await prisma.shopifyConnection.delete({ where: { id } })
                        return res.json({ success: true, message: 'Connection disconnected' })
                    }
                }
                if (pathSegments[1] === 'oauth') {
                    if (pathSegments[2] === 'authorize') {
                        return handleShopifyAuthorize(req, res)
                    }
                    if (pathSegments[2] === 'callback') {
                        return handleShopifyCallback(req, res)
                    }
                }
                if (pathSegments[1] === 'webhooks' && pathSegments[2] === 'orders' && pathSegments[3] === 'create') {
                    return handleOrderWebhook(req, res)
                }
                break

            case 'whatsapp':
                // WhatsApp routes
                if (pathSegments[1] === 'chatbots') {
                    switch (req.method) {
                        case 'GET':
                            if (req.query.stats) return await getChatbotStats(req, res)
                            if (req.query.id) return await getChatbot(req, res)
                            return await getChatbots(req, res)
                        case 'POST':
                            return await createChatbot(req, res)
                        case 'PUT':
                            return await updateChatbot(req, res)
                        case 'DELETE':
                            return await deleteChatbot(req, res)
                        case 'PATCH':
                            if (req.query.toggle) return await toggleActive(req, res)
                            break
                    }
                } else if (pathSegments[1] === 'chat') {
                    if (req.method === 'POST') {
                        if (pathSegments[2] && pathSegments[2] !== 'converse') {
                            req.params = { id: pathSegments[2] }
                        }
                        return await handleChatMessage(req, res)
                    }
                } else if (pathSegments[1] === 'conversations') {
                    switch (req.method) {
                        case 'GET':
                            if (req.query.export) return await exportConversations(req, res)
                            if (req.query.id) return await getConversation(req, res)
                            return await getConversations(req, res)
                        case 'PATCH':
                            if (req.query.status) return await updateStatus(req, res)
                            break
                    }
                }
                break

            default:
                // Health check
                if (!pathSegments[0] || pathSegments[0] === 'health') {
                    return res.status(200).json({
                        success: true,
                        message: 'API is running',
                        timestamp: new Date().toISOString()
                    })
                }
        }

        return res.status(404).json({
            success: false,
            error: { message: 'Endpoint not found' }
        })

    } catch (error) {
        console.error('API Error:', error)
        return res.status(500).json({
            success: false,
            error: { message: 'Internal server error' }
        })
    }
}