import { prisma } from '../db.js';

async function checkWorkspace() {
    try {
        console.log('🔍 Checking workspace information...\n');

        // Get the workspace from the Shopify connection
        const connection = await prisma.shopifyConnection.findFirst({
            where: {
                shop: 'ausdevtheme.myshopify.com'
            },
            include: {
                workspace: true
            }
        });

        if (connection) {
            console.log('📋 Shopify Connection Workspace:');
            console.log(`   Workspace ID: ${connection.workspace.id}`);
            console.log(`   Workspace Name: ${connection.workspace.name}`);
            console.log(`   Workspace Slug: ${connection.workspace.slug}`);
            console.log('');
        }

        // Get products and their workspace
        const products = await prisma.product.findMany({
            include: {
                store: {
                    include: {
                        workspace: true
                    }
                }
            },
            take: 5
        });

        console.log('📦 Products and their workspaces:');
        products.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.title}`);
            console.log(`      Product ID: ${product.id}`);
            console.log(`      Store ID: ${product.storeId}`);
            console.log(`      Workspace ID: ${product.store.workspace.id}`);
            console.log(`      Workspace Name: ${product.store.workspace.name}`);
            console.log('');
        });

        // Get all workspaces
        const workspaces = await prisma.workspace.findMany();
        console.log('🏢 All Workspaces:');
        workspaces.forEach((workspace, index) => {
            console.log(`   ${index + 1}. ${workspace.name} (${workspace.id})`);
        });

    } catch (error) {
        console.error('❌ Error checking workspace:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkWorkspace();