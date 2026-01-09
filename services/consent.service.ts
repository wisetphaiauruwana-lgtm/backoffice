import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";

export const consentService = {
  log: (payload: any) =>
    request(ENDPOINTS.consentLogs, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
