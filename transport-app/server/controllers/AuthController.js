const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'secret_dev_change_me';

class AuthController {
    static async register(req, res) {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
            // Check if user already exists
            const existingUser = await UserModel.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Bootstrap Logic: First user is ALWAYS superadmin
            const userCount = await UserModel.count();
            const finalRole = userCount === 0 ? 'superadmin' : (role || 'driver');

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const userId = await UserModel.create({
                username,
                hashed_password: hashedPassword,
                role: finalRole,
                status: 'ACTIVE'
            });
            
            res.status(201).json({ 
                message: 'User registered successfully', 
                user: { id: userId, username, role: finalRole } 
            });
        } catch (err) {
            console.error('Registration error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async login(req, res) {
        const { username, password } = req.body;
        console.log(`--- Login Attempt: ${username} ---`);

        if (!username || !password) {
            console.log('Error: Username or password missing in request body');
            return res.status(400).json({ error: 'Username and password are required' });
        }

        try {
            const user = await UserModel.findByUsername(username);
            
            if (!user) {
                console.log(`Error: User '${username}' not found in database.`);
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            console.log(`User found: ID ${user.id}, Username: ${user.username}, Role: ${user.role}`);
            console.log(`Comparing password: [${password}] with stored: [${user.hashed_password}]`);

            // Try Bcrypt match
            let isMatch = false;
            try {
                isMatch = await bcrypt.compare(password, user.hashed_password);
                console.log('Bcrypt comparison result:', isMatch);
            } catch (bcryptErr) {
                console.log('Bcrypt comparison error (usually happens with non-hashed passwords):', bcryptErr.message);
            }

            // FALLBACK: Plain text match (For manual testing/pre-existing users like 123)
            if (!isMatch && password === user.hashed_password) {
                console.log('NOTICE: Plain-text password match found! (Unsecure - please hash this user)');
                isMatch = true;
            }

            if (!isMatch) {
                console.log('Error: Password mismatch.');
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            console.log('Success: User authenticated successfully. Generating JWT...');
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log('Success: JWT Generated.');
            res.json({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, role: user.role }
            });
        } catch (err) {
            console.error('CRITICAL: Internal server error during login:', err.message);
            res.status(500).json({ error: 'Internal server error: ' + err.message });
        }
    }
}

module.exports = AuthController;
