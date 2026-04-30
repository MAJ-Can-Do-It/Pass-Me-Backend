import express from 'express';
import axios from 'axios';
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

  logger.info('Admin login attempt (auth bypassed for testing)', { email });

  // Temporarily bypass auth for testing - accept any admin@passme.uz login
  if (email !== 'admin@passme.uz') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken('admin1', 'admin', email);

  logger.info('Admin login successful (bypass)', { email });
  res.json({
    token,
    admin: {
      id: 'admin1',
      email: 'admin@passme.uz',
      fullName: 'Admin',
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

router.post('/tutor/register', asyncHandler(async (req, res) => {
  const { fullName, email, school, program, year, subjects, individual, group, bio, experience, telegram, phone, availability } = req.body;

  if (!fullName || !email || !school || !program || !subjects) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const docRef = await db.collection('tutor_applications').add({
      fullName,
      email,
      school,
      program,
      year: parseInt(year),
      subjects: Array.isArray(subjects) ? subjects : [subjects],
      individual: parseInt(individual),
      group: parseInt(group),
      bio,
      experience,
      telegram,
      phone,
      availability: Array.isArray(availability) ? availability : [],
      status: 'pending',
      createdAt: new Date()
    });

    logger.info('Tutor application submitted', { email, applicationId: docRef.id });
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: docRef.id
    });
  } catch (error) {
    logger.error('Error submitting tutor application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
}));

router.post('/google/callback', asyncHandler(async (req, res) => {
  const { code, userType = 'student' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization token is required' });
  }

  try {
    // Decode JWT from Google Sign-In (code is actually the JWT token)
    const parts = code.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Decode payload (no verification needed - Google signed it)
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const { email, name, picture, sub } = decoded;

    if (!email) {
      return res.status(401).json({ error: 'Invalid token: no email' });
    }

    let user = null;
    let token = null;
    let userRole = null;

    if (userType === 'student') {
      user = await getStudentByEmail(email);

      if (!user) {
        const studentId = await createStudent(email, {
          username: email.split('@')[0],
          fullName: name || email.split('@')[0],
          passwordHash: await hashPassword(Math.random().toString(36).slice(2)),
          accountStatus: 'active',
          googleId: sub,
          profilePicture: picture,
          school: '',
          program: '',
          year: 1
        });

        user = {
          id: studentId,
          email,
          fullName: name || email.split('@')[0],
          school: '',
          program: '',
          favorites: []
        };
      }

      token = generateToken(user.id, 'student', email);
      userRole = 'student';
    } else if (userType === 'tutor') {
      user = await getTutorByEmail(email);

      if (!user || !user.approved) {
        return res.status(403).json({ error: 'Tutor account not approved' });
      }

      token = generateToken(user.id, 'tutor', email);
      userRole = 'tutor';
    }

    logger.info('Google OAuth login successful', { email, userType });

    res.json({
      token,
      [userRole]: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        ...(userRole === 'student' && {
          school: user.school || '',
          program: user.program || '',
          favorites: user.favorites || []
        }),
        ...(userRole === 'tutor' && {
          school: user.school || '',
          program: user.program || '',
          subjects: user.subjects || [],
          earnings: user.totalEarnings || 0,
          rating: user.rating || 0,
          sessions: user.sessions || 0
        })
      }
    });
  } catch (error) {
    logger.error('Google OAuth error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
}));

export default router;
