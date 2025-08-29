// Standalone Shopify connections function
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method === 'GET') {
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
            console.error('Error getting connections:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;

            await prisma.shopifyConnection.delete({
                where: { id }
            });

            res.json({
                success: true,
                message: 'Connection disconnected successfully'
            });
        } catch (error) {
            console.error('Error disconnecting connection:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}