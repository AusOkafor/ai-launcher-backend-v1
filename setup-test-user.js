import { prisma } from './src/db.js';
import bcrypt from 'bcryptjs';

async function setupTestUser() {
    try {
        console.log('Setting up test user and workspace...');

        // Create test user
        const hashedPassword = await bcrypt.hash('testpassword123', 10);

        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                email: 'test@example.com',
                passwordHash: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                isActive: true,
                emailVerified: true
            }
        });

        console.log('✅ Test user created:', user.id);

        // Create test workspace
        const workspace = await prisma.workspace.upsert({
            where: { slug: 'test-workspace' },
            update: {},
            create: {
                name: 'Test Workspace',
                slug: 'test-workspace',
                ownerId: user.id,
                status: 'ACTIVE'
            }
        });

        console.log('✅ Test workspace created:', workspace.id);

        // Add user to workspace
        const workspaceMember = await prisma.workspaceMember.upsert({
            where: {
                workspaceId_userId: {
                    workspaceId: workspace.id,
                    userId: user.id
                }
            },
            update: {},
            create: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'ADMIN'
            }
        });

        console.log('✅ User added to workspace');

        // Generate test JWT token
        const jwt = (await
            import ('jsonwebtoken')).default;
        const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production";

        const payload = {
            userId: user.id,
            email: user.email,
            workspaceId: workspace.id
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        console.log('\n🎉 Setup complete!');
        console.log('\nTest JWT Token:');
        console.log(token);
        console.log('\nUse this token in Postman:');
        console.log(`Authorization: Bearer ${token}`);
        console.log('\nTest user details:');
        console.log(`User ID: ${user.id}`);
        console.log(`Workspace ID: ${workspace.id}`);
        console.log(`Email: ${user.email}`);

    } catch (error) {
        console.error('❌ Error setting up test user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

setupTestUser();