import fetch from 'node-fetch';

const testFrontendConnection = async() => {
    try {
        console.log('🔍 Testing frontend connection to backend...');

        // Test the exact URL the frontend would use
        const frontendUrl = 'http://localhost:8080';
        const backendUrl = 'http://localhost:3000';

        console.log('📤 Testing connection from frontend to backend...');

        // Test if backend is accessible
        const backendResponse = await fetch(`${backendUrl}/health`);
        console.log('✅ Backend health check:', backendResponse.status);

        // Test if frontend is accessible
        try {
            const frontendResponse = await fetch(`${frontendUrl}`);
            console.log('✅ Frontend accessible:', frontendResponse.status);
        } catch (error) {
            console.log('❌ Frontend not accessible:', error.message);
        }

        // Test CORS preflight
        const corsResponse = await fetch(`${backendUrl}/api/images/creative/test`, {
            method: 'OPTIONS',
            headers: {
                'Origin': frontendUrl,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        console.log('✅ CORS preflight:', corsResponse.status);
        console.log('📋 CORS headers:', Object.fromEntries(corsResponse.headers.entries()));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

testFrontendConnection();