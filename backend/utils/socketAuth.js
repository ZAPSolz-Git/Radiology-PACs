import cookie from 'cookie';
import User from '../models/User.js';
import { verifyToken } from './generateToken.js';

/**
 * Authenticate socket connection using cookies and RS256
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies.accessToken || socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // 1. Verify RS256 token
    const decoded = verifyToken(token);

    // 2. Fetch fresh user data from DB (Production rule: never trust client role)
    const user = await User.findById(decoded.userId || decoded.id).select('name role status');

    if (!user || user.status !== 'active') {
      return next(new Error('Authentication error: User not found or inactive'));
    }

    // 3. Attach user data to socket
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userName = user.name;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid or expired token'));
  }
};

/**
 * Authorize user access to specific rooms based on role
 */
export const authorizeRoomAccess = (userId, userRole, roomId) => {
  // In a real implementation, you would check if the user has access to the specific case/room
  return true; // Placeholder - implement proper authorization logic
};