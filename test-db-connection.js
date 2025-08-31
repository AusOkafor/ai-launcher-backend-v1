import { PrismaClient } from '@prisma/client'

// Test both connection strings
const connectionStrings = {
    direct: 'postgresql://postgres:Fui6Vb_8e_pA3iC@db.xvxbjiisrmapesybroqu.supabase.co:5432/postgres',
    pooling: 'postgresql://postgres.xvxbjiisrmapesybroqu:ksTAo16wGVQKPmXZ@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
}

async function testConnection(connectionName, connectionString) {
    console.log(`\n🧪 Testing ${connectionName} connection...`)
    console.log(`📡 Connection: ${connectionString.replace(/:[^:@]*@/, ':****@')}`)

    const prisma = new PrismaClient({
        log: ['error'],
        datasources: {
            db: {
                url: connectionString
            }
        }
    })

    try {
        // Test basic connection
        console.log('📊 Testing basic connection...')
        await prisma.$queryRaw `SELECT 1 as test`
        console.log('✅ Basic connection successful')

        // Test launches query
        console.log('📊 Testing launches query...')
        const launches = await prisma.launch.findMany({
            take: 1
        })
        console.log(`✅ Launches query successful - found ${launches.length} launches`)

        // Test products query
        console.log('📊 Testing products query...')
        const products = await prisma.product.findMany({
            take: 1
        })
        console.log(`✅ Products query successful - found ${products.length} products`)

        console.log(`🎉 ${connectionName} connection is WORKING!`)
        return true

    } catch (error) {
        console.log(`❌ ${connectionName} connection FAILED:`)
        console.log(`   Error: ${error.message}`)

        if (error.message.includes('prepared statement')) {
            console.log('   🔍 This is the connection pooling issue we were trying to fix')
        }

        return false
    } finally {
        await prisma.$disconnect()
    }
}

async function runTests() {
    console.log('🚀 Database Connection Test Script')
    console.log('=====================================')

    const results = {}

    // Test direct connection
    results.direct = await testConnection('Direct Connection', connectionStrings.direct)

    // Test pooling connection
    results.pooling = await testConnection('Transaction Pooling', connectionStrings.pooling)

    // Summary
    console.log('\n📋 Test Results Summary:')
    console.log('========================')
    console.log(`Direct Connection: ${results.direct ? '✅ WORKING' : '❌ FAILED'}`)
    console.log(`Pooling Connection: ${results.pooling ? '✅ WORKING' : '❌ FAILED'}`)

    if (results.direct && !results.pooling) {
        console.log('\n🎯 RECOMMENDATION: Use direct connection (no pooling issues)')
    } else if (results.pooling && !results.direct) {
        console.log('\n🎯 RECOMMENDATION: Use pooling connection (direct not accessible)')
    } else if (results.direct && results.pooling) {
        console.log('\n🎯 RECOMMENDATION: Both work! Use direct connection to avoid pooling issues')
    } else {
        console.log('\n❌ PROBLEM: Neither connection works. Check your database credentials and settings.')
    }
}

runTests().catch(console.error)