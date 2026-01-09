/**
 * TPro BBS Authentication Middleware
 */

function requireAuth(req, res, next) {
    if (!req.session.tproUserId) {
        return res.redirect('/tprobbs/');
    }
    next();
}

function loadUser(db) {
    return (req, res, next) => {
        if (!req.session.tproUserId) {
            return next();
        }

        const user = db.prepare(`
            SELECT u.*, c.name as class_name, al.name as access_name,
                   al.time_limit as access_time_limit,
                   w.name as weapon_name, w.price as weapon_price,
                   a.name as armor_name, a.price as armor_price,
                   h.name as home_name, s.name as security_name
            FROM users u
            LEFT JOIN classes c ON u.class = c.id
            LEFT JOIN access_levels al ON u.access_level = al.id
            LEFT JOIN weapons w ON u.weapon = w.id
            LEFT JOIN armor a ON u.armor = a.id
            LEFT JOIN homes h ON u.home = h.id
            LEFT JOIN security s ON u.security = s.id
            WHERE u.id = ?
        `).get(req.session.tproUserId);

        if (!user) {
            req.session.tproUserId = null;
            return res.redirect('/tprobbs/');
        }

        // Calculate time remaining (from access level)
        const loginTime = req.session.tproLoginTime || Date.now();
        const elapsed = Math.floor((Date.now() - loginTime) / 60000);
        const timeRemaining = Math.max(0, (user.access_time_limit || 60) - elapsed);

        req.user = {
            ...user,
            timeRemaining
        };
        res.locals.user = req.user;
        next();
    };
}

module.exports = { requireAuth, loadUser };
