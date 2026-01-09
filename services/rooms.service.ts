import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";
import { Room } from "../types";

export const roomsService = {
  fetchAll: async (): Promise<Room[]> => {
    const data = await request(ENDPOINTS.rooms, { method: "GET" });
    return Array.isArray(data) ? data : data?.data || [];
  },

  getById: (id: number | string) =>
    request(`${ENDPOINTS.rooms}/${id}`, { method: "GET" }),

  create: (payload: Room) =>
    request(ENDPOINTS.rooms, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: number | string, payload: Partial<Room>) =>
    request(`${ENDPOINTS.rooms}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id: number | string) =>
    request(`${ENDPOINTS.rooms}/${id}`, { method: "DELETE" }),
};
