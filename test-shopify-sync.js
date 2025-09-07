// Test script for Shopify sync functionality
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testShopifySync() {
    try {
        console.log('🔍 Testing Shopify sync functionality...');

        // Check existing connections
        const connections = await prisma.shopifyConnection.findMany();
        console.log(`✅ Found ${connections.length} existing Shopify connections`);

        if (connections.length === 0) {
            console.log('📝 Creating test Shopify connections...');

            // Create test connections
            const testConnections = [{
                    workspaceId: 'test-workspace-id',
                    shop: 'test-store-1.myshopify.com',
                    accessToken: 'test-token-1',
                    scope: 'read_products,write_products,read_orders,write_orders,read_customers,write_customers',
                    shopifyId: '123456789',
                    shopName: 'Test Store 1',
                    email: 'test1@example.com',
                    country: 'US',
                    currency: 'USD',
                    timezone: 'America/New_York',
                    status: 'ACTIVE'
                },
                {
                    workspaceId: 'test-workspace-id',
                    shop: 'test-store-2.myshopify.com',
                    accessToken: 'test-token-2',
                    scope: 'read_products,write_products,read_orders,write_orders,read_customers,write_customers',
                    shopifyId: '987654321',
                    shopName: 'Test Store 2',
                    email: 'test2@example.com',
                    country: 'CA',
                    currency: 'CAD',
                    timezone: 'America/Toronto',
                    status: 'ACTIVE'
                }
            ];

            for (const connectionData of testConnections) {
                const connection = await prisma.shopifyConnection.create({
                    data: connectionData
                });
                console.log(`✅ Created test connection: ${connection.shopName} (${connection.shop})`);
            }
        }

        // Test the connections endpoint
        console.log('\n🌐 Testing API endpoints...');

        // Test connections endpoint
        const testResponse = await fetch('http://localhost:3000/api/shopify/connections?workspaceId=test-workspace-id');
        if (testResponse.ok) {
            const result = await testResponse.json();
            console.log('✅ Connections API working:', result.connections.length, 'connections found');
        } else {
            console.log('❌ Connections API failed:', testResponse.status);
        }

        console.log('\n🎉 Shopify sync test completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testShopifySync();