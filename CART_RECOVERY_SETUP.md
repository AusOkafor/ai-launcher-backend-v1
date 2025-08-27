# 🛒 Cart Recovery Agent - Production Setup Guide

## 🎯 Overview

The Cart Recovery Agent is a production-ready system that:
- **Detects abandoned carts** from your Shopify orders
- **Generates AI-powered recovery messages** using multiple strategies
- **Sends messages via WhatsApp, SMS, and Email**
- **Tracks recovery performance** and conversion rates
- **Runs automated campaigns** with smart sequencing

## 🚀 Quick Start

### 1. Test the System
```bash
npm run test:cart-recovery
```

### 2. API Endpoints
```bash
# Get abandoned carts
GET /api/cart-recovery/abandoned?storeId=YOUR_STORE_ID&hours=24

# Generate AI recovery message
POST /api/cart-recovery/generate-message
{
  "cart": { /* cart data */ },
  "attemptNumber": 1
}

# Send recovery message
POST /api/cart-recovery/send-message
{
  "cart": { /* cart data */ },
  "messageType": "urgency",
  "channel": "all"
}

# Run automated campaign
POST /api/cart-recovery/campaign
{
  "storeId": "YOUR_STORE_ID",
  "hoursThreshold": 24,
  "maxAttempts": 3,
  "channels": ["whatsapp", "email"],
  "messageTypes": ["urgency", "value", "social"]
}

# Get recovery statistics
GET /api/cart-recovery/stats?storeId=YOUR_STORE_ID&days=30
```

## 🔧 Environment Variables Setup

### Required for Full Functionality

```bash
# AI Service (Already configured)
TOGETHER_API_KEY=your_together_api_key

# Twilio (WhatsApp & SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886  # Your Twilio WhatsApp number
TWILIO_PHONE_NUMBER=+1234567890      # Your Twilio SMS number

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourstore.com

# Store Configuration
STORE_URL=https://yourstore.com
STORE_NAME=Your Store Name

# Database (Already configured)
DATABASE_URL=your_database_url
```

## 📱 Twilio Setup

### 1. Create Twilio Account
- Sign up at [twilio.com](https://twilio.com)
- Get your Account SID and Auth Token

### 2. WhatsApp Setup
```bash
# Get a WhatsApp number from Twilio
# Add to your .env file:
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 3. SMS Setup
```bash
# Get a phone number from Twilio
# Add to your .env file:
TWILIO_PHONE_NUMBER=+1234567890
```

## 📧 SendGrid Setup

### 1. Create SendGrid Account
- Sign up at [sendgrid.com](https://sendgrid.com)
- Get your API key

### 2. Verify Sender Domain
- Verify your domain in SendGrid
- Set up SPF and DKIM records

### 3. Configure Environment
```bash
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourstore.com
```

## 🧠 AI Message Strategies

The system generates 3 types of recovery messages:

### 1. Urgency-Based
- Creates FOMO (Fear of Missing Out)
- Limited time offers
- "Last chance" messaging

### 2. Value-Based
- Discounts and offers
- Free shipping
- Bundle deals

### 3. Social Proof
- Customer testimonials
- Popular products
- Community validation

## 📊 Recovery Campaign Flow

### Automated Sequence
1. **Detection**: Find abandoned carts (24+ hours old)
2. **First Attempt**: Urgency message via WhatsApp
3. **Second Attempt**: Value message via Email (48 hours later)
4. **Third Attempt**: Social proof via SMS (72 hours later)
5. **Tracking**: Monitor conversions and success rates

### Manual Campaign
```bash
# Run a custom campaign
curl -X POST http://localhost:3000/api/cart-recovery/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": "your_store_id",
    "hoursThreshold": 24,
    "maxAttempts": 3,
    "channels": ["whatsapp", "email"],
    "messageTypes": ["urgency", "value", "social"]
  }'
```

## 📈 Performance Tracking

### Metrics Tracked
- **Abandoned Carts Detected**: Number of carts identified
- **Messages Sent**: Total recovery messages sent
- **Successful Deliveries**: Messages that reached customers
- **Conversions**: Carts that were recovered
- **Recovery Rate**: Conversion percentage

### View Statistics
```bash
# Get 30-day stats
curl "http://localhost:3000/api/cart-recovery/stats?storeId=your_store_id&days=30"
```

## 🔄 Integration with Shopify

### Automatic Detection
- Webhooks automatically sync orders
- System detects PENDING orders as potential abandoned carts
- Filters out customers with recent successful orders

### Manual Sync
```bash
# Sync recent orders
npm run sync:orders

# Monitor webhook activity
npm run monitor:webhooks
```

## 🛠️ Testing

### Test Individual Components
```bash
# Test message generation
curl -X POST http://localhost:3000/api/cart-recovery/generate-message \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "customer": {"firstName": "John", "email": "test@example.com"},
      "items": [{"title": "Test Product", "quantity": 1, "price": 29.99}],
      "total": 29.99
    }
  }'
```

### Test Full System
```bash
npm run test:cart-recovery
```

## 🚨 Troubleshooting

### Common Issues

1. **No abandoned carts detected**
   - Check if orders exist with PENDING status
   - Verify store ID is correct
   - Ensure orders are older than threshold

2. **Messages not sending**
   - Verify Twilio/SendGrid credentials
   - Check customer has email/phone
   - Review API rate limits

3. **AI messages not generating**
   - Verify TOGETHER_API_KEY is set
   - Check API quota and limits
   - Review prompt format

### Debug Commands
```bash
# Check webhook activity
npm run monitor:webhooks

# Test webhook endpoint
npm run test:webhook-endpoint

# Debug webhook route
npm run debug:webhook-route
```

## 📋 Production Checklist

- [ ] Environment variables configured
- [ ] Twilio account set up with WhatsApp/SMS numbers
- [ ] SendGrid account configured with verified domain
- [ ] Store URL and name configured
- [ ] Test campaign run successfully
- [ ] Webhooks receiving order data
- [ ] Recovery statistics tracking
- [ ] Error monitoring configured

## 🎯 Next Steps

1. **Set up Twilio** for WhatsApp/SMS messaging
2. **Configure SendGrid** for email campaigns
3. **Test with real abandoned carts**
4. **Monitor performance** and optimize
5. **Scale campaigns** based on results

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review webhook logs
- Test individual components
- Monitor error logs

---

**🎉 Your Cart Recovery Agent is ready to recover lost sales!**
