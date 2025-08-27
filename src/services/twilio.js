import twilio from 'twilio'

class TwilioService {
    constructor() {
        this.client = null
        this.initialize()
    }

    initialize() {
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
                console.log('Twilio client initialized')
            } else {
                console.warn('Twilio credentials not found. SMS/WhatsApp features will be disabled.')
            }
        } catch (error) {
            console.error('Error initializing Twilio:', error)
        }
    }

    /**
     * Send WhatsApp message
     */
    async sendWhatsApp(to, message) {
        if (!this.client) {
            throw new Error('Twilio not configured')
        }

        if (!process.env.TWILIO_WHATSAPP_NUMBER) {
            throw new Error('WhatsApp number not configured')
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${to}`
            })

            console.log(`WhatsApp message sent: ${result.sid}`)
            return result
        } catch (error) {
            console.error('Error sending WhatsApp message:', error)
            throw error
        }
    }

    /**
     * Send SMS message
     */
    async sendSMS(to, message) {
        if (!this.client) {
            throw new Error('Twilio not configured')
        }

        if (!process.env.TWILIO_PHONE_NUMBER) {
            throw new Error('SMS number not configured')
        }

        try {
            const result = await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to
            })

            console.log(`SMS message sent: ${result.sid}`)
            return result
        } catch (error) {
            console.error('Error sending SMS message:', error)
            throw error
        }
    }

    /**
     * Send message via best available channel
     */
    async sendMessage(to, message, preferredChannel = 'whatsapp') {
        try {
            if (preferredChannel === 'whatsapp') {
                return await this.sendWhatsApp(to, message)
            } else {
                return await this.sendSMS(to, message)
            }
        } catch (error) {
            // Fallback to SMS if WhatsApp fails
            if (preferredChannel === 'whatsapp') {
                console.log('WhatsApp failed, trying SMS as fallback')
                return await this.sendSMS(to, message)
            }
            throw error
        }
    }

    /**
     * Check message status
     */
    async getMessageStatus(messageId) {
        if (!this.client) {
            throw new Error('Twilio not configured')
        }

        try {
            const message = await this.client.messages(messageId).fetch()
            return {
                sid: message.sid,
                status: message.status,
                direction: message.direction,
                dateCreated: message.dateCreated,
                dateUpdated: message.dateUpdated,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage
            }
        } catch (error) {
            console.error('Error getting message status:', error)
            throw error
        }
    }
}

export const twilioService = new TwilioService()
