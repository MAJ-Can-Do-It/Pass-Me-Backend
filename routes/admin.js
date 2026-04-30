import express from 'express';
import { getTutorApplications, approveTutorApplication, rejectTutorApplication, getAllTutors, getTutorById } from '../services/firebase.js';
import { getAllBookings } from '../services/bookingService.js';
import { sendTutorApprovalEmail } from '../services/email.js';
import { hashPassword, generatePasswordResetToken } from '../services/auth.js';
import { generateTempPassword } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [tutors, bookings, applications] = await Promise.all([getAllTutors(), getAllBookings(), getTutorApplications()]);
  const totalRevenue = bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.platformFee || 0), 0);
  res.json({
    stats: {
      tutors: tutors.length,
      approvedTutors: tutors.filter(t => t.approved).length,
      pendingApplications: applications.length,
      bookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      totalRevenue
    }
  });
}));

router.get('/tutors/pending', asyncHandler(async (req, res) => {
  const applications = await getTutorApplications();
  res.json({ count: applications.length, applications });
}));

router.post('/tutors/:id/approve', asyncHandler(async (req, res) => {
  const app = await db.collection('tutor_applications').doc(req.params.id).get();
  if (!app.exists) return res.status(404).json({ error: 'Application not found' });
  const appData = app.data();
  const tempPassword = generateTempPassword(appData.fullName);
  const passwordHash = await hashPassword(tempPassword);
  const resetToken = generatePasswordResetToken(req.params.id);
  const tutorId = await approveTutorApplication(req.params.id, { passwordHash });
  await sendTutorApprovalEmail(appData.email, appData.fullName, tempPassword, resetToken);
  logger.info('Tutor application approved', { applicationId: req.params.id, tutorId, email: appData.email });
  res.json({ message: 'Tutor approved and email sent', tutorId });
}));

router.post('/tutors/:id/reject', asyncHandler(async (req, res) => {
  await rejectTutorApplication(req.params.id);
  logger.info('Tutor application rejected', { applicationId: req.params.id });
  res.json({ message: 'Application rejected' });
}));

router.get('/bookings', asyncHandler(async (req, res) => {
  const bookings = await getAllBookings();
  res.json({ count: bookings.length, bookings });
}));

router.get('/revenue', asyncHandler(async (req, res) => {
  const bookings = await getAllBookings();
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.platformFee || 0), 0);
  const totalTutorEarnings = completedBookings.reduce((sum, b) => sum + (b.tutorEarnings || 0), 0);
  res.json({
    totalRevenue, totalTutorEarnings, completedBookings: completedBookings.length,
    breakdown: { platform: totalRevenue, tutors: totalTutorEarnings }
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const [studentsSnapshot, tutorsSnapshot] = await Promise.all([
    db.collection('students').get(),
    db.collection('tutors').where('approved', '==', true).get()
  ]);
  const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'student' }));
  const tutors = tutorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'tutor' }));
  res.json({ students: students.length, tutors: tutors.length, users: [...students, tutors] });
}));

router.post('/users/:id/block', asyncHandler(async (req, res) => {
  const { userType } = req.body;
  if (!userType || !['student', 'tutor'].includes(userType)) return res.status(400).json({ error: 'Valid userType required' });
  const collection = userType === 'student' ? 'students' : 'tutors';
  await db.collection(collection).doc(req.params.id).update({ accountStatus: 'blocked', blockedAt: new Date() });
  logger.info('User blocked', { userId: req.params.id, userType });
  res.json({ message: 'User blocked successfully' });
}));

export default router;
