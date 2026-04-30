export const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, data);
  },

  error: (message, error = {}) => {
    console.error(`[ERROR] ${message}`, error);
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, data);
    }
  }
};
