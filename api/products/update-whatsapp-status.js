import { PrismaClient } from '@prisma/client';

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
    // Set CORS headers
    const origin = req.headers.origin || '*';
    const allowed = [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8081',
        'https://stratosphere-ecom-ai.vercel.app',
        'https://ai-launcher-frontend.vercel.app'
    ];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'PATCH') {
        try {
            const { productId, whatsappEnabled } = req.body;

            if (!productId || typeof whatsappEnabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Product ID and whatsappEnabled status are required'
                });
            }

            console.log(`🔄 Updating WhatsApp status for product ${productId}: ${whatsappEnabled}`);

            // Update the product's WhatsApp status
            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: {
                    whatsappEnabled: whatsappEnabled,
                    updatedAt: new Date()
                },
                include: {
                    store: {
                        select: {
                            name: true,
                            platform: true
                        }
                    },
                    variants: true
                }
            });

            console.log(`✅ Updated WhatsApp status for product: ${updatedProduct.title}`);

            return res.status(200).json({
                success: true,
                message: `WhatsApp status updated for ${updatedProduct.title}`,
                data: {
                    product: updatedProduct
                }
            });

        } catch (error) {
            console.error('❌ Error updating WhatsApp status:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update WhatsApp status',
                details: error.message
            });
        }
    }

    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
}