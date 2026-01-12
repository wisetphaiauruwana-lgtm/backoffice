const env = (import.meta as any)?.env || {};
const defaultOrigin = "https://hotel-backend-production-5d4b.up.railway.app";
const rawOrigin =
  env.VITE_API_ORIGIN || env.VITE_API_BASE || env.VITE_API_URL || defaultOrigin;

export const API_ORIGIN = String(rawOrigin).replace(/\/+$/, "");

export const API_BASE = `${API_ORIGIN}/api`;

export const ENDPOINTS = {
  rooms: `${API_BASE}/rooms`,
  bookings: `${API_BASE}/bookings`,

  guests: `${API_BASE}/guests`,
  guestsAll: `${API_BASE}/guests/all`,

  customers: `${API_BASE}/customers`,
  admins: `${API_BASE}/admins`,
  roles: `${API_BASE}/roles`,
  settings: `${API_BASE}/settings`,
  auth: `${API_BASE}/auth`,
  consentLogs: `${API_BASE}/consent-logs`,
  checkin: {
    base: `${API_BASE}/checkin`,
    initiate: `${API_BASE}/checkin/initiate`,
    verify: `${API_BASE}/checkin/verify`,
    validate: `${API_BASE}/checkin/validate`,
    resend: `${API_BASE}/checkin/resend`,
  },
};
