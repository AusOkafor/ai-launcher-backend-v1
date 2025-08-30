import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function setupDatabase() {
    try {
        console.log('🔍 Testing database connection...')

        // Test connection
        await prisma.$queryRaw `SELECT 1`
        console.log('✅ Database connection successful!')

        // Check if tables exist
        const tables = await prisma.$queryRaw `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `
        console.log('📋 Existing tables:', tables.map(t => t.table_name))

        // Create test workspace if it doesn't exist
        const testWorkspace = await prisma.workspace.upsert({
            where: { slug: 'test-workspace' },
            update: {},
            create: {
                name: 'Test Workspace',
                slug: 'test-workspace',
                ownerId: 'test-user-id'
            }
        })
        console.log('✅ Test workspace created/updated:', testWorkspace.id)

        // Create test store if it doesn't exist
        const testStore = await prisma.store.upsert({
            where: {
                workspaceId_name: {
                    workspaceId: testWorkspace.id,
                    name: 'Test Store'
                }
            },
            update: {},
            create: {
                workspaceId: testWorkspace.id,
                name: 'Test Store',
                platform: 'SHOPIFY',
                domain: 'test-store.myshopify.com'
            }
        })
        console.log('✅ Test store created/updated:', testStore.id)

        // Create test product if it doesn't exist
        const testProduct = await prisma.product.upsert({
            where: {
                storeId_title: {
                    storeId: testStore.id,
                    title: 'Test Product'
                }
            },
            update: {},
            create: {
                storeId: testStore.id,
                title: 'Test Product',
                description: 'A test product for development',
                category: 'Test Category',
                brand: 'Test Brand',
                price: 29.99,
                images: ['https://via.placeholder.com/300x300?text=Test+Product']
            }
        })
        console.log('✅ Test product created/updated:', testProduct.id)

        // Create test launch if it doesn't exist
        const testLaunch = await prisma.launch.upsert({
            where: {
                workspaceId_name: {
                    workspaceId: testWorkspace.id,
                    name: 'Test Launch'
                }
            },
            update: {},
            create: {
                workspaceId: testWorkspace.id,
                productId: testProduct.id,
                name: 'Test Launch',
                status: 'DRAFT',
                inputs: {
                    productId: testProduct.id,
                    brandTone: 'Professional',
                    targetAudience: 'General',
                    launchWindow: 'Immediate',
                    budget: 1000,
                    platforms: ['meta', 'tiktok']
                }
            }
        })
        console.log('✅ Test launch created/updated:', testLaunch.id)

        console.log('\n🎉 Database setup completed successfully!')
        console.log('📊 Test data created:')
        console.log(`   - Workspace: ${testWorkspace.id}`)
        console.log(`   - Store: ${testStore.id}`)
        console.log(`   - Product: ${testProduct.id}`)
        console.log(`   - Launch: ${testLaunch.id}`)

    } catch (error) {
        console.error('❌ Database setup failed:', error)

        if (error.code === 'P1001') {
            console.error('\n💡 Database connection failed. Please check:')
            console.error('   1. DATABASE_URL environment variable is set')
            console.error('   2. Database server is running')
            console.error('   3. Database credentials are correct')
        }

        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

setupDatabase()