/**
 * Role-Based Access Control (RBAC) Middlewares
 */

class RoleMiddleware {
    /**
     * Generic role check middleware
     * @param {Array|String} allowedRoles - Role(s) permitted to access the route
     */
    static checkRole(allowedRoles) {
        return (req, res, next) => {
            const user = req.user; // Attached by authMiddleware (the JWT logic)

            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!roles.includes(user.role)) {
                return res.status(403).json({ 
                    error: 'Forbidden', 
                    message: `Access denied. Requires one of the following roles: ${roles.join(', ')}` 
                });
            }

            next();
        };
    }

    // Shorthands
    static isSuperAdmin = this.checkRole('superadmin');
    static isAdmin = this.checkRole(['superadmin', 'admin']);
    static isStaff = this.checkRole(['superadmin', 'admin', 'staff']); // New shorthand for staff-level operations
    static isDriver = this.checkRole(['superadmin', 'admin', 'driver']);
    
    // Admin check for Driver modifications (Superadmin, Admin and Staff can manage drivers)
    static canManageDrivers = this.checkRole(['superadmin', 'admin', 'staff']);
}

module.exports = RoleMiddleware;
