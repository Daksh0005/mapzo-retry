const API_BASE = "https://backend-jwqn.onrender.com";

export function authFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    }
  });
}
