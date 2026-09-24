const localExped = "http://127.0.0.1:8031";
const localAuth = "http://127.0.0.1:8000";

/** exped-service. En CI/producción viene de PUBLIC_API_URL (GitHub secret). */
export const API_URL = import.meta.env.PUBLIC_API_URL || localExped;

/** auth-service. En CI/producción viene de PUBLIC_AUTH_API_URL (GitHub secret). */
export const AUTH_API_URL = import.meta.env.PUBLIC_AUTH_API_URL || localAuth;
