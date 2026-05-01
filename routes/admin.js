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
  res.json({ students: students.length, tutors: tutors.length, users: [...students, ...tutors] });
}));

router.post('/users/:id/block', asyncHandler(async (req, res) => {
  const { userType } = req.body;
  if (!userType || !['student', 'tutor'].includes(userType)) return res.status(400).json({ error: 'Valid userType required' });
  const collection = userType === 'student' ? 'students' : 'tutors';

  // Get current user status
  const user = await db.collection(collection).doc(req.params.id).get();
  if (!user.exists) return res.status(404).json({ error: 'User not found' });

  const currentStatus = user.data().accountStatus;
  const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
  const updateData = { accountStatus: newStatus };

  if (newStatus === 'blocked') {
    updateData.blockedAt = new Date();
  } else {
    updateData.unblockedAt = new Date();
  }

  await db.collection(collection).doc(req.params.id).update(updateData);
  logger.info('User status toggled', { userId: req.params.id, userType, newStatus });
  res.json({ message: `User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully` });
}));

// Booking Management
router.get('/bookings/:id', asyncHandler(async (req, res) => {
  const booking = await db.collection('bookings').doc(req.params.id).get();
  if (!booking.exists) return res.status(404).json({ error: 'Booking not found' });

  const bookingData = booking.data();
  const student = await db.collection('students').doc(bookingData.studentId).get();
  const tutor = await db.collection('tutors').doc(bookingData.tutorId).get();

  res.json({
    booking: { id: booking.id, ...bookingData },
    student: student.exists ? { id: student.id, ...student.data() } : null,
    tutor: tutor.exists ? { id: tutor.id, ...tutor.data() } : null
  });
}));

router.put('/bookings/:id/approve', asyncHandler(async (req, res) => {
  const booking = await db.collection('bookings').doc(req.params.id).get();
  if (!booking.exists) return res.status(404).json({ error: 'Booking not found' });

  await db.collection('bookings').doc(req.params.id).update({
    status: 'approved',
    approvedAt: new Date(),
    approvedBy: 'admin'
  });

  logger.info('Booking approved', { bookingId: req.params.id });
  res.json({ message: 'Booking approved' });
}));

router.put('/bookings/:id/reject', asyncHandler(async (req, res) => {
  const booking = await db.collection('bookings').doc(req.params.id).get();
  if (!booking.exists) return res.status(404).json({ error: 'Booking not found' });

  await db.collection('bookings').doc(req.params.id).update({
    status: 'rejected',
    rejectedAt: new Date(),
    rejectedBy: 'admin'
  });

  logger.info('Booking rejected', { bookingId: req.params.id });
  res.json({ message: 'Booking rejected' });
}));

router.put('/bookings/:id/complete', asyncHandler(async (req, res) => {
  const booking = await db.collection('bookings').doc(req.params.id).get();
  if (!booking.exists) return res.status(404).json({ error: 'Booking not found' });

  await db.collection('bookings').doc(req.params.id).update({
    status: 'completed',
    completedAt: new Date()
  });

  logger.info('Booking completed', { bookingId: req.params.id });
  res.json({ message: 'Booking completed' });
}));

// User Search
router.get('/search/users', asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });

  const searchLower = q.toLowerCase();
  const [studentsSnapshot, tutorsSnapshot] = await Promise.all([
    db.collection('students').get(),
    db.collection('tutors').where('approved', '==', true).get()
  ]);

  const students = studentsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data(), type: 'student' }))
    .filter(s => s.fullName?.toLowerCase().includes(searchLower) || s.email?.toLowerCase().includes(searchLower));

  const tutors = tutorsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data(), type: 'tutor' }))
    .filter(t => t.fullName?.toLowerCase().includes(searchLower) || t.email?.toLowerCase().includes(searchLower));

  res.json({ users: [...students, ...tutors] });
}));

// User Profile with Booking History
router.get('/users/:id', asyncHandler(async (req, res) => {
  const { userType } = req.query;
  if (!userType || !['student', 'tutor'].includes(userType)) {
    return res.status(400).json({ error: 'userType query parameter required (student|tutor)' });
  }

  const collection = userType === 'student' ? 'students' : 'tutors';
  const user = await db.collection(collection).doc(req.params.id).get();
  if (!user.exists) return res.status(404).json({ error: 'User not found' });

  const userData = user.data();
  let bookings = [];

  if (userType === 'student') {
    const bookingsSnapshot = await db.collection('bookings').where('studentId', '==', req.params.id).get();
    bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    const bookingsSnapshot = await db.collection('bookings').where('tutorId', '==', req.params.id).get();
    bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  res.json({
    user: { id: user.id, ...userData, type: userType },
    bookings: bookings.sort((a, b) => (b.date?.getTime?.() || 0) - (a.date?.getTime?.() || 0))
  });
}));

// Edit Tutor Application Before Approval
router.put('/tutors/:id', asyncHandler(async (req, res) => {
  const { fullName, school, program, subjects, individual, group, bio } = req.body;
  const app = await db.collection('tutor_applications').doc(req.params.id).get();
  if (!app.exists) return res.status(404).json({ error: 'Application not found' });

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (school) updateData.school = school;
  if (program) updateData.program = program;
  if (subjects) updateData.subjects = Array.isArray(subjects) ? subjects : [subjects];
  if (individual) updateData.individual = parseInt(individual);
  if (group) updateData.group = parseInt(group);
  if (bio) updateData.bio = bio;

  await db.collection('tutor_applications').doc(req.params.id).update(updateData);
  logger.info('Tutor application edited', { applicationId: req.params.id });
  res.json({ message: 'Application updated', applicationId: req.params.id });
}));

export default router;
