import jwt from 'jsonwebtoken';

// Use the same JWT_SECRET from your .env file
const JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production";

// Create a test payload
const payload = {
    userId: "test-user-123",
    email: "test@example.com",
    workspaceId: "test-workspace-123"
};

// Generate the token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this token in your Authorization header:');
console.log(`Authorization: Bearer ${token}`);
