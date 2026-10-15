import axios from "axios";
import { decryptEnvelope, encryptRequest, initCrypto } from "./furnaceCrypto.js";

const BASE_URL = import.meta.env.VITE_API_URL || "https://abhiftm.com/api";
const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

let cryptoReady;
function ensureCrypto() {
  cryptoReady ||= initCrypto(
    import.meta.env.VITE_TRANSIT_KEY,
    import.meta.env.VITE_TRANSIT_OUT_KEY || import.meta.env.VITE_TRANSIT_KEY,
  );
  return cryptoReady;
}

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = (config.method || "get").toLowerCase();
  if (method !== "get" && config.data !== undefined && config.data !== null) {
    await ensureCrypto();
    config.data = await encryptRequest(config.data);
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

async function decryptAxiosResponse(response) {
  if (response.config.responseType === "blob" || response.config.responseType === "arraybuffer") return response;
  await ensureCrypto();
  response.data = await decryptEnvelope(response.data);
  return response;
}

api.interceptors.response.use(decryptAxiosResponse, async (error) => {
  if (error.response) {
    try {
      await decryptAxiosResponse(error.response);
    } catch (decryptError) {
      error.decryptError = decryptError;
      error.message = decryptError.message;
      error.response.data = undefined;
    }
    if (error.response.status === 401) {
      localStorage.clear();
      window.location.href = "/";
    }
  }
  return Promise.reject(error);
});

export default api;
