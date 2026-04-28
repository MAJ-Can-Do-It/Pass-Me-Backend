import { Logging } from '@google-cloud/logging';

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const logging = projectId ? new Logging({ projectId }) : null;
const cloudLog = logging?.log('pass-me-backend');

export const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${message}`, data);
    if (cloudLog) {
      cloudLog.info(cloudLog.entry({ severity: 'INFO' }, message));
    }
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, data);
    if (cloudLog) {
      cloudLog.warning(cloudLog.entry({ severity: 'WARNING' }, message));
    }
  },

  error: (message, error = {}) => {
    console.error(`[ERROR] ${message}`, error);
    if (cloudLog) {
      cloudLog.error(cloudLog.entry({ severity: 'ERROR' }, message));
    }
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, data);
    }
  }
};
