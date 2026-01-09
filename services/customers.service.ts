// src/services/customers.service.ts
import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";
import { Customer } from "../types";

export const customersService = {

  // 👉 Create Customer
  create: async (payload: Partial<Customer>): Promise<Customer> => {
    return await request(ENDPOINTS.customers, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // 👉 Get all customers (optional)
  fetchAll: async (): Promise<Customer[]> => {
    const data = await request(ENDPOINTS.customers, { method: "GET" });
    if (Array.isArray(data)) return data;
    return data?.data || data?.customers || [];
  },

  // 👉 Get customer by ID
  getById: async (id: number | string): Promise<Customer> => {
    return await request(`${ENDPOINTS.customers}/${id}`, { method: "GET" });
  },

  // 👉 Update customer
  update: async (
    id: number | string,
    payload: Partial<Customer>
  ): Promise<Customer> => {
    return await request(`${ENDPOINTS.customers}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // 👉 Delete customer
  delete: async (id: number | string): Promise<void> => {
    await request(`${ENDPOINTS.customers}/${id}`, {
      method: "DELETE",
    });
  },
};

export default customersService;
