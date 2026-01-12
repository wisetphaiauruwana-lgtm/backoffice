import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";

export const settingsService = {
  async getHotel() {
    return await request(`${ENDPOINTS.settings}/hotel`, { method: "GET" });
  },

  async updateHotel(payload: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo?: string;
  }) {
    return await request(`${ENDPOINTS.settings}/hotel`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
