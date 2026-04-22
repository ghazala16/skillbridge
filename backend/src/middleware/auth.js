//const { createClerkClient } = require('@clerk/backend');
const { query } = require('../db/pool');

//const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const { verifyToken } = require('@clerk/backend');
/**
 * requireAuth middleware
 * - Verifies Clerk session token
 * - Looks up user in our DB
 * - Attaches req.user = { id, clerk_user_id, name, email, role, institution_id_fk }
 */
// async function requireAuth(req, res, next) {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ error: 'Missing authorization header' });
//     }

//     const token = authHeader.replace('Bearer ', '');

//     // Verify token with Clerk
//     let clerkUser;
//     try {
//       const verifiedToken = await clerk.verifyToken(token);
//       clerkUser = verifiedToken;
//     } catch (err) {
//       return res.status(401).json({ error: 'Invalid or expired token' });
//     }

//     // Look up user in our database
//     const result = await query(
//       'SELECT * FROM users WHERE clerk_user_id = $1',
//       [clerkUser.sub]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found in system. Please complete registration.' });
//     }

//     req.user = result.rows[0];
//     next();
//   } catch (err) {
//     console.error('Auth middleware error:', err);
//     res.status(500).json({ error: 'Authentication error' });
//   }
// }



async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // ✅ IMPORTANT: Clerk user id is in payload.sub
    const clerkUserId = payload.sub;

    const result = await query(
      'SELECT * FROM users WHERE clerk_user_id = $1',
      [clerkUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found in system. Please complete registration.'
      });
    }

    req.user = result.rows[0];
    next();

  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
}
/**
 * requireRole middleware factory
 * Usage: requireRole(['trainer', 'institution'])
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
