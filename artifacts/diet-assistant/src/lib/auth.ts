// Authentication utilities
export const getAuthToken = () => localStorage.getItem("diet_token");
export const setAuthToken = (token: string) => localStorage.setItem("diet_token", token);
export const clearAuthToken = () => localStorage.removeItem("diet_token");

export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
