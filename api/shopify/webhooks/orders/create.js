import { PrismaClient } from '@prisma/client'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Create a new Prisma client for this request to avoid connection issues
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    })

    try {
        const shopifyOrder = req.body

        // Debug: Log the webhook payload
        console.log(`Webhook: Order created - ${shopifyOrder && shopifyOrder.id ? shopifyOrder.id : 'NO_ID'}`)

        if (!shopifyOrder || !shopifyOrder.id) {
            console.error('Invalid webhook payload - missing order ID')
            return res.status(400).send('Invalid webhook payload')
        }

        // Find store - since webhook doesn't include shop domain, use the first Shopify store
        const store = await prisma.store.findFirst({
            where: {
                platform: 'SHOPIFY'
            }
        })

        if (!store) {
            console.error(`No Shopify store found in database`)
            console.log(`Order received but no store found. Order ID: ${shopifyOrder.id}`)
            res.status(200).send('OK - Order logged')
            return
        }

        console.log(`Found store: ${store.domain}`)

        // Save the order to database
        console.log(`Saving order to database: ${shopifyOrder.id}`)
        
        // Create or update customer using upsert (now that we have unique constraint)
        let customer = null
        if (shopifyOrder.customer && shopifyOrder.customer.email) {
            customer = await prisma.customer.upsert({
                where: { 
                    storeId_email: {
                        storeId: store.id,
                        email: shopifyOrder.customer.email
                    }
                },
                update: {
                    firstName: shopifyOrder.customer.first_name,
                    lastName: shopifyOrder.customer.last_name,
                    phone: shopifyOrder.customer.phone,
                    traits: shopifyOrder.customer
                },
                create: {
                    storeId: store.id,
                    email: shopifyOrder.customer.email,
                    firstName: shopifyOrder.customer.first_name,
                    lastName: shopifyOrder.customer.last_name,
                    phone: shopifyOrder.customer.phone,
                    traits: shopifyOrder.customer
                }
            })
            console.log(`Customer upserted: ${customer.id}`)
        }

        // Create or update the order using upsert
        const order = await prisma.order.upsert({
            where: {
                storeId_externalId: {
                    storeId: store.id,
                    externalId: shopifyOrder.id.toString()
                }
            },
            update: {
                total: parseFloat(shopifyOrder.total_price),
                status: shopifyOrder.financial_status === 'paid' ? 'PAID' : 'PENDING',
                items: shopifyOrder.line_items,
                metadata: {
                    shopifyOrderId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    subtotal: shopifyOrder.subtotal_price,
                    currency: shopifyOrder.currency,
                    fullOrder: shopifyOrder
                }
            },
            create: {
                storeId: store.id,
                customerId: customer ? customer.id : null,
                externalId: shopifyOrder.id.toString(),
                orderNumber: shopifyOrder.order_number.toString(),
                total: parseFloat(shopifyOrder.total_price),
                status: shopifyOrder.financial_status === 'paid' ? 'PAID' : 'PENDING',
                items: shopifyOrder.line_items,
                metadata: {
                    shopifyOrderId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    subtotal: shopifyOrder.subtotal_price,
                    currency: shopifyOrder.currency,
                    fullOrder: shopifyOrder
                }
            }
        })

        console.log(`Order saved successfully: ${order.id}`)
        res.status(200).send('OK - Order saved')
    } catch (error) {
        console.error('Error handling order creation webhook:', error)
        console.error('Error stack:', error.stack)
        res.status(500).send('Error')
    } finally {
        // Always disconnect the Prisma client
        await prisma.$disconnect()
    }
}