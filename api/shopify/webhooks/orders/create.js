import { Client } from 'pg'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
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

        await client.connect()

        // Find store - since webhook doesn't include shop domain, use the first Shopify store
        const storeResult = await client.query(
            'SELECT id, domain FROM stores WHERE platform = $1 LIMIT 1',
            ['SHOPIFY']
        )

        if (storeResult.rows.length === 0) {
            console.error(`No Shopify store found in database`)
            console.log(`Order received but no store found. Order ID: ${shopifyOrder.id}`)
            res.status(200).send('OK - Order logged')
            return
        }

        const store = storeResult.rows[0]
        console.log(`Found store: ${store.domain}`)

        // Save the order to database
        console.log(`Saving order to database: ${shopifyOrder.id}`)
        
        // Create or update customer using upsert
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
                 RETURNING id`,
                [
                    store.id,
                    shopifyOrder.customer.email,
                    shopifyOrder.customer.first_name,
                    shopifyOrder.customer.last_name,
                    shopifyOrder.customer.phone,
                    JSON.stringify(shopifyOrder.customer)
                ]
            )
            customerId = customerResult.rows[0].id
            console.log(`Customer upserted: ${customerId}`)
        }

        // Create or update the order using upsert
        const orderResult = await client.query(
            `INSERT INTO orders (id, "storeId", "customerId", "externalId", "orderNumber", items, total, status, metadata, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT ("storeId", "externalId") 
             DO UPDATE SET 
                 total = EXCLUDED.total,
                 status = EXCLUDED.status,
                 items = EXCLUDED.items,
                 metadata = EXCLUDED.metadata,
                 "updatedAt" = NOW()
             RETURNING id`,
            [
                store.id,
                customerId,
                shopifyOrder.id.toString(),
                shopifyOrder.order_number.toString(),
                JSON.stringify(shopifyOrder.line_items),
                parseFloat(shopifyOrder.total_price),
                shopifyOrder.financial_status === 'paid' ? 'PAID' : 'PENDING',
                JSON.stringify({
                    shopifyOrderId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    subtotal: shopifyOrder.subtotal_price,
                    currency: shopifyOrder.currency,
                    fullOrder: shopifyOrder
                })
            ]
        )

        const orderId = orderResult.rows[0].id
        console.log(`Order saved successfully: ${orderId}`)
        res.status(200).send('OK - Order saved')
    } catch (error) {
        console.error('Error handling order creation webhook:', error)
        console.error('Error stack:', error.stack)
        res.status(500).send('Error')
    } finally {
        // Always close the database connection
        await client.end()
    }
}