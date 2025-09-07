# 🛒 Enhanced Checkout Tracking Setup

## 📝 **Instructions for Shopify Theme Integration**

### **Step 1: Copy the Enhanced Script**
Copy the entire content from `improved-checkout-tracker.js` and add it to your Shopify theme.

### **Step 2: Add to Your Theme**

**Option A: Add to theme.liquid (Recommended)**
1. Go to your Shopify Admin → Online Store → Themes
2. Click "Actions" → "Edit Code" on your active theme
3. Open `layout/theme.liquid`
4. Find the closing `</body>` tag
5. **BEFORE** the closing `</body>` tag, add the enhanced script

**Option B: Add to checkout.liquid (If you have Shopify Plus)**
1. In theme editor, find `layout/checkout.liquid`
2. Add the script before `</body>`

### **Step 3: Test the Enhanced Tracking**

1. **Add item to cart** on your Shopify store
2. **Go to checkout** (`/checkout`)
3. **Enter your email** in the email field
4. **Open browser console** (F12) and look for:
   ```
   [Checkout Recovery] Checkout page detected, initializing tracking
   [Checkout Recovery] Customer contact info detected: {email: "your@email.com"}
   [Checkout Recovery] ✅ Customer data captured successfully!
   ```
5. **Leave the checkout page** (don't complete purchase)
6. **Wait 6+ minutes**
7. **Check your Cart Recovery AI dashboard**

### **Step 4: Verify in Dashboard**

1. Go to Cart Recovery AI
2. Select "Fringo-motion" store
3. Set hours to `0.1` (6 minutes)
4. Click refresh
5. You should see your abandoned cart with email!

---

## 🔧 **What This Enhanced Script Does:**

### **Better Email Detection:**
- Searches for email inputs using multiple selectors
- Monitors `input`, `blur`, and `change` events
- Periodic checking every 3 seconds

### **Improved Customer Data Collection:**
- Captures email, phone, first name, last name
- Works with various checkout form structures
- Handles single-page checkout flows

### **Robust API Communication:**
- Better error handling
- Detailed console logging for debugging
- Automatic retry logic

### **Smart Page Detection:**
- Detects checkout pages reliably
- Works with custom checkout themes
- Handles navigation changes

---

## 🐛 **Troubleshooting:**

### **If you don't see console messages:**
1. Make sure you're on a checkout page (`/checkout`)
2. Check that the script loaded (no JavaScript errors)
3. Verify the API URL is correct (`http://localhost:3000`)

### **If email isn't captured:**
1. Check browser console for error messages
2. Try entering email and pressing Tab (blur event)
3. Look for `[Checkout Recovery]` messages in console

### **If API calls fail:**
1. Check CORS settings in backend
2. Verify backend is running on port 3000
3. Check network tab for failed requests

---

## 📋 **Complete Testing Checklist:**

- [ ] Script added to theme.liquid before `</body>`
- [ ] Backend server running (`node src/server.js`)
- [ ] Add item to cart
- [ ] Go to checkout
- [ ] Enter email address
- [ ] See console message: "Customer contact info detected"
- [ ] See console message: "✅ Customer data captured successfully!"
- [ ] Leave checkout page
- [ ] Wait 6+ minutes
- [ ] Check Cart Recovery AI dashboard
- [ ] See abandoned cart with your email

---

## 🎯 **Expected Result:**

After following these steps, when you:
1. Add item to cart
2. Enter email at checkout
3. Leave without purchasing
4. Wait 6 minutes

You should see the abandoned cart in your dashboard with the customer email, ready for recovery campaigns!
