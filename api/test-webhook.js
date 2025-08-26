export default async function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json({
            message: 'Webhook test endpoint',
            instructions: 'Send POST request with sample order data to test webhook',
            endpoints: {
                'orders/create': '/api/shopify/webhooks/orders/create',
                'orders/updated': '/api/shopify/webhooks/orders/updated'
            }
        });
    }

    if (req.method === 'POST') {
        try {
            // Simulate a webhook call to the orders/create endpoint
            const sampleOrderData = {
                id: 123456789,
                order_number: "1001",
                shop_domain: "austus-themes.myshopify.com",
                customer: {
                    id: 987654321,
                    email: "test@example.com",
                    first_name: "John",
                    last_name: "Doe"
                },
                line_items: [
                    {
                        id: 111,
                        product_id: 222,
                        title: "Test Product",
                        quantity: 1,
                        price: "29.99"
                    }
                ],
                total_price: "29.99",
                created_at: new Date().toISOString()
            };

            console.log('🧪 Testing webhook with sample data:', JSON.stringify(sampleOrderData, null, 2));

            // Make a request to the actual webhook endpoint
            const webhookResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000'}/api/shopify/webhooks/orders/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sampleOrderData)
            });

            const webhookResult = await webhookResponse.text();

            return res.status(200).json({
                success: true,
                message: 'Webhook test completed',
                webhookStatus: webhookResponse.status,
                webhookResponse: webhookResult,
                sampleData: sampleOrderData
            });

        } catch (error) {
            console.error('Webhook test error:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
