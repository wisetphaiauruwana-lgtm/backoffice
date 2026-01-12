import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";

export const authService = {
  async login(payload: { username: string; password: string }) {
    return await request(`${ENDPOINTS.auth}/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async forgotPassword(payload: { email: string }) {
    return await request(`${ENDPOINTS.auth}/forgot`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
