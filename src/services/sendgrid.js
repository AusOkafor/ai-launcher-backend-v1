import sgMail from '@sendgrid/mail'

class SendGridService {
    constructor() {
        this.initialized = false
        this.initialize()
    }

    initialize() {
        try {
            if (process.env.SENDGRID_API_KEY) {
                sgMail.setApiKey(process.env.SENDGRID_API_KEY)
                this.initialized = true
                console.log('SendGrid initialized')
            } else {
                console.warn('SendGrid API key not found. Email features will be disabled.')
            }
        } catch (error) {
            console.error('Error initializing SendGrid:', error)
        }
    }

    /**
     * Send cart recovery email
     */
    async sendRecoveryEmail(to, customerName, message, cart) {
        if (!this.initialized) {
            throw new Error('SendGrid not configured')
        }

        if (!process.env.SENDGRID_FROM_EMAIL) {
            throw new Error('SendGrid from email not configured')
        }

        try {
            const items = Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items)
            const itemNames = items.map(item => item.title || item.name).join(', ')
            
            const emailContent = this.generateRecoveryEmailHTML(customerName, message, cart, itemNames)
            const textContent = this.generateRecoveryEmailText(customerName, message, cart, itemNames)

            const msg = {
                to: to,
                from: process.env.SENDGRID_FROM_EMAIL,
                subject: `Complete Your Order - ${itemNames}`,
                text: textContent,
                html: emailContent,
                trackingSettings: {
                    clickTracking: {
                        enable: true,
                        enableText: true
                    },
                    openTracking: {
                        enable: true
                    }
                }
            }

            const result = await sgMail.send(msg)
            console.log(`Recovery email sent: ${result[0].headers['x-message-id']}`)
            
            return {
                messageId: result[0].headers['x-message-id'],
                status: 'sent'
            }
        } catch (error) {
            console.error('Error sending recovery email:', error)
            throw error
        }
    }

    /**
     * Generate HTML email content
     */
    generateRecoveryEmailHTML(customerName, message, cart, itemNames) {
        const items = Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items)
        const itemsHTML = items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.title || item.name}</strong><br>
                    <small>Quantity: ${item.quantity} | Price: $${item.price}</small>
                </td>
            </tr>
        `).join('')

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complete Your Order</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; margin-top: 0;">Hi ${customerName}!</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">${message}</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">Your Cart Items:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${itemsHTML}
                    </table>
                    <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee;">
                        <strong style="font-size: 18px;">Total: $${cart.total}</strong>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.STORE_URL || '#'}" 
                       style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Complete Your Order
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                    This offer expires in 24 hours. Don't miss out!
                </p>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #999;">
                <p>If you have any questions, please contact our support team.</p>
                <p>© 2024 ${process.env.STORE_NAME || 'Your Store'}. All rights reserved.</p>
            </div>
        </body>
        </html>
        `
    }

    /**
     * Generate text email content
     */
    generateRecoveryEmailText(customerName, message, cart, itemNames) {
        const items = Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items)
        const itemsText = items.map(item => 
            `- ${item.title || item.name} (Qty: ${item.quantity}, Price: $${item.price})`
        ).join('\n')

        return `
Hi ${customerName}!

${message}

Your Cart Items:
${itemsText}

Total: $${cart.total}

Complete your order here: ${process.env.STORE_URL || '#'}

This offer expires in 24 hours. Don't miss out!

If you have any questions, please contact our support team.

© 2024 ${process.env.STORE_NAME || 'Your Store'}. All rights reserved.
        `.trim()
    }

    /**
     * Send general email
     */
    async sendEmail(to, subject, textContent, htmlContent = null) {
        if (!this.initialized) {
            throw new Error('SendGrid not configured')
        }

        if (!process.env.SENDGRID_FROM_EMAIL) {
            throw new Error('SendGrid from email not configured')
        }

        try {
            const msg = {
                to: to,
                from: process.env.SENDGRID_FROM_EMAIL,
                subject: subject,
                text: textContent,
                html: htmlContent || textContent
            }

            const result = await sgMail.send(msg)
            console.log(`Email sent: ${result[0].headers['x-message-id']}`)
            
            return {
                messageId: result[0].headers['x-message-id'],
                status: 'sent'
            }
        } catch (error) {
            console.error('Error sending email:', error)
            throw error
        }
    }
}

export const sendGridService = new SendGridService()
