import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";
import { Booking } from "../types";

export const bookingsService = {
  fetchAll: async (): Promise<Booking[]> => {
    const data = await request(ENDPOINTS.bookings, { method: "GET" });
    return Array.isArray(data) ? data : data?.data || [];
  },

  // ✅ เพิ่มตรงนี้
  getById: async (id: number | string): Promise<Booking> => {
    const data = await request(`${ENDPOINTS.bookings}/${id}`, { method: "GET" });
    return data?.data ?? data;
  },

  create: (payload: any) =>
    request(ENDPOINTS.bookings, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  remove: (id: number | string) =>
    request(`${ENDPOINTS.bookings}/${id}`, {
      method: "DELETE",
    }),
};
