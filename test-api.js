import fetch from 'node-fetch'

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function testAPI() {
    console.log('🧪 Testing API endpoints...\n')

    const endpoints = [
        { name: 'Health Check', url: '/api/health', method: 'GET' },
        { name: 'Products', url: '/api/products', method: 'GET' },
        { name: 'Launches', url: '/api/launches', method: 'GET' },
        { name: 'Shopify Connections', url: '/api/shopify/connections', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
        try {
            console.log(`📡 Testing ${endpoint.name}...`)

            const response = await fetch(`${BASE_URL}${endpoint.url}`, {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const data = await response.json()

            if (response.ok) {
                console.log(`✅ ${endpoint.name}: ${response.status}`)
                if (data.data) {
                    const count = Array.isArray(data.data) ? data.data.length :
                        (data.data.products ? data.data.products.length :
                            data.data.launches ? data.data.launches.length :
                            data.data.connections ? data.data.connections.length : 0)
                    console.log(`   📊 Items: ${count}`)
                }
            } else {
                console.log(`❌ ${endpoint.name}: ${response.status}`)
                console.log(`   Error: ${(data.error && data.error.message) || data.message}`)
            }

        } catch (error) {
            console.log(`❌ ${endpoint.name}: Connection failed`)
            console.log(`   Error: ${error.message}`)
        }

        console.log('')
    }

    console.log('🏁 API testing completed!')
}

testAPI()