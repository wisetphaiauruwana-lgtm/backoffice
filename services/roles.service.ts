import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";

export const rolesService = {
  async fetchAll() {
    return await request(ENDPOINTS.roles, { method: "GET" });
  },

  async updatePermissions(roleId: string | number, permissions: string[]) {
    return await request(`${ENDPOINTS.roles}/${roleId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    });
  },
};
