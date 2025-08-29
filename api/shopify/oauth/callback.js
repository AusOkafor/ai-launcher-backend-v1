// Standalone OAuth callback function
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        // For now, use a default workspace ID
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

        console.log(`Shopify connection created/updated: ${connection.id}`);

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=success&shop=${shop}`);

    } catch (error) {
        console.error('Error in OAuth callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/settings?shopify=error&message=${encodeURIComponent(error.message)}`);
    }
}
