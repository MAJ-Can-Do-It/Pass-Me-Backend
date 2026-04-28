import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { logger } from '../utils/logger.js';

export async function hashPassword(password) {
  try {
    const salt = await bcryptjs.genSalt(10);
    return await bcryptjs.hash(password, salt);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
}

export async function verifyPassword(password, hash) {
  try {
    return await bcryptjs.compare(password, hash);
  } catch (error) {
    logger.error('Error verifying password:', error);
    throw error;
  }
}

export function generateToken(userId, role, email) {
  const payload = {
    id: userId,
    role,
    email
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

  return token;
}

export function verifyTokenSync(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generatePasswordResetToken(userId) {
  const payload = {
    id: userId,
    type: 'password-reset',
    timestamp: Date.now()
  };

  return jwt.sign(payload, process.env.JWT_SECRET + 'reset', {
    expiresIn: '1h'
  });
}

export function verifyPasswordResetToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET + 'reset');
  } catch (error) {
    return null;
  }
}
