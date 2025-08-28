import express from 'express';
import { shopifyService } from '../services/shopify.js';
import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
    res.json({ message: 'Shopify routes are working! - OAuth routes should be available' });
});

// Test OAuth route specifically
router.get('/test-oauth', (req, res) => {
    res.json({ message: 'OAuth routes are accessible!' });
});

// ========================================
// OAUTH ROUTES
// ========================================

// Initiate OAuth flow
router.get('/oauth/authorize', async(req, res) => {
    try {
        const { shop } = req.query;

        if (!shop) {
            return res.status(400).json({
                success: false,
                error: 'Shop parameter is required'
            });
        }

        // Validate shop domain format
        if (!shop.includes('.myshopify.com')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid shop domain. Must be in format: your-store.myshopify.com'
            });
        }

        const clientId = process.env.SHOPIFY_CLIENT_ID;
        const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
        const scopes = 'read_products,write_products,read_orders,write_orders,read_customers,write_customers';

        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;

        logger.info(`Redirecting to Shopify OAuth: ${authUrl}`);

        res.redirect(authUrl);
    } catch (error) {
        logger.error('Error initiating OAuth:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate OAuth flow'
        });
    }
});

// OAuth callback
router.get('/oauth/callback', async(req, res) => {
    try {
        const { code, shop, state } = req.query;

        if (!code || !shop) {
            return res.status(400).json({
                success: false,
                error: 'Missing required OAuth parameters'
            });
        }

        logger.info(`OAuth callback received for shop: ${shop}`);

        // Exchange code for access token
        const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.SHOPIFY_CLIENT_ID,
                client_secret: process.env.SHOPIFY_CLIENT_SECRET,
                code: code
            })
        });

        if (!tokenResponse.ok) {
            throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, scope } = tokenData;

        // Get shop information
        const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': access_token,
                'Content-Type': 'application/json'
            }
        });

        if (!shopResponse.ok) {
            throw new Error(`Failed to get shop info: ${shopResponse.statusText}`);
        }

        const shopData = await shopResponse.json();
        const shopInfo = shopData.shop;

        // For now, use a default workspace ID (you'll need to handle this properly)
        const workspaceId = 'test-workspace-id';

        // Create or update Shopify connection
        const connection = await prisma.shopifyConnection.upsert({
            where: {
                workspaceId_shop: {
                    workspaceId,
                    shop
                }
            },
            update: {
                accessToken: access_token,
                scope,
                shopifyId: shopInfo.id.toString(),
                shopName: shopInfo.name,
                email: shopInfo.email,
                country: shopInfo.country,
                currency: shopInfo.currency,
                timezone: shopInfo.timezone,
                status: 'ACTIVE',
                updatedAt: new Date()
            },
            create: {
                workspaceId,
                shop,
                accessToken: access_token,
                scope,
                shopifyId: shopInfo.id.toString(),
                shopName: shopInfo.name,
                email: shopInfo.email,
                country: shopInfo.country,
                currency: shopInfo.currency,
                timezone: shopInfo.timezone,
                status: 'ACTIVE'
            }
        });

        logger.info(`Shopify connection created/updated: ${connection.id}`);

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=success&shop=${shop}`);

    } catch (error) {
        logger.error('Error in OAuth callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=error&message=${encodeURIComponent(error.message)}`);
    }
});

// Get Shopify connections for a workspace
router.get('/connections', async(req, res) => {
    try {
        const workspaceId = req.query.workspaceId || 'test-workspace-id';

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
        });

        res.json({
            success: true,
            connections
        });
    } catch (error) {
        logger.error('Error getting connections:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect Shopify connection
router.delete('/connections/:id', async(req, res) => {
    try {
        const { id } = req.params;

        await prisma.shopifyConnection.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Connection disconnected successfully'
        });
    } catch (error) {
        logger.error('Error disconnecting:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========================================
// WEBHOOK HANDLERS (Real-time sync)
// ========================================

// Handle order creation webhook
router.post('/webhooks/orders/create', async(req, res) => {
    try {
        const shopifyOrder = req.body;

        // Debug: Log the webhook payload
        logger.info(`Webhook: Order created - ${shopifyOrder && shopifyOrder.id ? shopifyOrder.id : 'NO_ID'}`);
        logger.info(`Webhook payload: ${JSON.stringify(shopifyOrder, null, 2)}`);
        logger.info(`Webhook payload keys: ${shopifyOrder ? Object.keys(shopifyOrder).join(', ') : 'NO_BODY'}`);

        if (!shopifyOrder || !shopifyOrder.id) {
            logger.error('Invalid webhook payload - missing order ID');
            return res.status(400).send('Invalid webhook payload');
        }

        // Find store by domain (try multiple possible field names)
        const shopDomain = shopifyOrder.shop_domain || shopifyOrder.domain;
        logger.info(`Shop domain from webhook: ${shopDomain || 'NOT_FOUND'}`);

        const store = await prisma.store.findFirst({
            where: {
                domain: shopDomain,
                platform: 'SHOPIFY'
            }
        });

        if (!store) {
            logger.error(`Store not found for domain: ${shopDomain}`);
            logger.error(`Available domains: austus-themes.myshopify.com, your-store.myshopify.com`);

            // Try to find any Shopify store as fallback
            const fallbackStore = await prisma.store.findFirst({
                where: { platform: 'SHOPIFY' }
            });

            if (fallbackStore) {
                logger.info(`Using fallback store: ${fallbackStore.domain}`);
                const order = await shopifyService.syncOrder(fallbackStore.id, shopifyOrder.id);
                logger.info(`Synced new order: ${order.id}`);
                res.status(200).send('OK');
                return;
            }

            return res.status(404).send('Store not found');
        }

        // Sync the new order
        const order = await shopifyService.syncOrder(store.id, shopifyOrder.id);

        logger.info(`Synced new order: ${order.id}`);
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling order creation webhook:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).send('Error');
    }
});

// Handle order update webhook
router.post('/webhooks/orders/updated', async(req, res) => {
    try {
        const shopifyOrder = req.body;
        logger.info(`Webhook: Order updated - ${shopifyOrder.id}`);

        // Find store by domain (try multiple possible field names)
        const shopDomain = shopifyOrder.shop_domain || shopifyOrder.shop_domain || shopifyOrder.domain;
        const store = await prisma.store.findFirst({
            where: {
                domain: shopDomain,
                platform: 'SHOPIFY'
            }
        });

        if (!store) {
            logger.error(`Store not found for domain: ${shopDomain}`);

            // Try to find any Shopify store as fallback
            const fallbackStore = await prisma.store.findFirst({
                where: { platform: 'SHOPIFY' }
            });

            if (fallbackStore) {
                logger.info(`Using fallback store: ${fallbackStore.domain}`);
                const order = await shopifyService.syncOrder(fallbackStore.id, shopifyOrder.id);
                logger.info(`Synced updated order: ${order.id}`);
                res.status(200).send('OK');
                return;
            }

            return res.status(404).send('Store not found');
        }

        // Sync the updated order
        const order = await shopifyService.syncOrder(store.id, shopifyOrder.id);

        logger.info(`Synced updated order: ${order.id}`);
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling order update webhook:', error);
        logger.error('Error stack:', error.stack);
        res.status(500).send('Error');
    }
});

// Handle product creation webhook
router.post('/webhooks/products/create', async(req, res) => {
    try {
        const shopifyProduct = req.body;
        logger.info(`Webhook: Product created - ${shopifyProduct.id}`);

        // Find store by domain
        const store = await prisma.store.findFirst({
            where: {
                domain: shopifyProduct.shop_domain,
                platform: 'SHOPIFY'
            }
        });

        if (!store) {
            logger.error(`Store not found for domain: ${shopifyProduct.shop_domain}`);
            return res.status(404).send('Store not found');
        }

        // Sync the new product
        const product = await shopifyService.syncProduct(store.id, shopifyProduct.id);

        logger.info(`Synced new product: ${product.id}`);
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling product creation webhook:', error);
        res.status(500).send('Error');
    }
});

// Handle product update webhook
router.post('/webhooks/products/update', async(req, res) => {
    try {
        const shopifyProduct = req.body;
        logger.info(`Webhook: Product updated - ${shopifyProduct.id}`);

        // Find store by domain
        const store = await prisma.store.findFirst({
            where: {
                domain: shopifyProduct.shop_domain,
                platform: 'SHOPIFY'
            }
        });

        if (!store) {
            logger.error(`Store not found for domain: ${shopifyProduct.shop_domain}`);
            return res.status(404).send('Store not found');
        }

        // Sync the updated product
        const product = await shopifyService.syncProduct(store.id, shopifyProduct.id);

        logger.info(`Synced updated product: ${product.id}`);
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling product update webhook:', error);
        res.status(500).send('Error');
    }
});

// Handle cart creation webhook (Shopify doesn't have cart webhooks, but we'll handle it)
router.post('/webhooks/carts/create', async(req, res) => {
    try {
        const shopifyCart = req.body;
        logger.info(`Webhook: Cart created - ${shopifyCart.id}`);
        logger.info(`Note: Shopify doesn't send cart webhooks, this is for testing`);

        // For now, just acknowledge the webhook
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling cart creation webhook:', error);
        res.status(500).send('Error');
    }
});

// Handle cart update webhook (Shopify doesn't have cart webhooks, but we'll handle it)
router.post('/webhooks/carts/update', async(req, res) => {
    try {
        const shopifyCart = req.body;
        logger.info(`Webhook: Cart updated - ${shopifyCart.id}`);
        logger.info(`Note: Shopify doesn't send cart webhooks, this is for testing`);

        // For now, just acknowledge the webhook
        res.status(200).send('OK');
    } catch (error) {
        logger.error('Error handling cart update webhook:', error);
        res.status(500).send('Error');
    }
});

// ========================================
// EXISTING ROUTES
// ========================================

// Test Shopify connection
router.get('/test-connection/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params;
        const result = await shopifyService.testConnection(storeId);
        res.json(result);
    } catch (error) {
        logger.error('Error testing Shopify connection:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync products from Shopify
router.post('/sync-products/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params;
        const { limit = 50 } = req.body;

        const products = await shopifyService.syncProducts(storeId, limit);
        res.json({
            success: true,
            count: products.length,
            products: products.slice(0, 5) // Return first 5 for preview
        });
    } catch (error) {
        logger.error('Error syncing products:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sync orders from Shopify
router.post('/sync-orders/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params;
        const { limit = 50 } = req.body;

        const orders = await shopifyService.syncOrders(storeId, limit);
        res.json({
            success: true,
            count: orders.length,
            orders: orders.slice(0, 5) // Return first 5 for preview
        });
    } catch (error) {
        logger.error('Error syncing orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get store statistics
router.get('/stats/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params;
        const stats = await shopifyService.getStoreStats(storeId);
        res.json(stats);
    } catch (error) {
        logger.error('Error getting store stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Set up webhooks for real-time sync
router.post('/setup-webhooks/:storeId', async(req, res) => {
    try {
        const { storeId } = req.params;
        const { webhookUrl } = req.body;

        if (!webhookUrl) {
            return res.status(400).json({
                error: 'webhookUrl is required'
            });
        }

        await shopifyService.setupWebhooks(storeId, webhookUrl);

        res.json({
            success: true,
            message: 'Webhooks set up successfully',
            webhookUrl
        });
    } catch (error) {
        logger.error('Error setting up webhooks:', error);
        res.status(500).json({ error: error.message });
    }
});

// List all stores
router.get('/stores', async(req, res) => {
    try {
        const stores = await prisma.store.findMany({
            where: { platform: 'SHOPIFY' },
            include: {
                workspace: {
                    select: { name: true, slug: true }
                }
            }
        });

        res.json({
            success: true,
            count: stores.length,
            stores: stores.map(store => ({
                id: store.id,
                name: store.name,
                domain: store.domain,
                workspace: store.workspace.name,
                createdAt: store.createdAt
            }))
        });
    } catch (error) {
        logger.error('Error listing stores:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new store
router.post('/stores', async(req, res) => {
    try {
        const { workspaceId, name, domain, accessToken } = req.body;

        if (!workspaceId || !name || !domain || !accessToken) {
            return res.status(400).json({
                error: 'Missing required fields: workspaceId, name, domain, accessToken'
            });
        }

        const store = await prisma.store.create({
            data: {
                workspaceId,
                name,
                domain,
                platform: 'SHOPIFY',
                accessToken,
                settings: {
                    syncProducts: true,
                    syncOrders: true,
                    syncCustomers: true
                }
            }
        });

        res.json({
            success: true,
            store: {
                id: store.id,
                name: store.name,
                domain: store.domain,
                createdAt: store.createdAt
            }
        });
    } catch (error) {
        logger.error('Error creating store:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;