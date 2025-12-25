const { randomUUID } = require('crypto');

/**
 * Session middleware for guest users
 * Generates or retrieves sessionId from cookie
 */
const sessionMiddleware = (req, res, next) => {
  const cookieSessionId = req.cookies?.sessionId;
  let sessionId = cookieSessionId;``

  // Support header-based session id (e.g. fresh browser state before cookie is set)
  if (!sessionId && req.headers['x-session-id']) {
    sessionId = req.headers['x-session-id'];
  }

  if (!sessionId) {
    sessionId = randomUUID();
    res.cookie('sessionId', sessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: false, // Allow JS access for guest carts
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  } else if (!cookieSessionId) {
    // Persist header session id into cookie
    res.cookie('sessionId', sessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  req.sessionId = sessionId;
  next();
};

module.exports = sessionMiddleware;

