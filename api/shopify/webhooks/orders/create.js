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

        // Find store by domain (try multiple possible field names)
        const shopDomain = shopifyOrder.shop_domain || shopifyOrder.domain
        console.log(`Shop domain from webhook: ${shopDomain || 'NOT_FOUND'}`)

        const store = await prisma.store.findFirst({
            where: {
                domain: shopDomain,
                platform: 'SHOPIFY'
            }
        })

        if (!store) {
            console.error(`Store not found for domain: ${shopDomain}`)
            console.error(`Available domains: austus-themes.myshopify.com, your-store.myshopify.com`)

            // For now, just log the order and return success
            console.log(`Order received but store not found. Order ID: ${shopifyOrder.id}`)
            res.status(200).send('OK - Order logged')
            return
        }

        // For now, just log the order
        console.log(`Order received for store: ${store.domain}. Order ID: ${shopifyOrder.id}`)
        res.status(200).send('OK - Order logged')
    } catch (error) {
        console.error('Error handling order creation webhook:', error)
        console.error('Error stack:', error.stack)
        res.status(500).send('Error')
    }
}