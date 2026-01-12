import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";
import { Role } from "../types";

export const adminsService = {
  async fetchAll() {
    return await request(ENDPOINTS.admins, { method: "GET" });
  },

  async invite(payload: { name: string; email: string; role: Role }) {
    return await request(`${ENDPOINTS.admins}/invite`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async remove(adminId: string) {
    return await request(`${ENDPOINTS.admins}/${adminId}`, { method: "DELETE" });
  },

  async activate(payload: { email: string; token: string; password: string }) {
    return await request(`${ENDPOINTS.admins}/activate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
