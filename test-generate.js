import fetch from 'node-fetch'

const BASE_URL = 'https://ai-launcher-backend-v1.vercel.app'

async function testGenerateEndpoint() {
    console.log('🧪 Testing generate endpoint...\n')

    try {
        // First, get all launches to find one to test with
        console.log('📡 Fetching launches...')
        const launchesResponse = await fetch(`${BASE_URL}/api/launches`)
        const launchesData = await launchesResponse.json()

        if (!launchesData.success) {
            console.error('❌ Failed to fetch launches:', launchesData.error)
            return
        }

        const launches = launchesData.data.launches || []
        console.log(`✅ Found ${launches.length} launches`)

        if (launches.length === 0) {
            console.log('❌ No launches found to test with')
            return
        }

        // Find a launch with DRAFT status
        const draftLaunch = launches.find(launch => launch.status === 'DRAFT')

        if (!draftLaunch) {
            console.log('❌ No DRAFT launches found to test with')
            console.log('Available launches:')
            launches.forEach(launch => {
                console.log(`  - ${launch.id}: ${launch.status}`)
            })
            return
        }

        console.log(`🎯 Testing with launch: ${draftLaunch.id} (${draftLaunch.status})`)

        // Test the generate endpoint
        console.log('📡 Testing generate endpoint...')
        const generateResponse = await fetch(`${BASE_URL}/api/launches/${draftLaunch.id}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        const generateData = await generateResponse.json()

        if (generateResponse.ok && generateData.success) {
            console.log('✅ Generate endpoint working!')
            console.log('📊 Response:', JSON.stringify(generateData, null, 2))
        } else {
            console.error('❌ Generate endpoint failed:', generateData)
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message)
    }
}

testGenerateEndpoint()