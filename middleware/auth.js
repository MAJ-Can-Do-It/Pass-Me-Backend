import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

export function verifyStudent(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required.' });
    }
    next();
  });
}

export function verifyTutor(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'tutor') {
      return res.status(403).json({ error: 'Tutor access required.' });
    }
    next();
  });
}
