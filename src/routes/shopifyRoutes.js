import express from 'express';
import { shopifyService } from '../services/shopify.js';
import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

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
        const defaultScopes = 'read_products,write_products,read_orders,write_orders,read_customers,write_customers';
        const scopes = process.env.SHOPIFY_SCOPES || defaultScopes;

        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

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

        // Create or update the corresponding store record
        let store = await prisma.store.findFirst({
            where: { domain: shop }
        });

        if (!store) {
            store = await prisma.store.create({
                data: {
                    name: shopInfo.name,
                    domain: shop,
                    platform: 'SHOPIFY',
                    workspaceId: workspaceId,
                    status: 'ACTIVE',
                    accessToken: access_token,
                    settings: {
                        syncProducts: true,
                        syncOrders: true,
                        syncCustomers: true
                    }
                }
            });
            logger.info(`Store record created: ${store.id}`);
        } else {
            // Update existing store with new access token
            await prisma.store.update({
                where: { id: store.id },
                data: { accessToken: access_token }
            });
            logger.info(`Store record updated: ${store.id}`);
        }

        // Update the connection with the store ID
        await prisma.shopifyConnection.update({
            where: { id: connection.id },
            data: { storeId: store.id }
        });

        logger.info(`Connection ${connection.id} linked to store ${store.id}`);

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
                updatedAt: true,
                storeId: true,
                store: {
                    select: {
                        id: true,
                        name: true,
                        domain: true
                    }
                }
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

// Handle checkout creation webhook
router.post('/webhooks/checkouts/create', async(req, res) => {
    try {
        const shopifyCheckout = req.body;
        logger.info(`Webhook: Checkout created - ${shopifyCheckout.id}`);
        logger.info(`Checkout payload: ${JSON.stringify(shopifyCheckout, null, 2)}`);

        if (!shopifyCheckout || !shopifyCheckout.id) {
            logger.error('Invalid checkout webhook payload - missing checkout ID');
            return res.status(400).send('Invalid webhook payload');
        }

        // Find store by domain
        const shopDomain = shopifyCheckout.shop_domain || shopifyCheckout.domain;
        logger.info(`Shop domain from checkout webhook: ${shopDomain || 'NOT_FOUND'}`);

        const store = await prisma.store.findFirst({
            where: {
                domain: shopDomain,
                platform: 'SHOPIFY'
            }
        });

        if (!store) {
            logger.error(`Store not found for domain: ${shopDomain}`);
            return res.status(200).send('Store not found, but webhook acknowledged');
        }

        // Extract customer information
        const customerEmail = shopifyCheckout.email;
        const customerPhone = shopifyCheckout.phone;
        const billingAddress = shopifyCheckout.billing_address;
        const shippingAddress = shopifyCheckout.shipping_address;

        // Create or find customer
        let customer = null;
        if (customerEmail) {
            customer = await prisma.customer.findFirst({
                where: {
                    storeId: store.id,
                    email: customerEmail
                }
            });

            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        storeId: store.id,
                        shopifyId: shopifyCheckout.customer_id ? shopifyCheckout.customer_id.toString() : null,
                        email: customerEmail,
                        phone: customerPhone,
                        firstName: billingAddress && billingAddress.first_name,
                        lastName: billingAddress && billingAddress.last_name,
                        city: billingAddress && billingAddress.city,
                        state: billingAddress && billingAddress.province,
                        zipCode: billingAddress && billingAddress.zip,
                        address: billingAddress && `${billingAddress.address1 || ''} ${billingAddress.address2 || ''}`.trim()
                    }
                });
            }
        }

        // Create cart record
        const cartData = {
            storeId: store.id,
            customerId: customer && customer.id,
            shopifyCartId: shopifyCheckout.id.toString(),
            status: 'CHECKOUT_STARTED',
            items: JSON.stringify(shopifyCheckout.line_items || []),
            total: parseFloat(shopifyCheckout.total_price || '0'),
            currency: shopifyCheckout.currency || 'USD',
            metadata: JSON.stringify({
                checkoutToken: shopifyCheckout.token,
                checkoutUrl: shopifyCheckout.checkout_url,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                source: 'shopify_webhook'
            })
        };

        const cart = await prisma.cart.create({
            data: cartData
        });

        logger.info(`✅ Checkout tracked: ${cart.id} for customer ${customerEmail || 'guest'}`);
        res.status(200).send('OK');

    } catch (error) {
        logger.error('Error handling checkout creation webhook:', error);
        res.status(500).send('Error');
    }
});

// Handle checkout update webhook
router.post('/webhooks/checkouts/update', async(req, res) => {
    try {
        const shopifyCheckout = req.body;
        logger.info(`Webhook: Checkout updated - ${shopifyCheckout.id}`);

        if (!shopifyCheckout || !shopifyCheckout.id) {
            logger.error('Invalid checkout update webhook payload - missing checkout ID');
            return res.status(400).send('Invalid webhook payload');
        }

        // Find existing cart by shopify checkout ID
        const existingCart = await prisma.cart.findFirst({
            where: {
                shopifyCartId: shopifyCheckout.id.toString()
            }
        });

        if (existingCart) {
            // Update cart with new information
            await prisma.cart.update({
                where: { id: existingCart.id },
                data: {
                    items: JSON.stringify(shopifyCheckout.line_items || []),
                    total: parseFloat(shopifyCheckout.total_price || '0'),
                    currency: shopifyCheckout.currency || 'USD',
                    metadata: JSON.stringify({
                        checkoutToken: shopifyCheckout.token,
                        checkoutUrl: shopifyCheckout.checkout_url,
                        customerEmail: shopifyCheckout.email,
                        customerPhone: shopifyCheckout.phone,
                        source: 'shopify_webhook',
                        lastUpdated: new Date().toISOString()
                    })
                }
            });

            logger.info(`✅ Checkout updated: ${existingCart.id}`);
        } else {
            logger.warn(`Checkout update received but no existing cart found for: ${shopifyCheckout.id}`);
        }

        res.status(200).send('OK');

    } catch (error) {
        logger.error('Error handling checkout update webhook:', error);
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

// ========================================
// STORE MANAGEMENT & SYNC ROUTES
// ========================================

// Get all connected stores for a workspace
router.get('/connections', async(req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required'
            });
        }

        const connections = await prisma.shopifyConnection.findMany({
            where: {
                workspaceId,
                status: 'ACTIVE'
            },
            include: {
                store: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: { connections }
        });
    } catch (error) {
        logger.error('Error fetching Shopify connections:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Shopify connections'
        });
    }
});

// Sync data from a specific Shopify store
router.post('/sync/:connectionId', async(req, res) => {
    try {
        const { connectionId } = req.params;
        const { syncType = 'all' } = req.body; // all, products, orders, customers

        // Get the connection
        const connection = await prisma.shopifyConnection.findUnique({
            where: { id: connectionId },
            include: { store: true }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: 'Shopify connection not found'
            });
        }

        if (connection.status !== 'ACTIVE') {
            return res.status(400).json({
                success: false,
                error: 'Connection is not active'
            });
        }

        // Initialize sync status
        const syncStatus = {
            connectionId,
            status: 'SYNCING',
            startedAt: new Date(),
            syncType,
            progress: 0,
            total: 0,
            synced: 0,
            errors: []
        };

        // Start sync process
        let syncResult;
        switch (syncType) {
            case 'products':
                syncResult = await shopifyService.syncProducts(connection.storeId);
                break;
            case 'orders':
                syncResult = await shopifyService.syncOrders(connection.storeId);
                break;
            case 'customers':
                syncResult = await shopifyService.syncCustomers(connection.storeId);
                break;
            case 'all':
            default:
                syncResult = await shopifyService.syncAll(connection.storeId);
                break;
        }

        // Update connection last sync time
        await prisma.shopifyConnection.update({
            where: { id: connectionId },
            data: {
                updatedAt: new Date(),
                // You could add a lastSyncAt field to track sync history
            }
        });

        res.json({
            success: true,
            data: {
                message: `Sync completed successfully for ${connection.shop}`,
                syncType,
                result: syncResult,
                connection: {
                    id: connection.id,
                    shop: connection.shop,
                    shopName: connection.shopName
                }
            }
        });

    } catch (error) {
        logger.error('Error syncing from Shopify:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync from Shopify',
            details: error.message
        });
    }
});

// Sync data from multiple stores
router.post('/sync-multiple', async(req, res) => {
    try {
        const { connectionIds, syncType = 'all' } = req.body;

        if (!connectionIds || !Array.isArray(connectionIds) || connectionIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Connection IDs array is required'
            });
        }

        const results = [];
        const errors = [];

        // Process each connection
        for (const connectionId of connectionIds) {
            try {
                const connection = await prisma.shopifyConnection.findUnique({
                    where: { id: connectionId },
                    include: { store: true }
                });

                if (!connection || connection.status !== 'ACTIVE') {
                    errors.push({
                        connectionId,
                        error: 'Connection not found or inactive'
                    });
                    continue;
                }

                // Perform sync using the connection directly
                let syncResult;
                try {
                    switch (syncType) {
                        case 'products':
                            syncResult = await shopifyService.syncProductsFromConnection(connection.id);
                            break;
                        case 'orders':
                            syncResult = await shopifyService.syncOrdersFromConnection(connection.id);
                            break;
                        case 'customers':
                            syncResult = await shopifyService.syncCustomersFromConnection(connection.id);
                            break;
                        case 'all':
                        default:
                            syncResult = await shopifyService.syncAllFromConnection(connection.id);
                            break;
                    }
                } catch (syncError) {
                    logger.error(`Error syncing connection ${connection.id}:`, syncError);
                    errors.push({
                        connectionId,
                        error: syncError.message
                    });
                    continue;
                }

                results.push({
                    connectionId,
                    shop: connection.shop,
                    shopName: connection.shopName,
                    success: true,
                    result: syncResult
                });

                // Update connection last sync time
                await prisma.shopifyConnection.update({
                    where: { id: connectionId },
                    data: { updatedAt: new Date() }
                });

            } catch (error) {
                logger.error(`Error syncing connection ${connectionId}:`, error);
                errors.push({
                    connectionId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                message: `Sync completed for ${results.length} stores`,
                syncType,
                results,
                errors,
                summary: {
                    total: connectionIds.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        logger.error('Error in multiple store sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync from multiple stores',
            details: error.message
        });
    }
});

// Get sync status and history
router.get('/sync-status/:connectionId', async(req, res) => {
    try {
        const { connectionId } = req.params;

        const connection = await prisma.shopifyConnection.findUnique({
            where: { id: connectionId }
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: 'Connection not found'
            });
        }

        // You could implement a sync history table to track detailed sync status
        // For now, return basic connection info
        res.json({
            success: true,
            data: {
                connectionId,
                shop: connection.shop,
                status: connection.status,
                lastSync: connection.updatedAt,
                isActive: connection.status === 'ACTIVE'
            }
        });

    } catch (error) {
        logger.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status'
        });
    }
});

export default router;