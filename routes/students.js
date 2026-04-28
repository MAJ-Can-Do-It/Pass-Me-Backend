import express from 'express';
import { getStudentById, updateStudent } from '../services/firebase.js';
import { getStudentBookings } from '../services/bookingService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyStudent } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.get('/me', verifyStudent, asyncHandler(async (req, res) => {
  const student = await getStudentById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student profile not found' });
  res.json({
    id: student.id,
    email: student.email,
    fullName: student.fullName,
    school: student.school,
    program: student.program,
    year: student.year,
    subjects: student.subjects,
    favorites: student.favorites || [],
    accountStatus: student.accountStatus
  });
}));

router.put('/me', verifyStudent, asyncHandler(async (req, res) => {
  const { fullName, school, program, year, subjects } = req.body;
  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (school) updateData.school = school;
  if (program) updateData.program = program;
  if (year) updateData.year = parseInt(year);
  if (subjects) updateData.subjects = subjects;
  await updateStudent(req.user.id, updateData);
  logger.info('Student profile updated', { studentId: req.user.id });
  res.json({ message: 'Profile updated successfully' });
}));

router.post('/me/favorites/:tutorId', verifyStudent, asyncHandler(async (req, res) => {
  const { tutorId } = req.params;
  const student = await getStudentById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const favorites = student.favorites || [];
  const index = favorites.indexOf(tutorId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(tutorId);
  }
  await updateStudent(req.user.id, { favorites });
  logger.info('Favorite tutor toggled', { studentId: req.user.id, tutorId });
  res.json({ message: 'Favorite updated', favorites });
}));

router.get('/me/favorites', verifyStudent, asyncHandler(async (req, res) => {
  const student = await getStudentById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json({ favorites: student.favorites || [] });
}));

router.get('/me/bookings', verifyStudent, asyncHandler(async (req, res) => {
  const bookings = await getStudentBookings(req.user.id);
  res.json({ count: bookings.length, bookings });
}));

export default router;
