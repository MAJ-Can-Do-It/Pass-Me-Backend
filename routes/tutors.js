import express from 'express';
import {
  getAllTutors,
  getTutorById,
  createTutorApplication,
  getTutorByEmail
} from '../services/firebase.js';
import { getTutorBookings } from '../services/bookingService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyTutor } from '../middleware/auth.js';
import { tutorRegisterValidation, validate } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { school, subject } = req.query;
  const filters = {};

  if (school) filters.school = school;
  if (subject) filters.subject = subject;

  const tutors = await getAllTutors(filters);

  res.json({
    count: tutors.length,
    tutors: tutors.map(t => ({
      id: t.id,
      fullName: t.fullName,
      school: t.school,
      program: t.program,
      subjects: t.subjects,
      individual: t.individual,
      group: t.group,
      bio: t.bio,
      experience: t.experience,
      rating: t.rating || 0,
      sessions: t.sessions || 0,
      availability: t.availability,
      telegram: t.telegram
    }))
  });
}));

router.get('/me', verifyTutor, asyncHandler(async (req, res) => {
  const tutor = await getTutorById(req.user.id);

  if (!tutor) {
    return res.status(404).json({ error: 'Tutor profile not found' });
  }

  res.json({
    id: tutor.id,
    email: tutor.email,
    fullName: tutor.fullName,
    school: tutor.school,
    program: tutor.program,
    year: tutor.year,
    subjects: tutor.subjects,
    individual: tutor.individual,
    group: tutor.group,
    bio: tutor.bio,
    experience: tutor.experience,
    telegram: tutor.telegram,
    phone: tutor.phone,
    availability: tutor.availability,
    rating: tutor.rating || 0,
    sessions: tutor.sessions || 0,
    totalEarnings: tutor.totalEarnings || 0,
    totalPlatformFee: tutor.totalPlatformFee || 0,
    accountStatus: tutor.accountStatus
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const tutor = await getTutorById(req.params.id);

  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  if (!tutor.approved) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  res.json({
    id: tutor.id,
    fullName: tutor.fullName,
    school: tutor.school,
    program: tutor.program,
    year: tutor.year,
    subjects: tutor.subjects,
    individual: tutor.individual,
    group: tutor.group,
    bio: tutor.bio,
    experience: tutor.experience,
    rating: tutor.rating || 0,
    sessions: tutor.sessions || 0,
    availability: tutor.availability,
    telegram: tutor.telegram,
    phone: tutor.phone
  });
}));

router.post('/register', tutorRegisterValidation, validate, asyncHandler(async (req, res) => {
  const { email } = req.body;

  const existingTutor = await getTutorByEmail(email);
  if (existingTutor) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const applicationId = await createTutorApplication(req.body);

  logger.info('Tutor application submitted', { email, applicationId });
  res.status(201).json({
    message: 'Application submitted successfully',
    applicationId
  });
}));

router.put('/me', verifyTutor, asyncHandler(async (req, res) => {
  const { subjects, bio, experience, telegram, phone, availability, individual, group } = req.body;

  const updateData = {};
  if (subjects) updateData.subjects = subjects;
  if (bio) updateData.bio = bio;
  if (experience) updateData.experience = experience;
  if (telegram) updateData.telegram = telegram;
  if (phone) updateData.phone = phone;
  if (availability) updateData.availability = availability;
  if (individual) updateData.individual = individual;
  if (group) updateData.group = group;

  await db.collection('tutors').doc(req.user.id).update(updateData);

  logger.info('Tutor profile updated', { tutorId: req.user.id });
  res.json({ message: 'Profile updated successfully' });
}));

router.get('/me/bookings', verifyTutor, asyncHandler(async (req, res) => {
  const bookings = await getTutorBookings(req.user.id);

  res.json({
    count: bookings.length,
    bookings
  });
}));

router.get('/me/earnings', verifyTutor, asyncHandler(async (req, res) => {
  const tutor = await getTutorById(req.user.id);

  if (!tutor) {
    return res.status(404).json({ error: 'Tutor not found' });
  }

  res.json({
    totalEarnings: tutor.totalEarnings || 0,
    totalPlatformFee: tutor.totalPlatformFee || 0,
    sessions: tutor.sessions || 0,
    earnings: tutor.earnings || []
  });
}));

export default router;
