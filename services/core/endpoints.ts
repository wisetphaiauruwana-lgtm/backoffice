export const API_ORIGIN =
  process.env.REACT_APP_API_ORIGIN || "http://localhost:8080";

export const API_BASE = `${API_ORIGIN}/api`;

export const ENDPOINTS = {
  rooms: `${API_BASE}/rooms`,
  bookings: `${API_BASE}/bookings`,

  guests: `${API_BASE}/guests`,
  guestsAll: `${API_BASE}/guests/all`,

  customers: `${API_BASE}/customers`,
  consentLogs: `${API_BASE}/consent-logs`,
  checkin: {
    base: `${API_BASE}/checkin`,
    initiate: `${API_BASE}/checkin/initiate`,
    verify: `${API_BASE}/checkin/verify`,
    validate: `${API_BASE}/checkin/validate`,
    resend: `${API_BASE}/checkin/resend`,
  },
};
