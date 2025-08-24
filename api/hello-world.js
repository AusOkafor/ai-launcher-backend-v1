export default function handler(req, res) {
    res.status(200).json({
        message: 'Hello World!',
        success: true,
        timestamp: new Date().toISOString()
    })
}
