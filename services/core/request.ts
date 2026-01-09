export interface ApiError extends Error {
  status?: number;
  body?: any;
}

const request = async (input: RequestInfo, init?: RequestInit) => {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const body = init?.body;
  const isForm = body instanceof FormData;
  const isBlob = body instanceof Blob;
  const isParams = body instanceof URLSearchParams;

  if (body && !headers.has("Content-Type") && !isForm && !isBlob && !isParams) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers });

  let text = "";
  try { text = await res.clone().text(); } catch {}

  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; }
  catch { parsed = text || null; }

  if (!res.ok) {
    const err: ApiError = new Error();
    err.name = "ApiError";
    err.status = res.status;
    err.body = parsed;
    err.message = `[${res.status}] ${parsed?.message || res.statusText}`;
    throw err;
  }

  return parsed;
};

export default request;
