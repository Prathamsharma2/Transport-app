const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');

class UserController {
    /**
     * Super Admin: Get all users (Admins, Drivers, etc.)
     */
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAll();
            res.json(users);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    /**
     * Super Admin/Admin: Create a new user (Role-based)
     */
    static async createUser(req, res) {
        const { username, name, email, password, role } = req.body;
        const creatorRole = req.user.role;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password and role are required' });
        }

        // Admin can only create Drivers
        if (creatorRole === 'admin' && role !== 'driver') {
            return res.status(403).json({ error: 'Admins can only create Driver accounts' });
        }

        try {
            // Check uniqueness
            const exists = await UserModel.findByUsername(username);
            if (exists) return res.status(400).json({ error: 'Username already exists' });
            
            const emailExists = await UserModel.findByEmail(email);
            if (emailExists) return res.status(400).json({ error: 'Email already exists' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const userId = await UserModel.create({
                username, name, email, 
                hashed_password: hashedPassword, 
                role, 
                status: 'ACTIVE'
            });

            res.status(201).json({ message: 'User created', userId });
        } catch (e) {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }

    /**
     * Super Admin: Update any user data / reset password
     */
    static async updateUser(req, res) {
        const { id } = req.params;
        const { name, email, status, role, password } = req.body;

        try {
            const updateData = { name, email, status, role };
            
            // Remove undefined fields
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            if (password) {
                const salt = await bcrypt.genSalt(10);
                updateData.hashed_password = await bcrypt.hash(password, salt);
            }

            await UserModel.update(id, updateData);
            res.json({ message: 'User updated successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Update failed' });
        }
    }

    /**
     * Super Admin: Delete any user
     */
    static async deleteUser(req, res) {
        const { id } = req.params;
        try {
            await UserModel.delete(id);
            res.json({ message: 'User deleted' });
        } catch (e) {
            res.status(500).json({ error: 'Delete failed' });
        }
    }

    /**
     * Activate/Deactivate User
     */
    static async toggleUserStatus(req, res) {
        const { id } = req.params;
        try {
            const newStatus = await UserModel.toggleStatus(id);
            res.json({ message: `User status changed to ${newStatus}`, status: newStatus });
        } catch (e) {
            res.status(500).json({ error: 'Status toggle failed' });
        }
    }
}

module.exports = UserController;
