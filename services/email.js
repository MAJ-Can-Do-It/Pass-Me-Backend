import { createEmailTransport } from '../config/gmail.js';
import { logger } from '../utils/logger.js';

export async function sendTutorApprovalEmail(tutorEmail, tutorName, tempPassword, resetToken) {
  try {
    const transporter = await createEmailTransport();

    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <h2>Welcome to Pass Me, ${tutorName}!</h2>
      <p>Your tutor application has been approved! 🎉</p>

      <h3>Your Login Credentials:</h3>
      <ul>
        <li><strong>Email:</strong> ${tutorEmail}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      </ul>

      <p><strong>Important:</strong> Please reset your password on your first login.</p>

      <p>
        <a href="${resetLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>

      <p>You can now:</p>
      <ul>
        <li>View your tutor profile on the Pass Me platform</li>
        <li>Manage your availability and pricing</li>
        <li>Accept and manage booking requests</li>
        <li>Track your earnings</li>
      </ul>

      <p>Welcome to the Pass Me community!</p>
    `;

    const result = await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL,
      to: tutorEmail,
      subject: 'Welcome to Pass Me - Your Account is Approved!',
      html: htmlContent
    });

    logger.info('Tutor approval email sent', { tutorEmail, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('Error sending tutor approval email:', error);
    throw error;
  }
}

export async function sendBookingConfirmationEmail(email, studentName, bookingDetails) {
  try {
    const transporter = await createEmailTransport();

    const htmlContent = `
      <h2>Booking Confirmation, ${studentName}!</h2>
      <p>Your lesson booking has been confirmed.</p>

      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Tutor:</strong> ${bookingDetails.tutorName}</li>
        <li><strong>Subject:</strong> ${bookingDetails.subject}</li>
        <li><strong>Date:</strong> ${bookingDetails.date}</li>
        <li><strong>Time:</strong> ${bookingDetails.time}</li>
        <li><strong>Duration:</strong> ${bookingDetails.duration} minutes</li>
        <li><strong>Type:</strong> ${bookingDetails.type}</li>
      </ul>

      <p>Your tutor will contact you shortly with further details.</p>
    `;

    const result = await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL,
      to: email,
      subject: 'Booking Confirmed - Your Lesson is Scheduled',
      html: htmlContent
    });

    logger.info('Booking confirmation email sent', { email, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('Error sending booking confirmation email:', error);
    throw error;
  }
}

export async function sendBookingNotificationToTutor(email, tutorName, bookingDetails) {
  try {
    const transporter = await createEmailTransport();

    const htmlContent = `
      <h2>New Booking Request, ${tutorName}!</h2>
      <p>You have a new booking request on Pass Me.</p>

      <h3>Student Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${bookingDetails.studentName}</li>
        <li><strong>Email:</strong> ${bookingDetails.studentEmail}</li>
      </ul>

      <h3>Lesson Details:</h3>
      <ul>
        <li><strong>Subject:</strong> ${bookingDetails.subject}</li>
        <li><strong>Date:</strong> ${bookingDetails.date}</li>
        <li><strong>Time:</strong> ${bookingDetails.time}</li>
        <li><strong>Duration:</strong> ${bookingDetails.duration} minutes</li>
        <li><strong>Type:</strong> ${bookingDetails.type}</li>
        <li><strong>Student Notes:</strong> ${bookingDetails.studentNotes || 'N/A'}</li>
      </ul>

      <p>Log in to your Pass Me account to accept or decline this booking.</p>
    `;

    const result = await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL,
      to: email,
      subject: 'New Booking Request - Action Required',
      html: htmlContent
    });

    logger.info('Booking notification sent to tutor', { email, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('Error sending booking notification to tutor:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email, resetToken) {
  try {
    const transporter = await createEmailTransport();

    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below to proceed:</p>

      <p>
        <a href="${resetLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </p>

      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const result = await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request',
      html: htmlContent
    });

    logger.info('Password reset email sent', { email, messageId: result.messageId });
    return result;
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw error;
  }
}
