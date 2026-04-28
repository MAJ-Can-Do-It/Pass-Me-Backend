import { body, validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

export const loginValidation = [
  body('email').isEmail().trim().toLowerCase(),
  body('password').isLength({ min: 6 })
];

export const studentRegisterValidation = [
  body('email').isEmail().trim().toLowerCase(),
  body('fullName').notEmpty().trim(),
  body('school').notEmpty().trim(),
  body('program').notEmpty().trim(),
  body('year').isInt({ min: 1, max: 6 }),
  body('subjects').isArray()
];

export const tutorRegisterValidation = [
  body('email').isEmail().trim().toLowerCase(),
  body('fullName').notEmpty().trim(),
  body('school').notEmpty().trim(),
  body('program').notEmpty().trim(),
  body('year').isInt({ min: 1, max: 6 }),
  body('subjects').isArray(),
  body('individual').isInt({ min: 1000 }),
  body('group').isInt({ min: 1000 }),
  body('bio').notEmpty().trim(),
  body('experience').notEmpty().trim(),
  body('telegram').notEmpty().trim(),
  body('phone').notEmpty().trim(),
  body('availability').isArray()
];

export const bookingValidation = [
  body('studentId').notEmpty(),
  body('tutorId').notEmpty(),
  body('date').isISO8601(),
  body('time').matches(/^\d{2}:\d{2}$/),
  body('duration').isInt({ min: 30, max: 240 }),
  body('subject').notEmpty().trim(),
  body('type').isIn(['individual', 'group']),
  body('studentNotes').optional().trim()
];

export const reviewValidation = [
  body('bookingId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').notEmpty().trim()
];
