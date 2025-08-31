import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Import the Express app from src/server.js
import app from '../src/server.js'

// Load environment variables
dotenv.config()

// Export the handler for Vercel
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    // Use the Express app to handle the request
    return app(req, res)
}