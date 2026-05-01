// Authentication utilities — Clerk handles auth via session cookies automatically.
// Legacy JWT helpers kept for backward compatibility.
export const getAuthToken = () => localStorage.getItem("diet_token");
export const setAuthToken = (token: string) => localStorage.setItem("diet_token", token);
export const clearAuthToken = () => localStorage.removeItem("diet_token");

// Clerk uses cookie-based sessions — no Authorization header needed for same-origin requests.
// Falls back to JWT Bearer token if a legacy token is present.
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
