import { prisma } from './src/db.js';

async function testDatabaseConnection() {
    try {
        console.log('🔍 Testing Database Connection...\n');

        // Test 1: Basic connection
        console.log('1️⃣ Testing basic database connection...');
        await prisma.$connect();
        console.log('✅ Database connection successful\n');

        // Test 2: Check if workspace exists
        console.log('2️⃣ Checking for test workspace...');
        const workspace = await prisma.workspace.findFirst({
            where: { id: 'test-workspace-id' }
        });

        if (!workspace) {
            console.log('❌ Test workspace not found, creating one...');
            const newWorkspace = await prisma.workspace.create({
                data: {
                    id: 'test-workspace-id',
                    name: 'Test Workspace',
                    slug: 'test-workspace',
                    ownerId: 'test-user-id',
                    status: 'ACTIVE'
                }
            });
            console.log('✅ Test workspace created:', newWorkspace.id);
        } else {
            console.log('✅ Test workspace found:', workspace.name);
        }

        // Test 3: Check products
        console.log('\n3️⃣ Checking products...');
        const products = await prisma.product.findMany({
            take: 3
        });
        console.log(`✅ Found ${products.length} products`);
        products.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.title} (ID: ${product.id})`);
        });

        // Test 4: Try to create a launch
        console.log('\n4️⃣ Testing launch creation...');
        const testLaunch = await prisma.launch.create({
            data: {
                workspaceId: 'test-workspace-id',
                productId: products[0] ? products[0].id : 'test-product-id',
                name: 'Test Launch',
                status: 'DRAFT',
                inputs: {
                    productId: products[0] ? products[0].id : null,
                    brandTone: 'Professional',
                    targetAudience: 'Young professionals',
                    budget: 5000
                },
                outputs: null
            }
        });
        console.log('✅ Test launch created successfully:', testLaunch.id);

        // Test 5: Clean up test launch
        console.log('\n5️⃣ Cleaning up test launch...');
        await prisma.launch.delete({
            where: { id: testLaunch.id }
        });
        console.log('✅ Test launch cleaned up');

        console.log('\n🎉 All database tests passed!');

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('Stack trace:', error.stack);

        // Check for specific error types
        if (error.code === 'P2002') {
            console.error('This is a unique constraint violation');
        } else if (error.code === 'P2003') {
            console.error('This is a foreign key constraint violation');
        } else if (error.code === 'P2025') {
            console.error('This is a record not found error');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testDatabaseConnection();