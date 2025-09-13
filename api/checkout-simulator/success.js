import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { order } = req.query;

            if (!order) {
                return res.status(400).send(`
                    <html>
                        <head>
                            <title>Order Not Found</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .error { color: #e74c3c; }
                            </style>
                        </head>
                        <body>
                            <h1 class="error">Order Not Found</h1>
                            <p>No order number provided.</p>
                        </body>
                    </html>
                `);
            }

            console.log('📧 Loading order success page for:', order);

            // Find the order
            const orderData = await prisma.order.findFirst({
                where: {
                    orderNumber: order
                },
                include: {
                    store: true
                }
            });

            if (!orderData) {
                return res.status(404).send(`
                    <html>
                        <head>
                            <title>Order Not Found</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .error { color: #e74c3c; }
                            </style>
                        </head>
                        <body>
                            <h1 class="error">Order Not Found</h1>
                            <p>Order ${order} could not be found.</p>
                        </body>
                    </html>
                `);
            }

            // Generate success page HTML
            const successPage = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Order Confirmed - ${orderData.store?.name || 'Store'}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 20px;
                        }
                        .container {
                            background: white;
                            border-radius: 20px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            padding: 40px;
                            max-width: 500px;
                            width: 100%;
                            text-align: center;
                        }
                        .success-icon {
                            width: 80px;
                            height: 80px;
                            background: #4CAF50;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px;
                            font-size: 40px;
                            color: white;
                        }
                        h1 { 
                            color: #2c3e50; 
                            margin-bottom: 10px;
                            font-size: 28px;
                        }
                        .order-number {
                            color: #3498db;
                            font-size: 24px;
                            font-weight: bold;
                            margin: 20px 0;
                        }
                        .total {
                            font-size: 20px;
                            color: #27ae60;
                            font-weight: bold;
                            margin: 20px 0;
                        }
                        .items {
                            background: #f8f9fa;
                            border-radius: 10px;
                            padding: 20px;
                            margin: 20px 0;
                            text-align: left;
                        }
                        .item {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px solid #eee;
                        }
                        .item:last-child { border-bottom: none; }
                        .status {
                            background: #d4edda;
                            color: #155724;
                            padding: 10px 20px;
                            border-radius: 25px;
                            display: inline-block;
                            margin: 20px 0;
                            font-weight: bold;
                        }
                        .note {
                            background: #fff3cd;
                            color: #856404;
                            padding: 15px;
                            border-radius: 10px;
                            margin: 20px 0;
                            font-size: 14px;
                        }
                        .back-btn {
                            background: #3498db;
                            color: white;
                            padding: 12px 30px;
                            border: none;
                            border-radius: 25px;
                            font-size: 16px;
                            cursor: pointer;
                            text-decoration: none;
                            display: inline-block;
                            margin-top: 20px;
                        }
                        .back-btn:hover { background: #2980b9; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">✓</div>
                        <h1>Order Confirmed!</h1>
                        <div class="order-number">${orderData.orderNumber}</div>
                        <div class="total">Total: $${orderData.total}</div>
                        
                        <div class="items">
                            <h3>Order Items:</h3>
                            ${orderData.items.map(item => `
                                <div class="item">
                                    <span>${item.title} (${item.quantity}x)</span>
                                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="status">Payment Successful</div>
                        
                        <div class="note">
                            <strong>Note:</strong> This is a simulated checkout for testing purposes. 
                            In a real implementation, this would be a Shopify checkout page.
                        </div>
                        
                        <a href="javascript:history.back()" class="back-btn">Back to Store</a>
                    </div>
                </body>
                </html>
            `;

            return res.status(200).send(successPage);
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Order Success Page Error:', error);
        return res.status(500).send(`
            <html>
                <head>
                    <title>Error</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .error { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Something went wrong</h1>
                    <p>Please try again later.</p>
                </body>
            </html>
        `);
    }
}