import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';
import { calculateEarnings, calculatePlatformFee } from '../utils/validators.js';

export async function createBooking(bookingData) {
  try {
    const docRef = await db.collection('bookings').add({
      ...bookingData,
      status: 'pending',
      createdAt: new Date(),
      approvedAt: null,
      completedAt: null,
      cancelledAt: null
    });

    logger.info('Booking created', { bookingId: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.error('Error creating booking:', error);
    throw error;
  }
}

export async function getBookingById(bookingId) {
  try {
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting booking:', error);
    throw error;
  }
}

export async function approveBooking(bookingId, tutorEmail) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const booking = await bookingRef.get();

    if (!booking.exists) {
      throw new Error('Booking not found');
    }

    await bookingRef.update({
      status: 'approved',
      approvedAt: new Date()
    });

    logger.info('Booking approved', { bookingId, tutorEmail });
    return booking.data();
  } catch (error) {
    logger.error('Error approving booking:', error);
    throw error;
  }
}

export async function completeBooking(bookingId, amount) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const booking = await bookingRef.get();

    if (!booking.exists) {
      throw new Error('Booking not found');
    }

    const tutorEarnings = calculateEarnings(amount);
    const platformFee = calculatePlatformFee(amount);

    await bookingRef.update({
      status: 'completed',
      completedAt: new Date(),
      amount: amount,
      tutorEarnings: tutorEarnings,
      platformFee: platformFee
    });

    const tutorId = booking.data().tutorId;
    const tutorRef = db.collection('tutors').doc(tutorId);
    const tutor = await tutorRef.get();

    if (tutor.exists) {
      const tutorData = tutor.data();
      await tutorRef.update({
        totalEarnings: (tutorData.totalEarnings || 0) + tutorEarnings,
        totalPlatformFee: (tutorData.totalPlatformFee || 0) + platformFee,
        sessions: (tutorData.sessions || 0) + 1,
        earnings: [
          ...(tutorData.earnings || []),
          {
            date: new Date().toISOString().split('T')[0],
            amount: tutorEarnings,
            bookingId: bookingId
          }
        ]
      });
    }

    logger.info('Booking completed', { bookingId, tutorId, amount, tutorEarnings });
    return booking.data();
  } catch (error) {
    logger.error('Error completing booking:', error);
    throw error;
  }
}

export async function cancelBooking(bookingId) {
  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    await bookingRef.update({
      status: 'cancelled',
      cancelledAt: new Date()
    });

    logger.info('Booking cancelled', { bookingId });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    throw error;
  }
}

export async function getTutorBookings(tutorId) {
  try {
    const snapshot = await db.collection('bookings')
      .where('tutorId', '==', tutorId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting tutor bookings:', error);
    throw error;
  }
}

export async function getStudentBookings(studentId) {
  try {
    const snapshot = await db.collection('bookings')
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting student bookings:', error);
    throw error;
  }
}

export async function getAllBookings() {
  try {
    const snapshot = await db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting all bookings:', error);
    throw error;
  }
}
