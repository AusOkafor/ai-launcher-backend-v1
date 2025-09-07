import { shopifyService } from './src/services/shopify.js';
import { prisma } from './src/db.js';
import { logger } from './src/utils/logger.js';

async function setupCheckoutWebhooks() {
    try {
        logger.info('🔗 Setting up Shopify checkout webhooks for cart recovery...');

        // Get all active Shopify connections
        const connections = await prisma.shopifyConnection.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                store: true
            }
        });

        if (connections.length === 0) {
            logger.error('❌ No active Shopify connections found.');
            return;
        }

        logger.info(`📦 Found ${connections.length} active Shopify connection(s)`);

        for (const connection of connections) {
            logger.info(`\n🏪 Setting up webhooks for: ${connection.shopName} (${connection.shop})`);

            try {
                // Use the shopify service but we need to manually create the client
                const client = await shopifyService.getClientFromConnection(connection.id);

                // Set up checkout-specific webhooks
                const checkoutWebhooks = [{
                        topic: 'checkouts/create',
                        address: `http://localhost:3000/api/shopify/webhooks/checkouts/create`,
                        format: 'json',
                    },
                    {
                        topic: 'checkouts/update',
                        address: `http://localhost:3000/api/shopify/webhooks/checkouts/update`,
                        format: 'json',
                    }
                ];

                for (const webhook of checkoutWebhooks) {
                    try {
                        await client.webhook.create(webhook);
                        logger.info(`✅ Created webhook: ${webhook.topic} -> ${webhook.address}`);
                    } catch (error) {
                        if (error.statusCode === 422) {
                            logger.warn(`⚠️ Webhook already exists: ${webhook.topic}`);
                        } else {
                            logger.error(`❌ Error creating webhook ${webhook.topic}:`, error.message);
                        }
                    }
                }

                logger.info(`✅ Webhooks setup completed for ${connection.shopName}`);

            } catch (error) {
                logger.error(`❌ Failed to setup webhooks for ${connection.shopName}:`, error.message);
            }
        }

        logger.info('\n🎯 Checkout tracking is now active!');
        logger.info('When customers start checkout in Shopify:');
        logger.info('   1. Shopify will send checkout/create webhook');
        logger.info('   2. Customer data will be captured automatically');
        logger.info('   3. Cart abandonment will be tracked via webhooks');
        logger.info('   4. No more JavaScript injection needed!');
        logger.info('\n📋 Webhook endpoints created:');
        logger.info('   - http://localhost:3000/api/shopify/webhooks/checkouts/create');
        logger.info('   - http://localhost:3000/api/shopify/webhooks/checkouts/update');
        logger.info('\n🚀 Your cart recovery system is ready!');

    } catch (error) {
        logger.error('❌ Failed to set up checkout webhooks:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setupCheckoutWebhooks();