import 'dotenv/config'
import { shopifyService } from './src/services/shopify.js';
import { prisma } from './src/db.js';
import { logger } from './src/utils/logger.js';

// Simple async wait helper
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generic retry helper with exponential backoff
async function withRetry(taskFn, label) {
    const maxAttempts = parseInt(process.env.DB_RETRY_ATTEMPTS || '8', 10);
    const baseDelayMs = parseInt(process.env.DB_RETRY_BASE_MS || '1000', 10);
    const maxDelayMs = parseInt(process.env.DB_RETRY_MAX_MS || '60000', 10);

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (label) {
                logger.info(`Attempt ${attempt}/${maxAttempts} for: ${label}`);
            }
            return await taskFn();
        } catch (error) {
            lastError = error;
            const message = error && (error.message || String(error));
            logger.warn(`Transient error on attempt ${attempt}/${maxAttempts}${label ? ` (${label})` : ''}: ${message}`);
			if (attempt === maxAttempts) break;
			const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
			logger.info(`Retrying in ${delay}ms...`);
			await wait(delay);
		}
	}
	throw lastError;
}

async function checkWebhookPermissions() {
    try {
        logger.info('🔍 Checking current webhook permissions...');

        // Get the first active connection
        const connection = await withRetry(
			() => prisma.shopifyConnection.findFirst({ where: { status: 'ACTIVE' } }),
			'fetch active Shopify connection'
		);

        if (!connection) {
            logger.error('❌ No active connections found');
            return;
        }

        logger.info(`📱 Testing with: ${connection.shopName} (${connection.shop})`);
        logger.info(`🔑 Current scopes: ${connection.scope}`);

        const client = await shopifyService.getClientFromConnection(connection.id);

        // List existing webhooks
        logger.info('\n📋 Current webhooks:');
        try {
            const existingWebhooks = await client.webhook.list();
            if (existingWebhooks.length === 0) {
                logger.info('   No webhooks currently configured');
            } else {
                existingWebhooks.forEach(webhook => {
                    logger.info(`   ✅ ${webhook.topic} -> ${webhook.address}`);
                });
            }
        } catch (error) {
            logger.error(`❌ Error listing webhooks: ${error.message}`);
        }

        // Test webhook creation with current scopes
        logger.info('\n🧪 Testing webhook creation capabilities:');

        const testWebhooks = [
            { topic: 'orders/create', name: 'Order Create' },
            { topic: 'orders/updated', name: 'Order Update' },
            { topic: 'carts/create', name: 'Cart Create' },
            { topic: 'carts/update', name: 'Cart Update' }
        ];

        for (const test of testWebhooks) {
            try {
                // Try to create a test webhook (we'll delete it immediately)
                const webhook = await client.webhook.create({
                    topic: test.topic,
                    address: `http://localhost:3000/api/shopify/webhooks/test`,
                    format: 'json'
                });

                // Delete the test webhook immediately
                await client.webhook.delete(webhook.id);

                logger.info(`   ✅ ${test.name} (${test.topic}) - SUPPORTED`);
            } catch (error) {
                if (error.statusCode === 422 && error.message.includes('already exists')) {
                    logger.info(`   ✅ ${test.name} (${test.topic}) - SUPPORTED (already exists)`);
                } else if (error.statusCode === 401 || error.statusCode === 403) {
                    logger.warn(`   ❌ ${test.name} (${test.topic}) - PERMISSION DENIED`);
                } else {
                    logger.warn(`   ⚠️ ${test.name} (${test.topic}) - ERROR: ${error.message}`);
                }
            }
        }

        logger.info('\n💡 Recommendations:');
        if (!connection.scope.includes('read_orders')) {
            logger.info('   📝 Add "read_orders" scope for better order tracking');
        }

    } catch (error) {
        logger.error('❌ Error checking webhook permissions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkWebhookPermissions();