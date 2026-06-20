import axios from "axios";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API = axios.create({
  baseURL: isLocalhost
    ? "http://localhost:5000/api"
    : "https://mvault-hng8.onrender.com/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("mvault_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
