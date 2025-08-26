import { prisma } from '../../../lib/prisma.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const shopifyOrder = req.body

        // Debug: Log the webhook payload
        console.log(`Webhook: Order created - ${shopifyOrder && shopifyOrder.id ? shopifyOrder.id : 'NO_ID'}`)
        console.log(`Webhook payload: ${JSON.stringify(shopifyOrder, null, 2)}`)
        console.log(`Webhook payload keys: ${shopifyOrder ? Object.keys(shopifyOrder).join(', ') : 'NO_BODY'}`)

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
        
        // Create or update customer
        const customer = await prisma.customer.upsert({
            where: { 
                externalId: shopifyOrder.customer.id.toString(),
                storeId: store.id
            },
            update: {
                email: shopifyOrder.customer.email,
                firstName: shopifyOrder.customer.first_name,
                lastName: shopifyOrder.customer.last_name,
                phone: shopifyOrder.customer.phone,
                metadata: shopifyOrder.customer
            },
            create: {
                externalId: shopifyOrder.customer.id.toString(),
                storeId: store.id,
                email: shopifyOrder.customer.email,
                firstName: shopifyOrder.customer.first_name,
                lastName: shopifyOrder.customer.last_name,
                phone: shopifyOrder.customer.phone,
                metadata: shopifyOrder.customer
            }
        })

        // Create the order
        const order = await prisma.order.create({
            data: {
                externalId: shopifyOrder.id.toString(),
                storeId: store.id,
                customerId: customer.id,
                orderNumber: shopifyOrder.order_number.toString(),
                status: shopifyOrder.financial_status === 'paid' ? 'PAID' : 'PENDING',
                subtotal: parseFloat(shopifyOrder.subtotal_price),
                total: parseFloat(shopifyOrder.total_price),
                currency: shopifyOrder.currency,
                items: shopifyOrder.line_items,
                metadata: shopifyOrder,
                createdAt: new Date(shopifyOrder.created_at),
                updatedAt: new Date(shopifyOrder.updated_at)
            }
        })

        console.log(`Order saved successfully: ${order.id}`)
        res.status(200).send('OK - Order saved')
    } catch (error) {
        console.error('Error handling order creation webhook:', error)
        console.error('Error stack:', error.stack)
        res.status(500).send('Error')
    }
}