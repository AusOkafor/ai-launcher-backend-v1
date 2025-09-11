// Standalone OAuth callback function
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
let prisma;
if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

export default async function handler(req, res) {
    console.log('=== OAuth Callback Function Started ===');
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    console.log('Timestamp:', new Date().toISOString());

    if (req.method !== 'GET') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { code, shop, state } = req.query;

        if (!code || !shop) {
            return res.status(400).json({
                success: false,
                error: 'Missing required OAuth parameters'
            });
        }

        console.log(`OAuth callback received for shop: ${shop}`);

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
            const errorText = await tokenResponse.text();
            console.error('Token exchange failed:', errorText);
            throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        const { access_token, scope } = tokenData;

        console.log('Token exchange successful, getting shop info...');

        // Get shop information
        const shopResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': access_token,
                'Content-Type': 'application/json'
            }
        });

        if (!shopResponse.ok) {
            const errorText = await shopResponse.text();
            console.error('Shop info fetch failed:', errorText);
            throw new Error(`Failed to get shop info: ${shopResponse.statusText}`);
        }

        const shopData = await shopResponse.json();
        const shopInfo = shopData.shop;

        console.log('Shop info retrieved:', shopInfo.name);

        // Create test user and workspace if they don't exist
        console.log('Creating test user and workspace...');

        const testUser = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                email: 'test@example.com',
                passwordHash: 'test-hash',
                firstName: 'Test',
                lastName: 'User'
            }
        });

        const workspace = await prisma.workspace.upsert({
            where: { id: 'test-workspace-id' },
            update: {},
            create: {
                id: 'test-workspace-id',
                name: 'Default Workspace',
                slug: 'default-workspace',
                ownerId: testUser.id
            }
        });

        console.log('Workspace ready:', workspace.id);

        console.log('Attempting to save connection to database...');
        console.log('Connection data:', {
            workspaceId: workspace.id,
            shop,
            shopifyId: shopInfo.id.toString(),
            shopName: shopInfo.name
        });

        // Check if connection already exists
        const existingConnection = await prisma.shopifyConnection.findFirst({
            where: {
                workspaceId: workspace.id,
                shop: shop
            }
        });
        console.log('Existing connection found:', existingConnection ? 'YES' : 'NO');

        // Create or update Shopify connection
        const connection = await prisma.shopifyConnection.upsert({
            where: {
                workspaceId_shop: {
                    workspaceId: workspace.id,
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
                workspaceId: workspace.id,
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

        console.log(`Shopify connection created/updated: ${connection.id}`);

        // Create or update corresponding Store record
        console.log('Creating/updating Store record...');

        // First, try to find existing store
        let store = await prisma.store.findFirst({
            where: {
                workspaceId: workspace.id,
                domain: shop
            }
        });

        if (store) {
            // Update existing store
            store = await prisma.store.update({
                where: { id: store.id },
                data: {
                    name: shopInfo.name,
                    accessToken: access_token,
                    status: 'ACTIVE',
                    updatedAt: new Date()
                }
            });
        } else {
            // Create new store
            store = await prisma.store.create({
                data: {
                    workspaceId: workspace.id,
                    platform: 'SHOPIFY',
                    name: shopInfo.name,
                    domain: shop,
                    accessToken: access_token,
                    status: 'ACTIVE'
                }
            });
        }

        console.log(`Store created/updated: ${store.id}`);

        // Update the ShopifyConnection to link to the Store
        await prisma.shopifyConnection.update({
            where: { id: connection.id },
            data: { storeId: store.id }
        });

        console.log('ShopifyConnection linked to Store');

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=success&shop=${shop}`);

    } catch (error) {
        console.error('=== OAuth Callback Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            cause: error.cause,
            code: error.code
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=error&message=${encodeURIComponent(error.message)}`);
    }
}