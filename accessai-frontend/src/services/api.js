import axios from "axios";
import { auth } from "./firebase";


const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// Attach Firebase ID token or demo token to every request automatically
API.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Check stored demo auth
      const stored = localStorage.getItem("accessai_demo_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user?.uid) {
          config.headers.Authorization = `Bearer demo-token-${parsed.user.uid}`;
        }
      }
    }
  } catch (err) {
    console.warn("Could not attach auth header:", err);
  }
  return config;
});

// Global error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("API 401 Unauthorized encountered:", error.config?.url);
      const isDemo = localStorage.getItem("accessai_demo_auth");
      const currentPath = window.location.pathname;
      const isDashboard = currentPath.startsWith("/deaf") || currentPath.startsWith("/blind") || currentPath.startsWith("/motor");
      // Never forcefully reload and kick user to landing page if in dashboard or demo mode
      if (!isDemo && !isDashboard && currentPath !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default API;