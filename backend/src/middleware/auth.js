import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied. No bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key_development_only_123456');

    // Retrieve user profile using Supabase SDK
    const { data: user, error } = await db
      .from('users')
      .select('id, email, full_name, phone_number, is_admin')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User associated with this token not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export function verifyAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }

  next();
}
