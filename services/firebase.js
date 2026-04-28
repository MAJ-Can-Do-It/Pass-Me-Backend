import { db } from '../config/firebase.js';
import { logger } from '../utils/logger.js';

export async function getAdminByEmail(email) {
  try {
    const snapshot = await db.collection('admins')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    logger.error('Error getting admin by email:', error);
    throw error;
  }
}

export async function getStudentByEmail(email) {
  try {
    const snapshot = await db.collection('students')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    logger.error('Error getting student by email:', error);
    throw error;
  }
}

export async function getTutorByEmail(email) {
  try {
    const snapshot = await db.collection('tutors')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    logger.error('Error getting tutor by email:', error);
    throw error;
  }
}

export async function getAllTutors(filters = {}) {
  try {
    let query = db.collection('tutors').where('approved', '==', true);

    if (filters.school) {
      query = query.where('school', '==', filters.school);
    }

    if (filters.subject) {
      query = query.where('subjects', 'array-contains', filters.subject);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting tutors:', error);
    throw error;
  }
}

export async function getTutorById(id) {
  try {
    const doc = await db.collection('tutors').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting tutor by ID:', error);
    throw error;
  }
}

export async function getStudentById(id) {
  try {
    const doc = await db.collection('students').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting student by ID:', error);
    throw error;
  }
}

export async function createStudent(email, data) {
  try {
    const studentRef = await db.collection('students').add({
      email: email.toLowerCase(),
      ...data,
      createdAt: new Date(),
      lastLogin: null,
      accountStatus: 'active',
      favorites: []
    });
    return studentRef.id;
  } catch (error) {
    logger.error('Error creating student:', error);
    throw error;
  }
}

export async function updateStudent(id, data) {
  try {
    await db.collection('students').doc(id).update({
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error updating student:', error);
    throw error;
  }
}

export async function getBookingById(id) {
  try {
    const doc = await db.collection('bookings').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    logger.error('Error getting booking:', error);
    throw error;
  }
}

export async function createBooking(data) {
  try {
    const bookingRef = await db.collection('bookings').add({
      ...data,
      status: 'pending',
      createdAt: new Date(),
      approvedAt: null,
      completedAt: null
    });
    return bookingRef.id;
  } catch (error) {
    logger.error('Error creating booking:', error);
    throw error;
  }
}

export async function getTutorApplications() {
  try {
    const snapshot = await db.collection('tutor_applications')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.error('Error getting tutor applications:', error);
    throw error;
  }
}

export async function createTutorApplication(data) {
  try {
    const appRef = await db.collection('tutor_applications').add({
      ...data,
      status: 'pending',
      createdAt: new Date()
    });
    return appRef.id;
  } catch (error) {
    logger.error('Error creating tutor application:', error);
    throw error;
  }
}

export async function approveTutorApplication(appId, tutorData) {
  try {
    const app = await db.collection('tutor_applications').doc(appId).get();
    if (!app.exists) throw new Error('Application not found');

    const appData = app.data();

    const tutorRef = await db.collection('tutors').add({
      ...appData,
      ...tutorData,
      approved: true,
      approvedAt: new Date(),
      accountStatus: 'active',
      sessions: 0,
      rating: 0,
      totalEarnings: 0,
      totalPlatformFee: 0,
      earnings: []
    });

    await db.collection('tutor_applications').doc(appId).update({
      status: 'approved',
      approvedAt: new Date()
    });

    return tutorRef.id;
  } catch (error) {
    logger.error('Error approving tutor application:', error);
    throw error;
  }
}

export async function rejectTutorApplication(appId) {
  try {
    await db.collection('tutor_applications').doc(appId).delete();
  } catch (error) {
    logger.error('Error rejecting tutor application:', error);
    throw error;
  }
}
