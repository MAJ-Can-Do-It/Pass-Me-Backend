# Pass Me Backend API

Production-ready Node.js/Express backend for the Pass Me tutoring marketplace platform with Firebase Firestore, JWT authentication, Gmail email notifications, and Telegram integration.

## Quick Start

### Prerequisites
- Node.js 20+
- Firebase Firestore project (passme-1df1e)
- Gmail account with OAuth2 credentials
- Telegram Bot token (optional)

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env` and add your credentials
2. Get Firebase Service Account Key from Google Cloud Console
3. Set up Gmail OAuth2 (Client ID, Secret, Refresh Token)
4. Create a Telegram Bot token (optional)

### Running

```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

Server runs on `http://localhost:3000`

## API Endpoints

### Auth Routes
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/student/register` - Student registration
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/tutor/login` - Tutor login
- `POST /api/auth/student/reset-password` - Reset student password
- `POST /api/auth/tutor/reset-password` - Reset tutor password
- `POST /api/auth/reset-password-confirm` - Confirm password reset

### Tutor Routes
- `GET /api/tutors` - Get all tutors
- `GET /api/tutors/:id` - Get single tutor
- `POST /api/tutors/register` - Register as tutor (form submission)
- `GET /api/tutors/me` - Get my tutor profile (auth required)
- `PUT /api/tutors/me` - Update tutor profile
- `GET /api/tutors/me/bookings` - Get my bookings
- `GET /api/tutors/me/earnings` - Get earnings dashboard

### Student Routes
- `GET /api/students/me` - Get student profile (auth required)
- `PUT /api/students/me` - Update student profile
- `POST /api/students/me/favorites/:tutorId` - Toggle favorite tutor
- `GET /api/students/me/favorites` - Get favorite tutors
- `GET /api/students/me/bookings` - Get my bookings

### Booking Routes
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Reschedule booking
- `DELETE /api/bookings/:id` - Cancel booking
- `POST /api/bookings/:id/complete` - Mark as completed

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/tutors/pending` - Pending applications
- `POST /api/admin/tutors/:id/approve` - Approve tutor
- `POST /api/admin/tutors/:id/reject` - Reject tutor
- `GET /api/admin/bookings` - All bookings
- `GET /api/admin/revenue` - Revenue analytics
- `GET /api/admin/users` - All users
- `POST /api/admin/users/:id/block` - Block user

### Review Routes
- `POST /api/reviews` - Post review
- `GET /api/reviews/booking/:bookingId` - Get reviews for booking

### Telegram Routes
- `POST /api/telegram/webhook` - Telegram webhook
- `GET /api/telegram/status` - Health check

## Database Collections

- `admins` - Admin accounts
- `tutors` - Approved tutors
- `students` - Student accounts
- `bookings` - Lesson bookings
- `reviews` - Booking reviews
- `tutor_applications` - Pending tutor registrations

## Deployment to Render

1. Push to GitHub: `MAJ-Can-Do-It/Pass-Me-Backend`
2. Create Web Service on Render
3. Connect GitHub repository
4. Set build: `npm install`
5. Set start: `node server.js`
6. Add environment variables
7. Deploy!

## Key Features

- **Multi-user authentication** (Admin, Student, Tutor)
- **JWT token-based security** (7-day expiry)
- **Password hashing** with bcryptjs
- **Email notifications** via Gmail OAuth2
- **Telegram bot integration** for booking notifications
- **Booking approval workflow** with email confirmations
- **Earnings tracking** with 70/30 revenue split
- **Google Cloud Logging** for production monitoring
- **Comprehensive error handling** and validation

## Architecture

Built with:
- Express.js for HTTP server
- Firebase Firestore for database
- JWT for authentication
- bcryptjs for password hashing
- Nodemailer for emails
- Google APIs for Gmail
- Telegram Bot API for notifications

## Support

For issues, open an issue in the GitHub repository.
