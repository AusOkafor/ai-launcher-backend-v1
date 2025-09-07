import Shopify from 'shopify-api-node';
import { logger } from '../utils/logger.js';
import { prisma } from '../db.js';

class ShopifyService {
    constructor() {
        this.clients = new Map(); // Store Shopify clients per workspace
    }

    // Initialize Shopify client for a store
    async initializeClient(store) {
        try {
            if (!store.accessToken) {
                throw new Error('Store access token not found');
            }

            const client = new Shopify({
                shopName: store.domain.replace('.myshopify.com', ''),
                accessToken: store.accessToken,
                apiVersion: '2024-01', // Use latest stable version
            });

            this.clients.set(store.id, client);
            logger.info(`Shopify client initialized for store: ${store.id}`);
            return client;
        } catch (error) {
            logger.error('Error initializing Shopify client:', error);
            throw error;
        }
    }

    // Get or create Shopify client for a store
    async getClient(storeId) {
        if (this.clients.has(storeId)) {
            return this.clients.get(storeId);
        }

        const store = await prisma.store.findUnique({
            where: { id: storeId },
        });

        if (!store) {
            throw new Error(`Store not found: ${storeId}`);
        }

        return await this.initializeClient(store);
    }

    // Get or create Shopify client for a connection
    async getClientFromConnection(connectionId) {
        if (this.clients.has(connectionId)) {
            return this.clients.get(connectionId);
        }

        const connection = await prisma.shopifyConnection.findUnique({
            where: { id: connectionId },
        });

        if (!connection) {
            throw new Error(`Shopify connection not found: ${connectionId}`);
        }

        if (!connection.accessToken) {
            throw new Error('Store access token not found');
        }

        const client = new Shopify({
            shopName: connection.shop.replace('.myshopify.com', ''),
            accessToken: connection.accessToken,
            apiVersion: '2024-01',
        });

        this.clients.set(connectionId, client);
        logger.info(`Shopify client initialized for connection: ${connectionId}`);
        return client;
    }

    // ========================================
    // PRODUCT OPERATIONS
    // ========================================

    async syncProducts(storeId, limit = 250) {
        try {
            const client = await this.getClient(storeId);
            const syncedProducts = [];

            // Get all products with a higher limit
            const products = await client.product.list({
                limit: limit
            });

            logger.info(`Fetched ${products.length} products from Shopify API`);

            for (const shopifyProduct of products) {
                const product = await this._syncProduct(storeId, shopifyProduct);
                syncedProducts.push(product);
            }

            logger.info(`Synced ${syncedProducts.length} products for store: ${storeId}`);
            return syncedProducts;
        } catch (error) {
            logger.error('Error syncing products:', error);
            throw error;
        }
    }

    async syncProduct(storeId, shopifyProductId) {
        try {
            const client = await this.getClient(storeId);
            const shopifyProduct = await client.product.get(shopifyProductId);

            const product = await this._syncProduct(storeId, shopifyProduct);
            logger.info(`Synced product: ${product.id}`);
            return product;
        } catch (error) {
            logger.error('Error syncing product:', error);
            throw error;
        }
    }

    async _syncProduct(storeId, shopifyProduct) {
        try {
            // Check if product already exists
            const firstVariant = shopifyProduct.variants && shopifyProduct.variants[0];
            const existingProduct = await prisma.product.findFirst({
                where: {
                    storeId,
                    sku: firstVariant && firstVariant.sku || null,
                },
            });

            const productData = {
                storeId,
                title: shopifyProduct.title,
                description: shopifyProduct.body_html,
                category: shopifyProduct.product_type,
                brand: shopifyProduct.vendor,
                price: parseFloat(firstVariant && firstVariant.price || 0),
                sku: firstVariant && firstVariant.sku,
                images: shopifyProduct.images.map(img => img.src),
                attributes: {
                    shopifyId: shopifyProduct.id,
                    handle: shopifyProduct.handle,
                    tags: shopifyProduct.tags,
                    vendor: shopifyProduct.vendor,
                    productType: shopifyProduct.product_type,
                    publishedAt: shopifyProduct.published_at,
                },
                status: shopifyProduct.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            };

            if (existingProduct) {
                // Update existing product
                const updatedProduct = await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: productData,
                });

                // Sync variants
                await this._syncVariants(existingProduct.id, shopifyProduct.variants);
                return updatedProduct;
            } else {
                // Create new product
                const newProduct = await prisma.product.create({
                    data: productData,
                });

                // Sync variants
                await this._syncVariants(newProduct.id, shopifyProduct.variants);
                return newProduct;
            }
        } catch (error) {
            logger.error('Error syncing product to database:', error);
            throw error;
        }
    }

    async _syncVariants(productId, shopifyVariants) {
        try {
            // Delete existing variants
            await prisma.variant.deleteMany({
                where: { productId },
            });

            // Create new variants
            for (const shopifyVariant of shopifyVariants) {
                await prisma.variant.create({
                    data: {
                        productId,
                        options: {
                            title: shopifyVariant.title,
                            sku: shopifyVariant.sku,
                            barcode: shopifyVariant.barcode,
                            weight: shopifyVariant.weight,
                            weightUnit: shopifyVariant.weight_unit,
                        },
                        price: parseFloat(shopifyVariant.price),
                        stock: shopifyVariant.inventory_quantity || 0,
                        sku: shopifyVariant.sku,
                    },
                });
            }
        } catch (error) {
            logger.error('Error syncing variants:', error);
            throw error;
        }
    }

    async createProduct(storeId, productData) {
        try {
            const client = await this.getClient(storeId);

            const shopifyProduct = await client.product.create({
                title: productData.title,
                body_html: productData.description,
                vendor: productData.brand,
                product_type: productData.category,
                tags: productData.tags || [],
                variants: [{
                    price: productData.price.toString(),
                    sku: productData.sku,
                    inventory_quantity: productData.stock || 0,
                }],
                images: productData.images && productData.images.map(url => ({ src: url })) || [],
            });

            // Sync the created product to our database
            const product = await this._syncProduct(storeId, shopifyProduct);
            logger.info(`Created product in Shopify: ${product.id}`);
            return product;
        } catch (error) {
            logger.error('Error creating product in Shopify:', error);
            throw error;
        }
    }

    async updateProduct(storeId, productId, updates) {
        try {
            const client = await this.getClient(storeId);

            // Get the product from our database to get Shopify ID
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error(`Product not found: ${productId}`);
            }

            const shopifyId = product.attributes && product.attributes.shopifyId;
            if (!shopifyId) {
                throw new Error('Product not synced with Shopify');
            }

            const shopifyUpdates = {};
            if (updates.title) shopifyUpdates.title = updates.title;
            if (updates.description) shopifyUpdates.body_html = updates.description;
            if (updates.brand) shopifyUpdates.vendor = updates.brand;
            if (updates.category) shopifyUpdates.product_type = updates.category;

            const updatedShopifyProduct = await client.product.update(shopifyId, shopifyUpdates);

            // Sync the updated product to our database
            const updatedProduct = await this._syncProduct(storeId, updatedShopifyProduct);
            logger.info(`Updated product in Shopify: ${productId}`);
            return updatedProduct;
        } catch (error) {
            logger.error('Error updating product in Shopify:', error);
            throw error;
        }
    }

    // ========================================
    // ORDER OPERATIONS
    // ========================================

    async syncOrders(storeId, limit = 50) {
        try {
            const client = await this.getClient(storeId);
            const orders = await client.order.list({ limit, status: 'any' });

            const syncedOrders = [];

            for (const shopifyOrder of orders) {
                const order = await this._syncOrder(storeId, shopifyOrder);
                syncedOrders.push(order);
            }

            logger.info(`Synced ${syncedOrders.length} orders for store: ${storeId}`);
            return syncedOrders;
        } catch (error) {
            logger.error('Error syncing orders:', error);
            throw error;
        }
    }

    async syncOrder(storeId, shopifyOrderId) {
        try {
            const client = await this.getClient(storeId);
            const shopifyOrder = await client.order.get(shopifyOrderId);

            const order = await this._syncOrder(storeId, shopifyOrder);
            logger.info(`Synced order: ${order.id}`);
            return order;
        } catch (error) {
            logger.error('Error syncing order:', error);
            throw error;
        }
    }

    async _syncOrder(storeId, shopifyOrder) {
        try {
            // Check if order already exists
            const existingOrder = await prisma.order.findFirst({
                where: {
                    storeId,
                    metadata: {
                        path: ['shopifyId'],
                        equals: shopifyOrder.id,
                    },
                },
            });

            // Find or create customer
            let customer = null;
            if (shopifyOrder.customer) {
                customer = await this._syncCustomer(storeId, shopifyOrder.customer);
            }

            const orderData = {
                storeId,
                customerId: customer && customer.id,
                items: shopifyOrder.line_items.map(item => ({
                    id: item.id,
                    title: item.title,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    sku: item.sku,
                })),
                total: parseFloat(shopifyOrder.total_price),
                status: this._mapOrderStatus(shopifyOrder.financial_status),
                metadata: {
                    shopifyId: shopifyOrder.id,
                    orderNumber: shopifyOrder.order_number,
                    financialStatus: shopifyOrder.financial_status,
                    fulfillmentStatus: shopifyOrder.fulfillment_status,
                    currency: shopifyOrder.currency,
                    subtotalPrice: shopifyOrder.subtotal_price,
                    totalTax: shopifyOrder.total_tax,
                    totalDiscounts: shopifyOrder.total_discounts,
                },
            };

            let order;
            if (existingOrder) {
                order = await prisma.order.update({
                    where: { id: existingOrder.id },
                    data: orderData,
                });
            } else {
                order = await prisma.order.create({
                    data: orderData,
                });
            }

            // Mark any associated cart as converted (for cart recovery tracking)
            if (customer && customer.email) {
                const recentCart = await prisma.cart.findFirst({
                    where: {
                        storeId: storeId,
                        customerId: customer.id,
                        status: { in: ['ACTIVE', 'CHECKOUT_STARTED', 'ABANDONED'] },
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                if (recentCart) {
                    await prisma.cart.update({
                        where: { id: recentCart.id },
                        data: {
                            status: 'CONVERTED',
                            metadata: JSON.stringify({
                                ...JSON.parse(recentCart.metadata || '{}'),
                                convertedOrderId: order.id,
                                convertedAt: new Date().toISOString()
                            })
                        }
                    });
                    logger.info(`✅ Cart ${recentCart.id} marked as converted for order ${order.id}`);
                }
            }

            return order;
        } catch (error) {
            logger.error('Error syncing order to database:', error);
            throw error;
        }
    }

    // ========================================
    // CUSTOMER OPERATIONS
    // ========================================

    async syncCustomers(storeId, limit = 250) {
        try {
            const client = await this.getClient(storeId);
            const customers = await client.customer.list({ limit });

            const syncedCustomers = [];

            for (const shopifyCustomer of customers) {
                const customer = await this._syncCustomer(storeId, shopifyCustomer);
                syncedCustomers.push(customer);
            }

            logger.info(`Synced ${syncedCustomers.length} customers for store: ${storeId}`);
            return syncedCustomers;
        } catch (error) {
            logger.error('Error syncing customers:', error);
            throw error;
        }
    }

    async syncCustomer(storeId, shopifyCustomerId) {
        try {
            const client = await this.getClient(storeId);
            const shopifyCustomer = await client.customer.get(shopifyCustomerId);

            const customer = await this._syncCustomer(storeId, shopifyCustomer);
            logger.info(`Synced customer: ${customer.id}`);
            return customer;
        } catch (error) {
            logger.error('Error syncing customer:', error);
            throw error;
        }
    }

    async _syncCustomer(storeId, shopifyCustomer) {
        try {
            // Check if customer already exists
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    storeId,
                    email: shopifyCustomer.email,
                },
            });

            const customerData = {
                storeId,
                email: shopifyCustomer.email,
                phone: shopifyCustomer.phone,
                firstName: shopifyCustomer.first_name,
                lastName: shopifyCustomer.last_name,
                country: shopifyCustomer.default_address && shopifyCustomer.default_address.country,
                traits: {
                    shopifyId: shopifyCustomer.id,
                    acceptsMarketing: shopifyCustomer.accepts_marketing,
                    verifiedEmail: shopifyCustomer.verified_email,
                    totalSpent: shopifyCustomer.total_spent,
                    ordersCount: shopifyCustomer.orders_count,
                    tags: shopifyCustomer.tags,
                    note: shopifyCustomer.note,
                    createdAt: shopifyCustomer.created_at,
                    updatedAt: shopifyCustomer.updated_at,
                },
            };

            if (existingCustomer) {
                return await prisma.customer.update({
                    where: { id: existingCustomer.id },
                    data: customerData,
                });
            } else {
                return await prisma.customer.create({
                    data: customerData,
                });
            }
        } catch (error) {
            logger.error('Error syncing customer to database:', error);
            throw error;
        }
    }

    // ========================================
    // COMPREHENSIVE SYNC OPERATIONS
    // ========================================

    async syncAll(storeId) {
        try {
            logger.info(`Starting comprehensive sync for store: ${storeId}`);

            const results = {
                products: [],
                orders: [],
                customers: [],
                summary: {
                    startTime: new Date(),
                    endTime: null,
                    totalProducts: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    errors: []
                }
            };

            try {
                results.products = await this.syncProducts(storeId);
                results.summary.totalProducts = results.products.length;
            } catch (error) {
                logger.error('Error syncing products:', error);
                results.summary.errors.push({ type: 'products', error: error.message });
            }

            try {
                results.orders = await this.syncOrders(storeId);
                results.summary.totalOrders = results.orders.length;
            } catch (error) {
                logger.error('Error syncing orders:', error);
                results.summary.errors.push({ type: 'orders', error: error.message });
            }

            try {
                results.customers = await this.syncCustomers(storeId);
                results.summary.totalCustomers = results.customers.length;
            } catch (error) {
                logger.error('Error syncing customers:', error);
                results.summary.errors.push({ type: 'customers', error: error.message });
            }

            results.summary.endTime = new Date();
            results.summary.duration = results.summary.endTime - results.summary.startTime;

            logger.info(`Comprehensive sync completed for store: ${storeId}`, {
                products: results.summary.totalProducts,
                orders: results.summary.totalOrders,
                customers: results.summary.totalCustomers,
                duration: results.summary.duration,
                errors: results.summary.errors.length
            });

            return results;
        } catch (error) {
            logger.error('Error in comprehensive sync:', error);
            throw error;
        }
    }

    // ========================================
    // INVENTORY OPERATIONS
    // ========================================

    async updateInventory(storeId, productId, variantId, quantity) {
        try {
            const client = await this.getClient(storeId);

            // Get the product from our database to get Shopify IDs
            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: { variants: true },
            });

            if (!product) {
                throw new Error(`Product not found: ${productId}`);
            }

            const shopifyProductId = product.attributes && product.attributes.shopifyId;
            const variant = product.variants.find(v => v.id === variantId);

            if (!shopifyProductId || !variant) {
                throw new Error('Product or variant not synced with Shopify');
            }

            // Update inventory in Shopify
            await client.inventoryLevel.set({
                inventory_item_id: variant.sku, // This should be the inventory item ID
                location_id: 1, // Default location ID
                available: quantity,
            });

            // Update in our database
            await prisma.variant.update({
                where: { id: variantId },
                data: { stock: quantity },
            });

            logger.info(`Updated inventory for variant: ${variantId}`);
        } catch (error) {
            logger.error('Error updating inventory:', error);
            throw error;
        }
    }

    // ========================================
    // WEBHOOK OPERATIONS
    // ========================================

    async setupWebhooks(storeId, webhookUrl) {
        try {
            const client = await this.getClient(storeId);

            const webhooks = [{
                    topic: 'products/create',
                    address: `${webhookUrl}/shopify/products/create`,
                    format: 'json',
                },
                {
                    topic: 'products/update',
                    address: `${webhookUrl}/shopify/products/update`,
                    format: 'json',
                },
                {
                    topic: 'orders/create',
                    address: `${webhookUrl}/shopify/orders/create`,
                    format: 'json',
                },
                {
                    topic: 'orders/updated',
                    address: `${webhookUrl}/shopify/orders/updated`,
                    format: 'json',
                },
                {
                    topic: 'customers/create',
                    address: `${webhookUrl}/shopify/customers/create`,
                    format: 'json',
                },
                {
                    topic: 'customers/update',
                    address: `${webhookUrl}/shopify/customers/update`,
                    format: 'json',
                },
                {
                    topic: 'checkouts/create',
                    address: `${webhookUrl}/shopify/checkouts/create`,
                    format: 'json',
                },
                {
                    topic: 'checkouts/update',
                    address: `${webhookUrl}/shopify/checkouts/update`,
                    format: 'json',
                },
            ];

            for (const webhook of webhooks) {
                try {
                    await client.webhook.create(webhook);
                    logger.info(`Created webhook: ${webhook.topic}`);
                } catch (error) {
                    if (error.statusCode === 422) {
                        logger.warn(`Webhook already exists: ${webhook.topic}`);
                    } else {
                        logger.error(`Error creating webhook ${webhook.topic}:`, error);
                    }
                }
            }
        } catch (error) {
            logger.error('Error setting up webhooks:', error);
            throw error;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    _mapOrderStatus(shopifyStatus) {
        const statusMap = {
            'pending': 'PENDING',
            'authorized': 'CONFIRMED',
            'paid': 'CONFIRMED',
            'partially_paid': 'CONFIRMED',
            'refunded': 'RETURNED',
            'voided': 'CANCELLED',
            'partially_refunded': 'CONFIRMED',
            'unpaid': 'PENDING',
        };

        return statusMap[shopifyStatus] || 'PENDING';
    }

    async getStoreStats(storeId) {
        try {
            logger.info(`Getting store stats from database for store: ${storeId}`);

            // Count from local database instead of Shopify API
            const [products, orders, customers] = await Promise.all([
                prisma.product.count({ where: { storeId } }),
                prisma.order.count({ where: { storeId } }),
                prisma.customer.count({ where: { storeId } }),
            ]);

            // Calculate total revenue from local orders
            let totalRevenue = 0;
            try {
                const orderTotals = await prisma.order.aggregate({
                    where: { storeId },
                    _sum: { total: true }
                });
                totalRevenue = orderTotals._sum.total || 0;
            } catch (revenueError) {
                logger.warn('Could not calculate revenue from database:', revenueError.message);
            }

            logger.info(`Store ${storeId} stats from database:`, {
                products,
                orders,
                customers,
                totalRevenue
            });

            return {
                success: true,
                data: {
                    totalProducts: products,
                    totalOrders: orders,
                    totalCustomers: customers,
                    totalRevenue: parseFloat(totalRevenue) || 0,
                    lastSync: new Date().toISOString(),
                }
            };
        } catch (error) {
            logger.error('Error getting store stats from database:', error);
            return {
                success: false,
                error: error.message,
                data: {
                    totalProducts: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    totalRevenue: 0,
                    lastSync: null,
                }
            };
        }
    }

    async testConnection(storeId) {
        try {
            const client = await this.getClient(storeId);
            const shop = await client.shop.get();

            return {
                connected: true,
                shopName: shop.name,
                shopDomain: shop.domain,
                email: shop.email,
                currency: shop.currency,
            };
        } catch (error) {
            logger.error('Error testing Shopify connection:', error);
            return {
                connected: false,
                error: error.message,
            };
        }
    }

    // ========================================
    // CONNECTION-BASED SYNC METHODS
    // ========================================

    async syncProductsFromConnection(connectionId, limit = 250) {
        try {
            const client = await this.getClientFromConnection(connectionId);
            const connection = await prisma.shopifyConnection.findUnique({
                where: { id: connectionId }
            });

            // Create or get store record for this connection
            let store = await prisma.store.findFirst({
                where: { domain: connection.shop }
            });

            if (!store) {
                store = await prisma.store.create({
                    data: {
                        name: connection.shopName || connection.shop,
                        domain: connection.shop,
                        platform: 'SHOPIFY',
                        workspaceId: connection.workspaceId,
                        status: 'ACTIVE'
                    }
                });

                // Update connection with store ID
                await prisma.shopifyConnection.update({
                    where: { id: connectionId },
                    data: { storeId: store.id }
                });
            }

            const syncedProducts = [];
            const products = await client.product.list({ limit });

            logger.info(`Fetched ${products.length} products from Shopify API for connection: ${connectionId}`);

            for (const shopifyProduct of products) {
                const product = await this._syncProduct(store.id, shopifyProduct);
                syncedProducts.push(product);
            }

            logger.info(`Synced ${syncedProducts.length} products for connection: ${connectionId}`);
            return syncedProducts;
        } catch (error) {
            logger.error('Error syncing products from connection:', error);
            throw error;
        }
    }

    async syncOrdersFromConnection(connectionId, limit = 50) {
        try {
            const client = await this.getClientFromConnection(connectionId);
            const connection = await prisma.shopifyConnection.findUnique({
                where: { id: connectionId }
            });

            // Create or get store record for this connection
            let store = await prisma.store.findFirst({
                where: { domain: connection.shop }
            });

            if (!store) {
                store = await prisma.store.create({
                    data: {
                        name: connection.shopName || connection.shop,
                        domain: connection.shop,
                        platform: 'SHOPIFY',
                        workspaceId: connection.workspaceId,
                        status: 'ACTIVE'
                    }
                });

                // Update connection with store ID
                await prisma.shopifyConnection.update({
                    where: { id: connectionId },
                    data: { storeId: store.id }
                });
            }

            const orders = await client.order.list({ limit, status: 'any' });
            const syncedOrders = [];

            for (const shopifyOrder of orders) {
                const order = await this._syncOrder(store.id, shopifyOrder);
                syncedOrders.push(order);
            }

            logger.info(`Synced ${syncedOrders.length} orders for connection: ${connectionId}`);
            return syncedOrders;
        } catch (error) {
            logger.error('Error syncing orders from connection:', error);
            throw error;
        }
    }

    async syncCustomersFromConnection(connectionId, limit = 250) {
        try {
            const client = await this.getClientFromConnection(connectionId);
            const connection = await prisma.shopifyConnection.findUnique({
                where: { id: connectionId }
            });

            // Create or get store record for this connection
            let store = await prisma.store.findFirst({
                where: { domain: connection.shop }
            });

            if (!store) {
                store = await prisma.store.create({
                    data: {
                        name: connection.shopName || connection.shop,
                        domain: connection.shop,
                        platform: 'SHOPIFY',
                        workspaceId: connection.workspaceId,
                        status: 'ACTIVE'
                    }
                });

                // Update connection with store ID
                await prisma.shopifyConnection.update({
                    where: { id: connectionId },
                    data: { storeId: store.id }
                });
            }

            const customers = await client.customer.list({ limit });
            const syncedCustomers = [];

            for (const shopifyCustomer of customers) {
                const customer = await this._syncCustomer(store.id, shopifyCustomer);
                syncedCustomers.push(customer);
            }

            logger.info(`Synced ${syncedCustomers.length} customers for connection: ${connectionId}`);
            return syncedCustomers;
        } catch (error) {
            logger.error('Error syncing customers from connection:', error);
            throw error;
        }
    }

    async syncAllFromConnection(connectionId) {
        try {
            logger.info(`Starting comprehensive sync for connection: ${connectionId}`);

            const results = {
                products: [],
                orders: [],
                customers: [],
                summary: {
                    startTime: new Date(),
                    endTime: null,
                    totalProducts: 0,
                    totalOrders: 0,
                    totalCustomers: 0,
                    errors: []
                }
            };

            try {
                results.products = await this.syncProductsFromConnection(connectionId);
                results.summary.totalProducts = results.products.length;
            } catch (error) {
                logger.error('Error syncing products from connection:', error);
                results.summary.errors.push({ type: 'products', error: error.message });
            }

            try {
                results.orders = await this.syncOrdersFromConnection(connectionId);
                results.summary.totalOrders = results.orders.length;
            } catch (error) {
                logger.error('Error syncing orders from connection:', error);
                results.summary.errors.push({ type: 'orders', error: error.message });
            }

            try {
                results.customers = await this.syncCustomersFromConnection(connectionId);
                results.summary.totalCustomers = results.customers.length;
            } catch (error) {
                logger.error('Error syncing customers from connection:', error);
                results.summary.errors.push({ type: 'customers', error: error.message });
            }

            results.summary.endTime = new Date();
            results.summary.duration = results.summary.endTime - results.summary.startTime;

            logger.info(`Comprehensive sync completed for connection: ${connectionId}`, {
                products: results.summary.totalProducts,
                orders: results.summary.totalOrders,
                customers: results.summary.totalCustomers,
                duration: results.summary.duration,
                errors: results.summary.errors.length
            });

            return results;
        } catch (error) {
            logger.error('Error in comprehensive sync from connection:', error);
            throw error;
        }
    }
}

export const shopifyService = new ShopifyService();