export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password) {
  return password && password.length >= 6;
}

export function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function isValidTelegramHandle(handle) {
  return handle && handle.startsWith('@') && handle.length >= 5;
}

export function generateTempPassword(fullName) {
  return `${fullName.replace(/\s/g, '')}CAU`;
}

export function calculateEarnings(bookingAmount) {
  return Math.floor(bookingAmount * 0.7);
}

export function calculatePlatformFee(bookingAmount) {
  return Math.floor(bookingAmount * 0.3);
}
