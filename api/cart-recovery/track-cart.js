export default async function handler(req, res) {
    // Allow all origins so Shopify storefront can POST
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, X-Shopify-Access-Token');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }

    // Parse body (Shopify sometimes sends as string)
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            // could be urlencoded "key=value&key2=value2" style
            const params = new URLSearchParams(body);
            if (params.has('shop') && params.has('cartToken')) {
                body = Object.fromEntries(params.entries());
                // items/consents could be JSON strings inside params; leave as-is
            } else {
                body = {}; // fallback empty
            }
        }
    }
    body = body || {};

    const {
        shop,
        cartToken,
        items = [],
        total = 0,
        customerEmail = null,
        customerPhone = null,
        sessionId = null,
        consents = null
    } = body;

    if (!shop || !cartToken) {
        res.status(400).json({ success: false, error: 'Shop and cartToken are required' });
        return;
    }

    try {
        const { prisma } = await
        import ('../lib/prisma.js');

        // Get store record
        const store = await prisma.store.findFirst({ where: { domain: shop } });
        if (!store) {
            res.status(404).json({ success: false, error: 'Store not found' });
            return;
        }

        // Normalise items array
        let normItems = items;
        if (!Array.isArray(normItems)) {
            try { normItems = JSON.parse(items); } catch { normItems = []; }
        }

        const computedSubtotal = Number(parseFloat(total)) || normItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);

        // Find existing cart by cartToken
        let cart = await prisma.cart.findFirst({
            where: {
                storeId: store.id,
                metadata: { path: ['cartToken'], equals: cartToken }
            }
        });

        if (cart) {
            cart = await prisma.cart.update({
                where: { id: cart.id },
                data: {
                    items: normItems,
                    subtotal: computedSubtotal,
                    metadata: {
                        ...cart.metadata,
                        customerEmail: customerEmail || (cart.metadata && cart.metadata.customerEmail) || null,
                        customerPhone: customerPhone || (cart.metadata && cart.metadata.customerPhone) || null,
                        consents: consents || (cart.metadata && cart.metadata.consents) || null,
                        sessionId: sessionId || (cart.metadata && cart.metadata.sessionId) || null,
                        lastActivity: new Date().toISOString()
                    }
                }
            });
        } else {
            cart = await prisma.cart.create({
                data: {
                    storeId: store.id,
                    items: normItems,
                    subtotal: computedSubtotal,
                    status: 'ACTIVE',
                    metadata: {
                        cartToken,
                        shop,
                        customerEmail,
                        customerPhone,
                        consents,
                        sessionId,
                        lastActivity: new Date().toISOString()
                    }
                }
            });
        }

        res.json({ success: true, data: { cartId: cart.id } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}