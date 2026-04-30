import nodemailer from 'nodemailer';

export async function createEmailTransport() {
  const useOutlook = process.env.EMAIL_SERVICE === 'outlook';

  if (useOutlook) {
    return nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
}

export default { createEmailTransport };
