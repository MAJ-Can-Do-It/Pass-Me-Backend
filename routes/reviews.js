import express from 'express';
import { getBookingById } from '../services/firebase.js';
import { reviewValidation, validate } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.post('/', verifyToken, reviewValidation, validate, asyncHandler(async (req, res) => {
  const { bookingId, rating, review } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  const booking = await getBookingById(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed bookings' });
  if (userRole === 'student' && booking.studentId !== userId) return res.status(403).json({ error: 'Access denied' });
  if (userRole === 'tutor' && booking.tutorId !== userId) return res.status(403).json({ error: 'Access denied' });

  let existingReview = await db.collection('reviews').where('bookingId', '==', bookingId).limit(1).get();
  let reviewData = existingReview.empty ? {} : existingReview.docs[0].data();
  if (userRole === 'student') {
    reviewData.studentId = booking.studentId;
    reviewData.studentName = booking.studentName;
    reviewData.studentRating = rating;
    reviewData.studentReview = review;
  } else if (userRole === 'tutor') {
    reviewData.tutorId = booking.tutorId;
    reviewData.tutorName = booking.tutorName;
    reviewData.tutorRating = rating;
    reviewData.tutorReview = review;
  }
  reviewData.bookingId = bookingId;
  reviewData.createdAt = new Date();

  let reviewId;
  if (existingReview.empty) {
    const reviewRef = await db.collection('reviews').add(reviewData);
    reviewId = reviewRef.id;
  } else {
    reviewId = existingReview.docs[0].id;
    await db.collection('reviews').doc(reviewId).update(reviewData);
  }
  logger.info('Review posted', { reviewId, bookingId, userRole });
  res.status(201).json({ reviewId, message: 'Review posted successfully' });
}));

router.get('/booking/:bookingId', asyncHandler(async (req, res) => {
  const reviewSnapshot = await db.collection('reviews').where('bookingId', '==', req.params.bookingId).limit(1).get();
  if (reviewSnapshot.empty) return res.status(404).json({ error: 'No review found' });
  const review = reviewSnapshot.docs[0].data();
  res.json({ id: reviewSnapshot.docs[0].id, ...review });
}));

export default router;
