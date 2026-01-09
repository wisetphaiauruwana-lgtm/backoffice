// src/services/apiService.ts
import { ENDPOINTS } from "./core/endpoints";
import request from "./core/request";

export class ApiError extends Error {
  status: number;
  body?: any;

  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.guests)) return data.guests;
  if (Array.isArray(data?.payload)) return data.payload;
  return [];
};

const apiService = {
  /* ========== ROOMS ========== */
  async fetchAllRooms() {
    return await request(ENDPOINTS.rooms, { method: "GET" });
  },

  async getRoomById(id: number | string) {
    return await request(`${ENDPOINTS.rooms}/${id}`, { method: "GET" });
  },

  async createRoom(payload: any) {
    return await request(ENDPOINTS.rooms, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateRoom(id: number | string, payload: any) {
    return await request(`${ENDPOINTS.rooms}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteRoom(id: number | string) {
    return await request(`${ENDPOINTS.rooms}/${id}`, { method: "DELETE" });
  },

  /* ========== GUESTS ========== */

  // ✅ สำหรับหน้า check-in / viewGuests: ต้องมี bookingId
  async fetchGuestsByBookingId(bookingId: number | string) {
    const url = `${ENDPOINTS.bookings}/${bookingId}/guests`; // /api/bookings/:id/guests
    const data = await request(url, { method: "GET" });
    return unwrapList(data);
  },

  // ✅ สำหรับหน้า Admin list: /api/guests/all
  async fetchAllGuests() {
    const allUrl = (ENDPOINTS as any).guestsAll ?? `${ENDPOINTS.guests}/all`;
    const data = await request(allUrl, { method: "GET" });
    return unwrapList(data);
  },

  async getGuestById(id: number | string) {
    return await request(`${ENDPOINTS.guests}/${id}`, { method: "GET" });
  },

  async updateGuest(id: number | string, payload: any) {
    return await request(`${ENDPOINTS.guests}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteGuest(id: number | string) {
    return await request(`${ENDPOINTS.guests}/${id}`, { method: "DELETE" });
  },

  /* ========== BOOKINGS (optionally) ========== */
  async fetchAllBookings() {
    return await request(ENDPOINTS.bookings, { method: "GET" });
  },
};

export default apiService;
