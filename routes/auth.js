import express from 'express';
import {
  getAdminByEmail,
  getStudentByEmail,
  getTutorByEmail,
  createStudent
} from '../services/firebase.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generatePasswordResetToken,
  verifyPasswordResetToken
} from '../services/auth.js';
import {
  loginValidation,
  studentRegisterValidation,
  validate
} from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.post('/admin/login', loginValidation, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await getAdminByEmail(email);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const passwordMatch = await verifyPassword(password, admin.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(admin.id || email, 'admin', email);

  logger.info('Admin login successful', { email });
  res.json({
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: 'admin'
    }
  });
}));

router.post('/student/register', studentRegisterValidation, validate, asyncHandler(async (req, res) => {
  const { email, fullName, school, program, year, subjects } = req.body;

  const existingStudent = await getStudentByEmail(email);
  if (existingStudent) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const tempPassword = email.split('@')[0];
  const passwordHash = await hashPassword(tempPassword);

  const studentId = await createStudent(email, {
    username: email.split('@')[0],
    fullName,
    school,
    program,
    year: parseInt(year),
    subjects: Array.isArray(subjects) ? subjects : [],
    passwordHash,
    accountStatus: 'active'
  });

  const token = generateToken(studentId, 'student', email);

  logger.info('Student registered', { email, studentId });
  res.status(201).json({
    token,
    student: {
      id: studentId,
      email,
      fullName,
      school,
      program
    }
  });
}));

router.post('/student/login', loginValidation, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const student = await getStudentByEmail(email);
  if (!student) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (student.accountStatus === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
  }

  const passwordMatch = await verifyPassword(password, student.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(student.id, 'student', email);

  logger.info('Student login successful', { email });
  res.json({
    token,
    student: {
      id: student.id,
      email: student.email,
      fullName: student.fullName,
      school: student.school,
      program: student.program,
      favorites: student.favorites || []
    }
  });
}));

router.post('/tutor/login', loginValidation, validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const tutor = await getTutorByEmail(email);
  if (!tutor || !tutor.approved) {
    return res.status(401).json({ error: 'Invalid credentials or account not approved' });
  }

  if (tutor.accountStatus === 'blocked') {
    return res.status(403).json({ error: 'Account is blocked' });
  }

  const passwordMatch = await verifyPassword(password, tutor.passwordHash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(tutor.id, 'tutor', email);

  logger.info('Tutor login successful', { email });
  res.json({
    token,
    tutor: {
      id: tutor.id,
      email: tutor.email,
      fullName: tutor.fullName,
      school: tutor.school,
      program: tutor.program,
      subjects: tutor.subjects,
      earnings: tutor.totalEarnings || 0,
      rating: tutor.rating || 0,
      sessions: tutor.sessions || 0
    }
  });
}));

router.post('/student/reset-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const student = await getStudentByEmail(email);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const resetToken = generatePasswordResetToken(student.id);
  await sendPasswordResetEmail(email, resetToken);

  logger.info('Password reset email sent to student', { email });
  res.json({ message: 'Password reset link sent to email' });
}));

router.post('/tutor/reset-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const tutor = await getTutorByEmail(email);
  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  const resetToken = generatePasswordResetToken(tutor.id);
  await sendPasswordResetEmail(email, resetToken);

  logger.info('Password reset email sent to tutor', { email });
  res.json({ message: 'Password reset link sent to email' });
}));

router.post('/reset-password-confirm', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const decoded = verifyPasswordResetToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = await hashPassword(newPassword);
  const userId = decoded.id;

  try {
    await Promise.all([
      (async () => {
        try {
          const studentDoc = await db.collection('students').doc(userId).get();
          if (studentDoc.exists) {
            await db.collection('students').doc(userId).update({ passwordHash });
          }
        } catch (e) {}
      })(),
      (async () => {
        try {
          const tutorDoc = await db.collection('tutors').doc(userId).get();
          if (tutorDoc.exists) {
            await db.collection('tutors').doc(userId).update({ passwordHash });
          }
        } catch (e) {}
      })()
    ]);

    logger.info('Password reset successful', { userId });
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
}));

export default router;
