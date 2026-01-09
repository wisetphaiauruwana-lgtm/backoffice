import request from "./core/request";
import { ENDPOINTS } from "./core/endpoints";

export const checkinService = {
  initiate: (payload: any) =>
    request(ENDPOINTS.checkin.initiate, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verify: (token: string) =>
    request(`${ENDPOINTS.checkin.verify}?token=${encodeURIComponent(token)}`, {
      method: "GET",
    }),

  validateCode: (payload: any) =>
    request(ENDPOINTS.checkin.validate, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resendCode: (payload: any) =>
    request(ENDPOINTS.checkin.resend, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
