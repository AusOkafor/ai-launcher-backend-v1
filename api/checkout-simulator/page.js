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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { checkout_id, store } = req.query;

            if (!checkout_id) {
                return res.status(400).send(`
                    <html>
                        <head>
                            <title>Checkout Error</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .error { color: #e74c3c; }
                            </style>
                        </head>
                        <body>
                            <h1 class="error">Checkout Error</h1>
                            <p>No checkout ID provided.</p>
                        </body>
                    </html>
                `);
            }

            console.log('🛒 Loading checkout page for:', checkout_id);

            // Find the checkout in database
            const checkout = await prisma.cart.findFirst({
                where: {
                    metadata: {
                        path: ['checkoutId'],
                        equals: checkout_id
                    }
                },
                include: {
                    store: true
                }
            });

            if (!checkout) {
                return res.status(404).send(`
                    <html>
                        <head>
                            <title>Checkout Not Found</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .error { color: #e74c3c; }
                            </style>
                        </head>
                        <body>
                            <h1 class="error">Checkout Not Found</h1>
                            <p>Checkout ${checkout_id} could not be found.</p>
                        </body>
                    </html>
                `);
            }

            // Generate checkout page HTML
            const checkoutPage = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Checkout - ${store || checkout.store?.domain || 'Store'}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: #f5f5f5;
                            min-height: 100vh;
                            padding: 20px;
                        }
                        .container {
                            max-width: 800px;
                            margin: 0 auto;
                            background: white;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            overflow: hidden;
                        }
                        .header {
                            background: #2c3e50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                        }
                        .content {
                            display: flex;
                            min-height: 500px;
                        }
                        .items-section {
                            flex: 1;
                            padding: 30px;
                            border-right: 1px solid #eee;
                        }
                        .checkout-section {
                            flex: 1;
                            padding: 30px;
                            background: #f8f9fa;
                        }
                        .item {
                            display: flex;
                            align-items: center;
                            padding: 15px 0;
                            border-bottom: 1px solid #eee;
                        }
                        .item:last-child { border-bottom: none; }
                        .item-image {
                            width: 60px;
                            height: 60px;
                            background: #ddd;
                            border-radius: 8px;
                            margin-right: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #666;
                            font-size: 12px;
                        }
                        .item-details {
                            flex: 1;
                        }
                        .item-title {
                            font-weight: bold;
                            margin-bottom: 5px;
                        }
                        .item-price {
                            color: #27ae60;
                            font-weight: bold;
                        }
                        .total {
                            background: #2c3e50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            font-size: 24px;
                            font-weight: bold;
                        }
                        .form-group {
                            margin-bottom: 20px;
                        }
                        label {
                            display: block;
                            margin-bottom: 5px;
                            font-weight: bold;
                            color: #2c3e50;
                        }
                        input, select {
                            width: 100%;
                            padding: 12px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 16px;
                        }
                        .payment-methods {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 10px;
                            margin: 20px 0;
                        }
                        .payment-method {
                            padding: 15px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.3s;
                        }
                        .payment-method.selected {
                            border-color: #3498db;
                            background: #e3f2fd;
                        }
                        .payment-method:hover {
                            border-color: #3498db;
                        }
                        .checkout-btn {
                            width: 100%;
                            background: #27ae60;
                            color: white;
                            padding: 15px;
                            border: none;
                            border-radius: 8px;
                            font-size: 18px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: background 0.3s;
                        }
                        .checkout-btn:hover {
                            background: #229954;
                        }
                        .checkout-btn:disabled {
                            background: #bdc3c7;
                            cursor: not-allowed;
                        }
                        .simulator-note {
                            background: #fff3cd;
                            color: #856404;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                            font-size: 14px;
                        }
                        .loading {
                            display: none;
                            text-align: center;
                            padding: 20px;
                        }
                        .spinner {
                            border: 3px solid #f3f3f3;
                            border-top: 3px solid #3498db;
                            border-radius: 50%;
                            width: 30px;
                            height: 30px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 10px;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🛒 Checkout</h1>
                            <p>Complete your purchase</p>
                        </div>
                        
                        <div class="content">
                            <div class="items-section">
                                <h2>Your Items</h2>
                                ${checkout.items.map(item => `
                                    <div class="item">
                                        <div class="item-image">📦</div>
                                        <div class="item-details">
                                            <div class="item-title">${item.title}</div>
                                            <div>Quantity: ${item.quantity}</div>
                                            <div class="item-price">$${item.price.toFixed(2)} each</div>
                                        </div>
                                        <div class="item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                `).join('')}
                                
                                <div class="total">
                                    Total: $${checkout.subtotal.toFixed(2)}
                                </div>
                            </div>
                            
                            <div class="checkout-section">
                                <h2>Payment Details</h2>
                                
                                <div class="simulator-note">
                                    <strong>🛠️ Simulator Mode:</strong> This is a test checkout page. 
                                    No real payment will be processed.
                                </div>
                                
                                <form id="checkout-form">
                                    <div class="form-group">
                                        <label>Email Address</label>
                                        <input type="email" name="email" value="${checkout.metadata?.customerInfo?.email || ''}" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Full Name</label>
                                        <input type="text" name="name" value="${checkout.metadata?.customerInfo?.name || ''}" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="phone" value="${checkout.metadata?.customerInfo?.phone || ''}" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Shipping Address</label>
                                        <input type="text" name="shipping_address" value="${checkout.metadata?.customerInfo?.address || ''}" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Payment Method</label>
                                        <div class="payment-methods">
                                            <div class="payment-method selected" data-method="credit_card">
                                                💳 Credit Card
                                            </div>
                                            <div class="payment-method" data-method="paypal">
                                                🅿️ PayPal
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button type="submit" class="checkout-btn">
                                        Complete Purchase - $${checkout.subtotal.toFixed(2)}
                                    </button>
                                </form>
                                
                                <div class="loading" id="loading">
                                    <div class="spinner"></div>
                                    <p>Processing payment...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        // Payment method selection
                        document.querySelectorAll('.payment-method').forEach(method => {
                            method.addEventListener('click', () => {
                                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
                                method.classList.add('selected');
                            });
                        });
                        
                        // Form submission
                        document.getElementById('checkout-form').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            
                            const form = e.target;
                            const loading = document.getElementById('loading');
                            const submitBtn = form.querySelector('.checkout-btn');
                            
                            // Show loading
                            form.style.display = 'none';
                            loading.style.display = 'block';
                            
                            // Get form data
                            const formData = new FormData(form);
                            const selectedPayment = document.querySelector('.payment-method.selected').dataset.method;
                            
                            const checkoutData = {
                                checkout_id: '${checkout_id}',
                                payment_method: selectedPayment,
                                customer_details: {
                                    email: formData.get('email'),
                                    name: formData.get('name'),
                                    phone: formData.get('phone'),
                                    shipping_address: formData.get('shipping_address'),
                                    billing_address: formData.get('shipping_address')
                                }
                            };
                            
                            try {
                                const response = await fetch('/api/checkout-simulator', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(checkoutData)
                                });
                                
                                const result = await response.json();
                                
                                if (result.success) {
                                    // Redirect to success page
                                    window.location.href = result.data.redirectUrl;
                                } else {
                                    // Show error
                                    alert('Payment failed: ' + result.error);
                                    form.style.display = 'block';
                                    loading.style.display = 'none';
                                }
                            } catch (error) {
                                console.error('Checkout error:', error);
                                alert('Something went wrong. Please try again.');
                                form.style.display = 'block';
                                loading.style.display = 'none';
                            }
                        });
                    </script>
                </body>
                </html>
            `;

            return res.status(200).send(checkoutPage);
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Checkout Page Error:', error);
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