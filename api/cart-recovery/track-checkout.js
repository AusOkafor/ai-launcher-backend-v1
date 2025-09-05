import { prisma } from '../lib/prisma.js'

function setCors(req, res) {
    const origin = req.headers.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
    setCors(req, res)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' })
        return
    }

    try {
        let body = req.body
        if (typeof body === 'string') {
            try { body = JSON.parse(body) } catch (e) { /* ignore */ }
        }

        const {
            shop,
            cartToken,
            customerEmail,
            customerPhone,
            customerData,
            checkoutUrl,
            consents
        } = body || {}

        if (!shop || !cartToken) {
            res.status(400).json({ success: false, error: 'Shop and cartToken are required' })
            return
        }

        const store = await prisma.store.findFirst({ where: { domain: shop } })
        if (!store) {
            res.status(404).json({ success: false, error: 'Store not found' })
            return
        }

        // Create or update customer
        let customer = null
        if (customerEmail) {
            customer = await prisma.customer.findFirst({ where: { storeId: store.id, email: customerEmail } })
            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        storeId: store.id,
                        email: customerEmail,
                        phone: customerPhone || null,
                        firstName: customerData && customerData.firstName,
                        lastName: customerData && customerData.lastName
                    }
                })
            } else {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        phone: customerPhone || customer.phone,
                        firstName: (customerData && customerData.firstName) || customer.firstName,
                        lastName: (customerData && customerData.lastName) || customer.lastName
                    }
                })
            }
        }

        // Find cart by token
        let cart = await prisma.cart.findFirst({
            where: {
                storeId: store.id,
                metadata: { path: ['cartToken'], equals: cartToken }
            }
        })

        if (!cart) {
            cart = await prisma.cart.create({
                data: {
                    storeId: store.id,
                    customerId: customer && customer.id,
                    items: [],
                    subtotal: 0,
                    status: 'CHECKOUT_STARTED',
                    metadata: {
                        cartToken,
                        shop,
                        checkoutUrl,
                        customerEmail: customerEmail || null,
                        customerPhone: customerPhone || null,
                        consents: consents || null,
                        lastActivity: new Date().toISOString()
                    }
                }
            })
        } else {
            cart = await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    customerId: customer && customer.id || cart.customerId,
                    status: 'CHECKOUT_STARTED',
                    metadata: {
                        ...cart.metadata,
                        checkoutUrl,
                        customerEmail: customerEmail || (cart.metadata && cart.metadata.customerEmail) || null,
                        customerPhone: customerPhone || (cart.metadata && cart.metadata.customerPhone) || null,
                        consents: consents || (cart.metadata && cart.metadata.consents) || null,
                        lastActivity: new Date().toISOString()
                    }
                }
            })
        }

        res.json({ success: true, data: { cartId: cart.id, customerId: customer && customer.id } })
    } catch (e) {
        res.status(500).json({ success: false, error: e.message })
    }
}