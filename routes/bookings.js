import express from 'express';
import { createBooking, getBookingById, approveBooking, completeBooking, cancelBooking } from '../services/bookingService.js';
import { getStudentById, getTutorById } from '../services/firebase.js';
import { sendBookingNotificationToTutor, sendBookingConfirmationEmail } from '../services/email.js';
import { sendBookingNotification } from '../services/telegram.js';
import { bookingValidation, validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken, verifyStudent, verifyTutor } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.post('/', verifyStudent, bookingValidation, validate, asyncHandler(async (req, res) => {
  const { tutorId, date, time, duration, subject, type, studentNotes, amount, platformFee, tutorEarnings } = req.body;
  const studentId = req.user.id;
  const student = await getStudentById(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Validate course pricing
  const validPrices = { individual: 800000, group: 350000 };
  const expectedPrice = validPrices[type];
  if (!expectedPrice || amount !== expectedPrice) {
    return res.status(400).json({ error: 'Invalid course price' });
  }

  const bookingId = await createBooking({
    studentId, tutorId, studentName: student.fullName, tutorName: 'Tutor',
    studentEmail: student.email, tutorEmail: 'tutor@passme.uz', date, time, duration, subject, type,
    studentNotes: studentNotes || '', amount, platformFee, tutorEarnings
  });

  const bookingDetails = { bookingId, studentId, tutorId, studentName: student.fullName,
    studentEmail: student.email, tutorName: 'Tutor', subject, date, time, duration, type,
    studentNotes: studentNotes || '' };

  try {
    await sendBookingConfirmationEmail(student.email, student.fullName, bookingDetails);
    if (process.env.TELEGRAM_ADMIN_GROUP_ID) await sendBookingNotification(process.env.TELEGRAM_ADMIN_GROUP_ID, bookingDetails);
  } catch (emailError) {
    logger.warn('Failed to send booking notifications', emailError);
  }

  logger.info('Booking created', { bookingId, studentId, tutorId });
  res.status(201).json({ bookingId, message: 'Booking request submitted successfully' });
}));

router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (req.user.role === 'student' && booking.studentId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (req.user.role === 'tutor' && booking.tutorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json(booking);
}));

router.put('/:id', verifyStudent, asyncHandler(async (req, res) => {
  const { date, time, duration } = req.body;
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.studentId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Cannot reschedule this booking' });
  const updateData = {};
  if (date) updateData.date = date;
  if (time) updateData.time = time;
  if (duration) updateData.duration = duration;
  await db.collection('bookings').doc(req.params.id).update({ ...updateData, updatedAt: new Date() });
  logger.info('Booking rescheduled', { bookingId: req.params.id });
  res.json({ message: 'Booking rescheduled successfully' });
}));

router.delete('/:id', verifyStudent, asyncHandler(async (req, res) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.studentId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  await cancelBooking(req.params.id);
  logger.info('Booking cancelled', { bookingId: req.params.id });
  res.json({ message: 'Booking cancelled successfully' });
}));

router.put('/:id/approve', verifyTutor, asyncHandler(async (req, res) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.tutorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not pending' });
  await db.collection('bookings').doc(req.params.id).update({ status: 'approved', approvedAt: new Date() });
  logger.info('Booking approved by tutor', { bookingId: req.params.id, tutorId: req.user.id });
  res.json({ message: 'Booking approved successfully' });
}));

router.put('/:id/reject', verifyTutor, asyncHandler(async (req, res) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.tutorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not pending' });
  await db.collection('bookings').doc(req.params.id).update({ status: 'rejected', rejectedAt: new Date() });
  logger.info('Booking rejected by tutor', { bookingId: req.params.id, tutorId: req.user.id });
  res.json({ message: 'Booking rejected successfully' });
}));

router.post('/:id/complete', verifyTutor, asyncHandler(async (req, res) => {
  const booking = await getBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.tutorId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (booking.status !== 'approved') return res.status(400).json({ error: 'Booking is not approved' });

  // Use tutorEarnings from booking (70% of course price)
  const tutorEarnings = booking.tutorEarnings || 0;
  if (tutorEarnings <= 0) return res.status(400).json({ error: 'Invalid booking amount' });

  await completeBooking(req.params.id, tutorEarnings);
  logger.info('Booking completed', { bookingId: req.params.id, tutorEarnings });
  res.json({ message: 'Booking marked as completed' });
}));

export default router;
