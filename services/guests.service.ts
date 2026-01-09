// src/services/guests.service.ts
import request from "../services/core/request";
import { ENDPOINTS } from "../services/core/endpoints";
import type { Guest } from "../types";

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.guests)) return data.guests;
  if (Array.isArray(data?.payload)) return data.payload;
  return [];
};

export const guestsService = {
  // -------------------------
  // ✅ GET All Guests (ADMIN)
  // -------------------------
  fetchAll: async (): Promise<Guest[]> => {
    const allUrl = (ENDPOINTS as any).guestsAll ?? `${ENDPOINTS.guests}/all`;

    try {
      const data = await request(allUrl, { method: "GET" });
      return unwrapList(data) as Guest[];
    } catch (err: any) {
      // ✅ สำคัญ: โชว์ error body เพื่อรู้สาเหตุ 400 จริง ๆ
      console.error("[guestsService.fetchAll] failed", {
        status: err?.status,
        message: err?.message,
        body: err?.body,
        url: allUrl,
      });
      throw err; // ให้ component จัดการต่อ (หรือจะ return [] ก็ได้ แต่แนะนำให้ throw ตอน debug)
    }
  },

  // -------------------------
  // ✅ GET Guests by BookingId
  // -------------------------
  fetchByBookingId: async (bookingId: number | string): Promise<Guest[]> => {
    const url = `${ENDPOINTS.bookings}/${bookingId}/guests`;
    const data = await request(url, { method: "GET" });
    return unwrapList(data) as Guest[];
  },

  getById: (id: number | string) =>
    request(`${ENDPOINTS.guests}/${id}`, { method: "GET" }),

  create: (payload: Partial<Guest>) =>
    request(ENDPOINTS.guests, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number | string, payload: Partial<Guest>) =>
    request(`${ENDPOINTS.guests}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id: number | string) =>
    request(`${ENDPOINTS.guests}/${id}`, { method: "DELETE" }),
};
