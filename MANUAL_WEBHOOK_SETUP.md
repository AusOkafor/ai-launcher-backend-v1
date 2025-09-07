# Manual Webhook Setup for Cart Recovery

Since the API webhook creation is blocked by insufficient scopes, you can manually create webhooks through the Shopify admin panel.

## 🛠️ Steps to Manually Create Webhooks

### 1. Access Shopify Admin
- Go to your Shopify store admin panel
- Navigate to **Settings** → **Notifications**

### 2. Create Checkout Webhooks
Scroll down to the **Webhooks** section and click **Create webhook**

#### Webhook 1: Checkout Created
- **Event**: `Checkout created`
- **Format**: `JSON`
- **URL**: `http://localhost:3000/api/shopify/webhooks/checkouts/create`
- **API Version**: Latest available

#### Webhook 2: Checkout Updated  
- **Event**: `Checkout updated`
- **Format**: `JSON`
- **URL**: `http://localhost:3000/api/shopify/webhooks/checkouts/update`
- **API Version**: Latest available

#### Webhook 3: Order Created (if not already exists)
- **Event**: `Order created`
- **Format**: `JSON` 
- **URL**: `http://localhost:3000/api/shopify/webhooks/orders/create`
- **API Version**: Latest available

### 3. Test the Webhooks
After creating the webhooks:
1. Add an item to your cart
2. Start the checkout process
3. Enter your email/phone
4. Check your backend logs for webhook events

### 4. Verify Backend is Running
Make sure your backend server is running:
```bash
cd launcher-backend
npm start
```

## 🎯 Expected Results

Once webhooks are manually created, you should see:
- Checkout creation events in your backend logs
- Customer data being captured in your database
- Abandoned cart detection working after 6 minutes

## 🔍 Troubleshooting

If webhooks don't work:
1. Check that your server is accessible on port 3000
2. Verify the webhook URLs are correct
3. Check backend logs for incoming webhook requests
4. Ensure your database is running
